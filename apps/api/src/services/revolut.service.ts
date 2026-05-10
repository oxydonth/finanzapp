import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { env } from '../config/env';
import { SyncStatus, TransactionType, AccountType, ConnectorType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { applyCategorizationRules } from './categorization.service';

// Revolut Business API (Personal API uses a simple API key)
const REVOLUT_API = 'https://b2b.revolut.com/api/1.0';

// OAuth state → userId
const pendingOAuthStates = new Map<string, { userId: string }>();

export function isConfigured(): boolean {
  return !!(env.REVOLUT_CLIENT_ID && env.REVOLUT_CLIENT_SECRET && env.REVOLUT_REDIRECT_URI);
}

export function getAuthUrl(userId: string): string {
  if (!isConfigured()) throw new AppError('Revolut integration not configured', 503);
  const state = uuidv4();
  pendingOAuthStates.set(state, { userId });
  setTimeout(() => pendingOAuthStates.delete(state), 10 * 60 * 1000);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.REVOLUT_CLIENT_ID!,
    redirect_uri: env.REVOLUT_REDIRECT_URI!,
    scope: 'READ',
    state,
  });
  return `https://business.revolut.com/app-confirm?${params}`;
}

export async function handleCallback(code: string, state: string): Promise<string> {
  const session = pendingOAuthStates.get(state);
  if (!session) throw new AppError('OAuth state invalid or expired', 400);
  pendingOAuthStates.delete(state);
  const { userId } = session;

  const tokenRes = await fetch(`${REVOLUT_API}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.REVOLUT_CLIENT_ID!,
      client_secret: env.REVOLUT_CLIENT_SECRET!,
      redirect_uri: env.REVOLUT_REDIRECT_URI!,
    }),
  });
  if (!tokenRes.ok) throw new AppError(`Revolut token exchange failed: ${await tokenRes.text()}`, 502);
  const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; token_type: string };

  // Fetch accounts
  const accountsRes = await fetch(`${REVOLUT_API}/accounts`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const accounts = await accountsRes.json() as Array<{
    id: string;
    name: string;
    currency: string;
    balance: number;
    state: string;
  }>;

  const accessEnc = encrypt(tokens.access_token);
  const refreshEnc = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

  const connection = await prisma.bankConnection.create({
    data: {
      userId,
      connectorType: ConnectorType.REVOLUT,
      bankCode: 'REVOLUT',
      bankName: 'Revolut',
      fintsUrl: REVOLUT_API,
      loginNameEncrypted: `${accessEnc.ciphertext}:${accessEnc.iv}:${accessEnc.tag}`,
      pinEncrypted: refreshEnc
        ? `${refreshEnc.ciphertext}:${refreshEnc.tag}`
        : `${accessEnc.ciphertext}:${accessEnc.tag}`,
      pinIv: refreshEnc ? refreshEnc.iv : accessEnc.iv,
      syncStatus: SyncStatus.SUCCESS,
      lastSyncAt: new Date(),
    },
  });

  for (const acc of accounts.filter((a) => a.state === 'active')) {
    const ibanLike = `REVOLUT-${acc.id}`;
    const ibanEnc = encrypt(ibanLike);
    await prisma.bankAccount.upsert({
      where: { id: `${connection.id}_${acc.id}` },
      update: { balanceCents: BigInt(Math.round(acc.balance * 100)), balanceDate: new Date() },
      create: {
        id: `${connection.id}_${acc.id}`,
        userId,
        bankConnectionId: connection.id,
        iban: `${ibanEnc.ciphertext}:${ibanEnc.iv}:${ibanEnc.tag}`,
        ibanMasked: ibanLike,
        bic: 'REVOLT21',
        accountType: AccountType.CHECKING,
        accountName: acc.name || `Revolut ${acc.currency}`,
        ownerName: 'Revolut User',
        currency: acc.currency,
        balanceCents: BigInt(Math.round(acc.balance * 100)),
        balanceDate: new Date(),
      },
    });
  }

  syncTransactions(connection.id).catch(console.error);
  return connection.id;
}

async function decryptAccessToken(conn: { loginNameEncrypted: string }): Promise<string> {
  const [c, iv, tag] = conn.loginNameEncrypted.split(':');
  return decrypt(c, iv, tag);
}

async function refreshAccessToken(conn: {
  id: string;
  pinEncrypted: string;
  pinIv: string;
}): Promise<string> {
  const [c, tag] = conn.pinEncrypted.split(':');
  const refreshToken = decrypt(c, conn.pinIv, tag);
  const res = await fetch(`${REVOLUT_API}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: env.REVOLUT_CLIENT_ID!,
      client_secret: env.REVOLUT_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new AppError('Revolut token refresh failed', 502);
  const data = await res.json() as { access_token: string };
  const enc = encrypt(data.access_token);
  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: { loginNameEncrypted: `${enc.ciphertext}:${enc.iv}:${enc.tag}` },
  });
  return data.access_token;
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
    let accessToken = await decryptAccessToken(connection);
    const from = connection.lastSyncAt
      ? new Date(connection.lastSyncAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    let totalFetched = 0;
    let totalNew = 0;
    const newTxIds: string[] = [];

    for (const account of connection.accounts) {
      const revolAccount = account.id.split('_').slice(1).join('_');
      const params = new URLSearchParams({
        account: revolAccount,
        from: from.toISOString(),
        to: new Date().toISOString(),
        count: '1000',
      });

      let res = await fetch(`${REVOLUT_API}/transactions?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401) {
        accessToken = await refreshAccessToken(connection);
        res = await fetch(`${REVOLUT_API}/transactions?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
      if (!res.ok) continue;

      const txList = await res.json() as Array<{
        id: string;
        created_at: string;
        completed_at?: string;
        state: string;
        amount: number;
        currency: string;
        description?: string;
        merchant?: { name?: string };
        counterpart?: { name?: string };
        type: string;
      }>;

      // Update account balance
      const balRes = await fetch(`${REVOLUT_API}/accounts/${revolAccount}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (balRes.ok) {
        const balData = await balRes.json() as { balance?: number };
        if (balData.balance !== undefined) {
          await prisma.bankAccount.update({
            where: { id: account.id },
            data: { balanceCents: BigInt(Math.round(balData.balance * 100)), balanceDate: new Date() },
          });
        }
      }

      for (const tx of txList) {
        if (!['completed', 'pending'].includes(tx.state)) continue;
        totalFetched++;

        const isCredit = tx.amount >= 0;
        const amountCents = BigInt(Math.round(Math.abs(tx.amount) * 100));
        const creditorName = tx.merchant?.name ?? tx.counterpart?.name ?? undefined;
        const bookingDate = new Date(tx.completed_at ?? tx.created_at);

        try {
          const created = await prisma.transaction.create({
            data: {
              userId: connection.userId,
              bankAccountId: account.id,
              externalId: tx.id,
              valueDate: bookingDate,
              bookingDate,
              amountCents,
              currency: tx.currency,
              type: isCredit ? TransactionType.CREDIT : TransactionType.DEBIT,
              creditorName,
              merchantName: tx.merchant?.name ?? undefined,
              purpose: tx.description ?? undefined,
              isPending: tx.state === 'pending',
            },
          });
          totalNew++;
          newTxIds.push(created.id);
        } catch {
          // duplicate
        }
      }
    }

    if (newTxIds.length > 0) await applyCategorizationRules(connection.userId, newTxIds);

    await prisma.bankConnection.update({
      where: { id: bankConnectionId },
      data: { syncStatus: SyncStatus.SUCCESS, lastSyncAt: new Date(), syncError: null },
    });
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: SyncStatus.SUCCESS, finishedAt: new Date(), transactionsFetched: totalFetched, transactionsNew: totalNew },
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
