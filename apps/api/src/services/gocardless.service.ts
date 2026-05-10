import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { env } from '../config/env';
import { SyncStatus, TransactionType, AccountType, ConnectorType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { applyCategorizationRules } from './categorization.service';

const GC_API = 'https://bankaccountdata.gocardless.com/api/v2';

interface GcToken { access: string; expiresAt: number }
let tokenCache: GcToken | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.access;
  if (!env.GOCARDLESS_SECRET_ID || !env.GOCARDLESS_SECRET_KEY) {
    throw new AppError('GoCardless not configured', 503);
  }
  const res = await fetch(`${GC_API}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id: env.GOCARDLESS_SECRET_ID, secret_key: env.GOCARDLESS_SECRET_KEY }),
  });
  if (!res.ok) throw new AppError(`GoCardless auth failed: ${await res.text()}`, 502);
  const data = await res.json() as { access: string; access_expires: number };
  tokenCache = { access: data.access, expiresAt: Date.now() + data.access_expires * 1000 };
  return data.access;
}

export interface GcInstitution { id: string; name: string; bic: string; logo: string; countries: string[] }

// requisitionId → userId, kept for 1 hour
const pendingRequisitions = new Map<string, { userId: string }>();

export function isConfigured(): boolean {
  return !!(env.GOCARDLESS_SECRET_ID && env.GOCARDLESS_SECRET_KEY);
}

export async function getInstitutions(country = 'DE'): Promise<GcInstitution[]> {
  const token = await getAccessToken();
  const res = await fetch(`${GC_API}/institutions/?country=${country}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new AppError(`GoCardless institutions failed: ${await res.text()}`, 502);
  return res.json() as Promise<GcInstitution[]>;
}

export async function createRequisition(userId: string, institutionId: string): Promise<{ link: string }> {
  const token = await getAccessToken();
  const redirectUri = env.GOCARDLESS_REDIRECT_URI ?? `${env.API_BASE_URL}/api/v1/banks/gocardless/callback`;

  const res = await fetch(`${GC_API}/requisitions/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      redirect: redirectUri,
      institution_id: institutionId,
      reference: uuidv4(),
      user_language: 'DE',
      account_selection: false,
    }),
  });
  if (!res.ok) throw new AppError(`GoCardless requisition failed: ${await res.text()}`, 502);
  const data = await res.json() as { id: string; link: string };

  pendingRequisitions.set(data.id, { userId });
  setTimeout(() => pendingRequisitions.delete(data.id), 60 * 60 * 1000);

  return { link: data.link };
}

export async function handleCallback(requisitionId: string): Promise<string> {
  const session = pendingRequisitions.get(requisitionId);
  if (!session) throw new AppError('Requisition not found or expired. Please try connecting again.', 404);
  pendingRequisitions.delete(requisitionId);
  const { userId } = session;

  const token = await getAccessToken();

  const reqRes = await fetch(`${GC_API}/requisitions/${requisitionId}/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!reqRes.ok) throw new AppError('GoCardless requisition fetch failed', 502);
  const requisition = await reqRes.json() as {
    id: string; status: string; institution_id: string; accounts: string[];
  };

  if (!requisition.accounts?.length) {
    throw new AppError('No accounts were linked. The bank authorisation may have been cancelled.', 400);
  }

  const instRes = await fetch(`${GC_API}/institutions/${requisition.institution_id}/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const institution = instRes.ok
    ? await instRes.json() as { id: string; name: string; bic: string }
    : { id: requisition.institution_id, name: requisition.institution_id, bic: '' };

  const reqIdEnc = encrypt(requisitionId);
  const placeholderEnc = encrypt('gocardless');

  const connection = await prisma.bankConnection.create({
    data: {
      userId,
      connectorType: ConnectorType.GOCARDLESS,
      bankCode: institution.bic || institution.id.slice(0, 20),
      bankName: institution.name,
      fintsUrl: GC_API,
      loginNameEncrypted: `${reqIdEnc.ciphertext}:${reqIdEnc.iv}:${reqIdEnc.tag}`,
      pinEncrypted: `${placeholderEnc.ciphertext}:${placeholderEnc.tag}`,
      pinIv: placeholderEnc.iv,
      syncStatus: SyncStatus.SYNCING,
      lastSyncAt: new Date(),
    },
  });

  for (const gcAccountId of requisition.accounts) {
    const [detailsRes, balRes] = await Promise.all([
      fetch(`${GC_API}/accounts/${gcAccountId}/details/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      }),
      fetch(`${GC_API}/accounts/${gcAccountId}/balances/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      }),
    ]);

    const details = detailsRes.ok
      ? ((await detailsRes.json()) as { account: { iban?: string; name?: string; currency?: string; ownerName?: string } }).account
      : {};

    const balances = balRes.ok
      ? ((await balRes.json()) as { balances: Array<{ balanceAmount: { amount: string; currency: string }; balanceType: string }> }).balances
      : [];
    const balance = balances.find((b) => b.balanceType === 'closingBooked' || b.balanceType === 'expected') ?? balances[0];
    const balanceCents = balance ? BigInt(Math.round(parseFloat(balance.balanceAmount.amount) * 100)) : 0n;

    const gcIdEnc = encrypt(gcAccountId);
    const iban = details.iban ?? '';

    await prisma.bankAccount.create({
      data: {
        id: `${connection.id}_${gcAccountId.replace(/-/g, '').slice(0, 8)}`,
        userId,
        bankConnectionId: connection.id,
        iban: `${gcIdEnc.ciphertext}:${gcIdEnc.iv}:${gcIdEnc.tag}`,
        ibanMasked: iban ? `${iban.slice(0, 4)}****${iban.slice(-4)}` : institution.name,
        bic: institution.bic ?? '',
        accountType: AccountType.CHECKING,
        accountName: details.name ?? institution.name,
        ownerName: details.ownerName ?? '',
        currency: details.currency ?? 'EUR',
        balanceCents,
        balanceDate: new Date(),
      },
    });
  }

  syncTransactions(connection.id).catch(console.error);
  return connection.id;
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
    const token = await getAccessToken();

    const from = connection.lastSyncAt
      ? new Date(connection.lastSyncAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const to = new Date();
    const dateFrom = from.toISOString().slice(0, 10);
    const dateTo = to.toISOString().slice(0, 10);

    let totalFetched = 0;
    let totalNew = 0;
    const newTxIds: string[] = [];

    for (const account of connection.accounts) {
      const [gcIdCipher, gcIdIv, gcIdTag] = account.iban.split(':');
      const gcAccountId = decrypt(gcIdCipher, gcIdIv, gcIdTag);

      try {
        const balRes = await fetch(`${GC_API}/accounts/${gcAccountId}/balances/`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (balRes.ok) {
          const { balances } = await balRes.json() as { balances: Array<{ balanceAmount: { amount: string }; balanceType: string }> };
          const bal = balances.find((b) => b.balanceType === 'closingBooked' || b.balanceType === 'expected') ?? balances[0];
          if (bal) {
            await prisma.bankAccount.update({
              where: { id: account.id },
              data: { balanceCents: BigInt(Math.round(parseFloat(bal.balanceAmount.amount) * 100)), balanceDate: new Date() },
            });
          }
        }
      } catch { /* non-fatal */ }

      const txRes = await fetch(
        `${GC_API}/accounts/${gcAccountId}/transactions/?date_from=${dateFrom}&date_to=${dateTo}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      );
      if (!txRes.ok) continue;

      const { transactions } = await txRes.json() as {
        transactions: {
          booked: Array<{
            transactionId?: string;
            bookingDate?: string;
            valueDate?: string;
            transactionAmount: { amount: string; currency: string };
            creditorName?: string;
            creditorAccount?: { iban?: string };
            debtorName?: string;
            debtorAccount?: { iban?: string };
            remittanceInformationUnstructured?: string;
            endToEndId?: string;
            mandateId?: string;
          }>;
          pending?: unknown[];
        };
      };

      for (const tx of transactions?.booked ?? []) {
        totalFetched++;
        const amount = parseFloat(tx.transactionAmount.amount);
        const amountCents = BigInt(Math.round(Math.abs(amount) * 100));
        const type = amount >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT;
        const bookingDate = tx.bookingDate ? new Date(tx.bookingDate) : new Date();
        const valueDate = tx.valueDate ? new Date(tx.valueDate) : bookingDate;
        const externalId = tx.transactionId ?? `${tx.bookingDate}_${tx.transactionAmount.amount}_${Math.random()}`;
        const creditorName = type === TransactionType.DEBIT ? tx.creditorName : tx.debtorName;
        const creditorIban = type === TransactionType.DEBIT ? tx.creditorAccount?.iban : tx.debtorAccount?.iban;

        try {
          const created = await prisma.transaction.create({
            data: {
              userId: connection.userId,
              bankAccountId: account.id,
              externalId,
              valueDate,
              bookingDate,
              amountCents,
              currency: tx.transactionAmount.currency,
              type,
              creditorName,
              creditorIban,
              purpose: tx.remittanceInformationUnstructured,
              endToEndId: tx.endToEndId,
              mandateId: tx.mandateId,
            },
          });
          totalNew++;
          newTxIds.push(created.id);
        } catch { /* duplicate externalId → skip */ }
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
