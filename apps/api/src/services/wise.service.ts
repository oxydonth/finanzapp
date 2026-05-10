import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { env } from '../config/env';
import { SyncStatus, TransactionType, AccountType, ConnectorType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { applyCategorizationRules } from './categorization.service';

const WISE_API = 'https://api.wise.com';

// OAuth state → userId
const pendingOAuthStates = new Map<string, { userId: string }>();

export function isConfigured(): boolean {
  return !!(env.WISE_CLIENT_ID && env.WISE_CLIENT_SECRET && env.WISE_REDIRECT_URI);
}

export function getAuthUrl(userId: string): string {
  if (!isConfigured()) throw new AppError('Wise integration not configured', 503);
  const state = uuidv4();
  pendingOAuthStates.set(state, { userId });
  setTimeout(() => pendingOAuthStates.delete(state), 10 * 60 * 1000);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.WISE_CLIENT_ID!,
    redirect_uri: env.WISE_REDIRECT_URI!,
    scope: 'transfers:read balances:read',
    state,
  });
  return `https://wise.com/oauth/v2/authorize?${params}`;
}

export async function handleCallback(code: string, state: string): Promise<string> {
  const session = pendingOAuthStates.get(state);
  if (!session) throw new AppError('OAuth state invalid or expired', 400);
  pendingOAuthStates.delete(state);
  const { userId } = session;

  const basicAuth = Buffer.from(`${env.WISE_CLIENT_ID}:${env.WISE_CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetch(`${WISE_API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.WISE_CLIENT_ID!,
      code,
      redirect_uri: env.WISE_REDIRECT_URI!,
    }),
  });
  if (!tokenRes.ok) throw new AppError(`Wise token exchange failed: ${await tokenRes.text()}`, 502);
  const tokens = await tokenRes.json() as { access_token: string; refresh_token: string };

  // Fetch profile info
  const profilesRes = await fetch(`${WISE_API}/v1/profiles`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profiles = await profilesRes.json() as Array<{
    id: number;
    type: string;
    details?: { firstName?: string; lastName?: string; name?: string };
  }>;
  const profile = profiles.find((p) => p.type === 'PERSONAL') ?? profiles[0];
  const ownerName = profile?.details
    ? [profile.details.firstName, profile.details.lastName].filter(Boolean).join(' ') ||
      profile.details.name ||
      'Wise User'
    : 'Wise User';

  const accessEnc = encrypt(tokens.access_token);
  const refreshEnc = encrypt(tokens.refresh_token);
  const profileIdStr = String(profile?.id ?? 'WISE');

  const connection = await prisma.bankConnection.create({
    data: {
      userId,
      connectorType: ConnectorType.WISE,
      bankCode: profileIdStr,
      bankName: 'Wise',
      fintsUrl: WISE_API,
      loginNameEncrypted: `${accessEnc.ciphertext}:${accessEnc.iv}:${accessEnc.tag}`,
      pinEncrypted: `${refreshEnc.ciphertext}:${refreshEnc.tag}`,
      pinIv: refreshEnc.iv,
      syncStatus: SyncStatus.SUCCESS,
      lastSyncAt: new Date(),
    },
  });

  // Create virtual accounts per Wise balance
  if (profile) {
    const balancesRes = await fetch(
      `${WISE_API}/v4/profiles/${profile.id}/multi-currency-account/balances?types=STANDARD`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const balances = await balancesRes.json() as Array<{
      id: number;
      currency: string;
      amount: { value: number; currency: string };
    }>;

    for (const bal of balances) {
      const ibanLike = `WISE-${profileIdStr}-${bal.currency}`;
      const ibanEnc = encrypt(ibanLike);
      await prisma.bankAccount.upsert({
        where: { id: `${connection.id}_${bal.id}` },
        update: { balanceCents: BigInt(Math.round(bal.amount.value * 100)), balanceDate: new Date() },
        create: {
          id: `${connection.id}_${bal.id}`,
          userId,
          bankConnectionId: connection.id,
          iban: `${ibanEnc.ciphertext}:${ibanEnc.iv}:${ibanEnc.tag}`,
          ibanMasked: ibanLike,
          bic: 'TRWIBEB1XXX',
          accountType: AccountType.CHECKING,
          accountName: `Wise ${bal.currency}`,
          ownerName,
          currency: bal.currency,
          balanceCents: BigInt(Math.round(bal.amount.value * 100)),
          balanceDate: new Date(),
        },
      });
    }
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
  const basicAuth = Buffer.from(`${env.WISE_CLIENT_ID}:${env.WISE_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${WISE_API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: env.WISE_CLIENT_ID!,
    }),
  });
  if (!res.ok) throw new AppError('Wise token refresh failed', 502);
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
    const profileId = connection.bankCode;
    const from = connection.lastSyncAt
      ? new Date(connection.lastSyncAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    let totalFetched = 0;
    let totalNew = 0;
    const newTxIds: string[] = [];

    for (const account of connection.accounts) {
      // Derive balance ID from account id suffix
      const balanceId = account.id.split('_').pop();
      if (!balanceId) continue;

      const params = new URLSearchParams({
        intervalStart: from.toISOString(),
        intervalEnd: new Date().toISOString(),
        type: 'COMPACT',
      });

      let res = await fetch(
        `${WISE_API}/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (res.status === 401) {
        accessToken = await refreshAccessToken(connection);
        res = await fetch(
          `${WISE_API}/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json?${params}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
      }
      if (!res.ok) continue;

      const stmt = await res.json() as {
        transactions?: Array<{
          type: string;
          date: string;
          amount: { value: number; currency: string };
          totalFees?: { value: number };
          details?: { description?: string; senderName?: string; recipient?: { name?: string } };
          referenceNumber?: string;
        }>;
        endOfStatementBalance?: { value: number; currency: string };
      };

      if (stmt.endOfStatementBalance) {
        await prisma.bankAccount.update({
          where: { id: account.id },
          data: {
            balanceCents: BigInt(Math.round(stmt.endOfStatementBalance.value * 100)),
            balanceDate: new Date(),
          },
        });
      }

      for (const tx of stmt.transactions ?? []) {
        totalFetched++;
        const isCredit = tx.amount.value >= 0;
        const amountCents = BigInt(Math.round(Math.abs(tx.amount.value) * 100));
        const creditorName = isCredit
          ? tx.details?.senderName
          : tx.details?.recipient?.name;
        try {
          const created = await prisma.transaction.create({
            data: {
              userId: connection.userId,
              bankAccountId: account.id,
              externalId: tx.referenceNumber ?? `${tx.date}_${tx.amount.value}`,
              valueDate: new Date(tx.date),
              bookingDate: new Date(tx.date),
              amountCents,
              currency: tx.amount.currency ?? 'EUR',
              type: isCredit ? TransactionType.CREDIT : TransactionType.DEBIT,
              creditorName: creditorName ?? undefined,
              purpose: tx.details?.description ?? undefined,
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
