import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { env } from '../config/env';
import { SyncStatus, TransactionType, AccountType, ConnectorType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { applyCategorizationRules } from './categorization.service';
import { redis } from '../config/redis';

const PAYPAL_API = 'https://api-m.paypal.com';
const PAYPAL_CONNECT_URL = 'https://www.paypal.com/connect/';
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://uri.paypal.com/services/reporting/search/read',
].join(' ');

const OAUTH_STATE_TTL = 10 * 60; // 10 minutes
const PAYPAL_STATE_PREFIX = 'paypal:oauth:';

async function setOAuthState(state: string, userId: string): Promise<void> {
  await redis.setex(`${PAYPAL_STATE_PREFIX}${state}`, OAUTH_STATE_TTL, userId);
}

async function popOAuthState(state: string): Promise<string | null> {
  const userId = await redis.get(`${PAYPAL_STATE_PREFIX}${state}`);
  if (userId) await redis.del(`${PAYPAL_STATE_PREFIX}${state}`);
  return userId;
}

export function isConfigured(): boolean {
  return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_REDIRECT_URI);
}

export async function getAuthUrl(userId: string): Promise<string> {
  if (!isConfigured()) throw new AppError('PayPal integration not configured', 503);
  const state = uuidv4();
  await setOAuthState(state, userId);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.PAYPAL_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: env.PAYPAL_REDIRECT_URI!,
    state,
  });
  return `${PAYPAL_CONNECT_URL}?${params}`;
}

