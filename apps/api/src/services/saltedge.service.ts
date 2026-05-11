import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { env } from '../config/env';
import { SyncStatus, TransactionType, AccountType, ConnectorType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { applyCategorizationRules } from './categorization.service';

const SE_API = 'https://www.saltedge.com/api/v5';

// state → { userId, customerId }, kept for 1 hour
const pendingConnects = new Map<string, { userId: string; customerId: string }>();

export function isConfigured(): boolean {
  return !!(env.SALTEDGE_APP_ID && env.SALTEDGE_SECRET);
}

async function seRequest<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  if (!env.SALTEDGE_APP_ID || !env.SALTEDGE_SECRET) {
    throw new AppError('Salt Edge not configured', 503);
  }
  const res = await fetch(`${SE_API}${path}`, {
    method,
    headers: {
      'App-id': env.SALTEDGE_APP_ID,
      'Secret': env.SALTEDGE_SECRET,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new AppError(`Salt Edge error (${res.status}): ${text}`, 502);
  }
  return res.json() as Promise<T>;
}

async function getOrCreateCustomer(userId: string): Promise<string> {
  const existing = await prisma.bankConnection.findFirst({
    where: { userId, connectorType: ConnectorType.SALTEDGE, isActive: true },
    select: { pinEncrypted: true, pinIv: true },
  });

  if (existing?.pinEncrypted && existing.pinIv) {
    try {
      const [cipher, tag] = existing.pinEncrypted.split(':');
      return decrypt(cipher, existing.pinIv, tag);
    } catch { /* fall through */ }
  }

  const res = await seRequest<{ data: { id: string } }>('POST', '/customers', {
    data: { identifier: userId },
  });
  return res.data.id;
}

export async function createConnectSession(userId: string): Promise<{ url: string }> {
  const customerId = await getOrCreateCustomer(userId);

  const state = uuidv4();
  const redirectUri = `${env.API_BASE_URL}/api/v1/banks/saltedge/callback`;
  const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const res = await seRequest<{ data: { connect_url: string } }>('POST', '/connect_sessions/create', {
    data: {
      customer_id: customerId,
      consent: {
        scopes: ['account_details', 'transactions_details'],
        from_date: fromDate,
      },
      attempt: {
        return_to: `${redirectUri}?state=${state}`,
      },
    },
  });

  pendingConnects.set(state, { userId, customerId });
  setTimeout(() => pendingConnects.delete(state), 60 * 60 * 1000);

  return { url: res.data.connect_url };
}

export async function handleCallback(connectionId: string, state: string): Promise<string> {
  const session = pendingConnects.get(state);
  if (!session) throw new AppError('Connect session not found or expired. Please try connecting again.', 404);
  pendingConnects.delete(state);
  const { userId, customerId } = session;

  const connRes = await seRequest<{
    data: { id: string; provider_code: string; provider_name: string };
  }>('GET', `/connections/${connectionId}`);
  const seConn = connRes.data;

  const accountsRes = await seRequest<{
    data: Array<{
      id: string;
      name: string;
      nature: string;
      balance: number;
      currency_code: string;
      extra: { iban?: string; swift_code?: string; account_name?: string } | null;
    }>;
  }>('GET', `/accounts?connection_id=${connectionId}`);

  const connIdEnc = encrypt(connectionId);
  const custIdEnc = encrypt(customerId);

  const connection = await prisma.bankConnection.create({
    data: {
      userId,
      connectorType: ConnectorType.SALTEDGE,
      bankCode: seConn.provider_code ?? connectionId.slice(0, 20),
      bankName: seConn.provider_name ?? 'Salt Edge Bank',
      fintsUrl: SE_API,
      loginNameEncrypted: `${connIdEnc.ciphertext}:${connIdEnc.iv}:${connIdEnc.tag}`,
      pinEncrypted: `${custIdEnc.ciphertext}:${custIdEnc.tag}`,
      pinIv: custIdEnc.iv,
      syncStatus: SyncStatus.SYNCING,
      lastSyncAt: new Date(),
    },
  });

  for (const acct of accountsRes.data) {
    const acctIdEnc = encrypt(acct.id.toString());
    const iban = acct.extra?.iban ?? '';

    await prisma.bankAccount.create({
      data: {
        userId,
        bankConnectionId: connection.id,
        iban: `${acctIdEnc.ciphertext}:${acctIdEnc.iv}:${acctIdEnc.tag}`,
        ibanMasked: iban ? `${iban.slice(0, 4)}****${iban.slice(-4)}` : acct.name,
        bic: acct.extra?.swift_code ?? '',
        accountType: mapNatureToAccountType(acct.nature),
        accountName: acct.name,
        ownerName: acct.extra?.account_name ?? '',
        currency: acct.currency_code,
        balanceCents: BigInt(Math.round((acct.balance ?? 0) * 100)),
        balanceDate: new Date(),
      },
    });
  }

  syncTransactions(connection.id).catch(console.error);
  return connection.id;
}

function mapNatureToAccountType(nature: string): AccountType {
  if (nature === 'savings') return AccountType.SAVINGS;
  if (nature === 'card' || nature === 'credit') return AccountType.CREDIT_CARD;
  if (nature === 'mortgage' || nature === 'loan') return AccountType.LOAN;
  if (nature === 'investment' || nature === 'bonus') return AccountType.DEPOT;
  return AccountType.CHECKING;
}

export async function syncTransactions(bankConnectionId: string): Promise<void> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: bankConnectionId },
    include: { accounts: true },
  });
  if (!connection) throw new NotFoundError('BankConnection');

  await prisma.bankConnection.update({
    where: { id: bankConnectionId },
    data: { syncStatus: SyncStatus.SYNCING },
  });
  const log = await prisma.syncLog.create({
    data: { bankConnectionId, status: SyncStatus.SYNCING },
  });

  try {
    const [connCipher, connIv, connTag] = connection.loginNameEncrypted.split(':');
    const seConnectionId = decrypt(connCipher, connIv, connTag);

    const fromDate = connection.lastSyncAt
      ? new Date(connection.lastSyncAt.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let totalFetched = 0;
    let totalNew = 0;
    const newTxIds: string[] = [];

    for (const account of connection.accounts) {
      const [acctCipher, acctIv, acctTag] = account.iban.split(':');
      const seAccountId = decrypt(acctCipher, acctIv, acctTag);

      try {
        const balRes = await seRequest<{ data: { balance: number } }>('GET', `/accounts/${seAccountId}`);
        if (balRes.data?.balance != null) {
          await prisma.bankAccount.update({
            where: { id: account.id },
            data: {
              balanceCents: BigInt(Math.round(balRes.data.balance * 100)),
              balanceDate: new Date(),
            },
          });
        }
      } catch { /* non-fatal */ }

      let nextId: string | undefined;
      do {
        const params = new URLSearchParams({
          connection_id: seConnectionId,
          account_id: seAccountId,
          from_date: fromDate,
        });
        if (nextId) params.set('from_id', nextId);

        const txRes = await seRequest<{
          data: Array<{
            id: string;
            made_on: string;
            amount: number;
            currency_code: string;
            description: string;
            extra: { payee?: string } | null;
          }>;
          meta: { next_id?: string };
        }>('GET', `/transactions?${params.toString()}`);

        nextId = txRes.meta?.next_id;

        for (const tx of txRes.data ?? []) {
          totalFetched++;
          const amount = tx.amount;
          const amountCents = BigInt(Math.round(Math.abs(amount) * 100));
          const type = amount >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT;
          const bookingDate = new Date(tx.made_on);

          try {
            const created = await prisma.transaction.create({
              data: {
                userId: connection.userId,
                bankAccountId: account.id,
                externalId: tx.id.toString(),
                valueDate: bookingDate,
                bookingDate,
                amountCents,
                currency: tx.currency_code,
                type,
                creditorName: tx.extra?.payee ?? undefined,
                purpose: tx.description,
              },
            });
            totalNew++;
            newTxIds.push(created.id);
          } catch { /* duplicate externalId → skip */ }
        }
      } while (nextId);
    }

    if (newTxIds.length > 0) await applyCategorizationRules(connection.userId, newTxIds);

    await prisma.bankConnection.update({
      where: { id: bankConnectionId },
      data: { syncStatus: SyncStatus.SUCCESS, lastSyncAt: new Date(), syncError: null },
    });
    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: SyncStatus.SUCCESS,
        finishedAt: new Date(),
        transactionsFetched: totalFetched,
        transactionsNew: totalNew,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.bankConnection.update({
      where: { id: bankConnectionId },
      data: { syncStatus: SyncStatus.FAILED, syncError: msg },
    });
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: SyncStatus.FAILED, finishedAt: new Date(), errorMessage: msg },
    });
    throw err;
  }
}