export async function handleCallback(code: string, state: string): Promise<string> {
  const userId = await popOAuthState(state);
  if (!userId) throw new AppError('OAuth state invalid or expired', 400);

  const basicAuth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');

  // Exchange authorisation code for tokens
  const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.PAYPAL_REDIRECT_URI!,
    }),
  });
  if (!tokenRes.ok) throw new AppError(`PayPal token exchange failed: ${await tokenRes.text()}`, 502);

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch PayPal user profile
  const userRes = await fetch(`${PAYPAL_API}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json() as {
    payer_id?: string;
    email?: string;
    name?: { given_name?: string; surname?: string };
  };

  const ownerName = userInfo.name
    ? [userInfo.name.given_name, userInfo.name.surname].filter(Boolean).join(' ')
    : 'PayPal User';
  const accountLabel = userInfo.email ?? userInfo.payer_id ?? 'PayPal';

  // Reuse existing encrypted-credential fields to store OAuth tokens
  const accessEnc = encrypt(tokens.access_token);
  const refreshEnc = encrypt(tokens.refresh_token);

  const connection = await prisma.bankConnection.create({
    data: {
      userId,
      connectorType: ConnectorType.PAYPAL,
      bankCode: userInfo.payer_id ?? 'PAYPAL',
      bankName: 'PayPal',
      fintsUrl: PAYPAL_API,
      loginNameEncrypted: `${accessEnc.ciphertext}:${accessEnc.iv}:${accessEnc.tag}`,
      pinEncrypted: `${refreshEnc.ciphertext}:${refreshEnc.tag}`,
      pinIv: refreshEnc.iv,
      syncStatus: SyncStatus.SUCCESS,
      lastSyncAt: new Date(),
    },
  });

  // Create a virtual account representing the PayPal wallet
  const ibanEnc = encrypt(userInfo.payer_id ?? 'PAYPAL');
  await prisma.bankAccount.create({
    data: {
      id: `${connection.id}_pp`,
      userId,
      bankConnectionId: connection.id,
      iban: `${ibanEnc.ciphertext}:${ibanEnc.iv}:${ibanEnc.tag}`,
      ibanMasked: accountLabel,
      bic: 'PAYPALUS20',
      accountType: AccountType.CHECKING,
      accountName: 'PayPal',
      ownerName,
      currency: 'EUR',
    },
  });

  // Initial sync in background
  syncTransactions(connection.id).catch(console.error);
  return connection.id;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function decryptAccessToken(conn: { loginNameEncrypted: string }): string {
  const [c, iv, tag] = conn.loginNameEncrypted.split(':');
  return decrypt(c, iv, tag);
}

async function refreshAccessToken(
  conn: { id: string; pinEncrypted: string; pinIv: string },
): Promise<string> {
  const [c, tag] = conn.pinEncrypted.split(':');
  const refreshToken = decrypt(c, conn.pinIv, tag);
  const basicAuth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) throw new AppError('PayPal token refresh failed', 502);
  const data = await res.json() as { access_token: string };

  // Persist refreshed access token
  const enc = encrypt(data.access_token);
  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: { loginNameEncrypted: `${enc.ciphertext}:${enc.iv}:${enc.tag}` },
  });
  return data.access_token;
}

// ── Sync ───────────────────────────────────────────────────────────────────────

export async function syncTransactions(bankConnectionId: string): Promise<void> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: bankConnectionId },
    include: { accounts: true },
  });
  if (!connection) throw new NotFoundError('BankConnection');
  if (connection.accounts.length === 0) throw new AppError('No PayPal account found', 500);

  await prisma.bankConnection.update({
    where: { id: bankConnectionId },
    data: { syncStatus: SyncStatus.SYNCING },
  });
  const log = await prisma.syncLog.create({
    data: { bankConnectionId, status: SyncStatus.SYNCING },
  });

  try {
    let accessToken = decryptAccessToken(connection);
    const account = connection.accounts[0];

    const from = connection.lastSyncAt
      ? new Date(connection.lastSyncAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const to = new Date();

    // PayPal transactions API allows at most 31 days per request
    const ranges: { start: Date; end: Date }[] = [];
    let cur = new Date(from);
    while (cur < to) {
      const end = new Date(cur);
      end.setDate(end.getDate() + 31);
      ranges.push({ start: new Date(cur), end: end > to ? to : end });
      cur = new Date(end);
    }

    let totalFetched = 0;
    let totalNew = 0;
    const newTxIds: string[] = [];

    for (const range of ranges) {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const params = new URLSearchParams({
          start_date: range.start.toISOString(),
          end_date: range.end.toISOString(),
          fields: 'all',
          page_size: '500',
          page: String(page),
        });

        let res = await fetch(`${PAYPAL_API}/v1/reporting/transactions?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        // Refresh token on 401 and retry once
        if (res.status === 401) {
          accessToken = await refreshAccessToken(connection);
          res = await fetch(`${PAYPAL_API}/v1/reporting/transactions?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
        if (!res.ok) break;

        const data = await res.json() as {
          transaction_details?: Array<{
            transaction_info: {
              transaction_id: string;
              transaction_initiation_date: string;
              transaction_amount: { currency_code: string; value: string };
              transaction_status: string;
              transaction_subject?: string;
            };
            payer_info?: {
              email_address?: string;
              payer_name?: { given_name?: string; surname?: string };
            };
          }>;
          total_pages?: number;
        };

        totalPages = data.total_pages ?? 1;
        page++;

        for (const detail of data.transaction_details ?? []) {
          const info = detail.transaction_info;
          if (!['S', 'P'].includes(info.transaction_status)) continue;

          totalFetched++;
          const rawAmount = parseFloat(info.transaction_amount.value ?? '0');
          const amountCents = BigInt(Math.round(Math.abs(rawAmount) * 100));
          const type = rawAmount >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT;
          const bookingDate = new Date(info.transaction_initiation_date);
          const currency = info.transaction_amount.currency_code ?? 'EUR';
          const payer = detail.payer_info;
          const creditorName = payer?.payer_name
            ? [payer.payer_name.given_name, payer.payer_name.surname].filter(Boolean).join(' ')
            : payer?.email_address;

          try {
            const created = await prisma.transaction.create({
              data: {
                userId: connection.userId,
                bankAccountId: account.id,
                externalId: info.transaction_id,
                valueDate: bookingDate,
                bookingDate,
                amountCents,
                currency,
                type,
                creditorName: creditorName ?? undefined,
                purpose: info.transaction_subject ?? undefined,
                isPending: info.transaction_status === 'P',
              },
            });
            totalNew++;
            newTxIds.push(created.id);
          } catch {
            // duplicate externalId → skip
          }
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
