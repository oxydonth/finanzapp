import { PinTanClient, SEPAAccount, Statement } from 'node-fints';
import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { maskIBAN } from '@finanzapp/utils';
import { findBankByBlz } from '@finanzapp/config';
import { SyncStatus, AccountType, TransactionType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

interface PendingSession {
  dialogState: unknown;
  blz: string;
  loginName: string;
  bankConnectionId?: string;
}

const pendingSessions = new Map<string, PendingSession>();

function mapAccountType(type: string): AccountType {
  const t = type?.toUpperCase() ?? '';
  if (t.includes('SPAR')) return AccountType.SAVINGS;
  if (t.includes('KREDIT') || t.includes('CREDIT')) return AccountType.CREDIT_CARD;
  if (t.includes('DEPOT')) return AccountType.DEPOT;
  if (t.includes('DARLEHEN') || t.includes('LOAN')) return AccountType.LOAN;
  return AccountType.CHECKING;
}

export async function initiateConnection(
  userId: string,
  blz: string,
  loginName: string,
  pin: string,
): Promise<{ sessionId?: string; tanChallenge?: string; connectionId?: string }> {
  const bank = findBankByBlz(blz);
  if (!bank) throw new AppError(`Bank with BLZ ${blz} not supported`, 400);

  const client = new PinTanClient({
    blz,
    name: loginName,
    pin,
    url: bank.fintsUrl,
    productId: 'finanzapp-v1',
  });

  let accounts: SEPAAccount[];
  try {
    accounts = await client.accounts();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('tan')) {
      const sessionId = uuidv4();
      pendingSessions.set(sessionId, { dialogState: client, blz, loginName });
      return { sessionId, tanChallenge: msg };
    }
    throw new AppError(`FinTS connection failed: ${msg}`, 502);
  }

  return finaliseConnection(userId, blz, loginName, pin, accounts, bank.name);
}

export async function submitTan(
  userId: string,
  sessionId: string,
  tan: string,
): Promise<{ connectionId: string }> {
  const session = pendingSessions.get(sessionId);
  if (!session) throw new AppError('Session expired or not found', 404);

  const client = session.dialogState as PinTanClient;
  let accounts: SEPAAccount[];
  try {
    accounts = await (client as unknown as { submitTan: (t: string) => Promise<SEPAAccount[]> }).submitTan(tan);
  } catch (err: unknown) {
    throw new AppError(`TAN verification failed: ${err instanceof Error ? err.message : err}`, 502);
  }
  pendingSessions.delete(sessionId);

  const bank = findBankByBlz(session.blz)!;
  const result = await finaliseConnection(
    userId,
    session.blz,
    session.loginName,
    '',
    accounts,
    bank.name,
    session.bankConnectionId,
  );
  return { connectionId: result.connectionId! };
}

async function finaliseConnection(
  userId: string,
  blz: string,
  loginName: string,
  pin: string,
  accounts: SEPAAccount[],
  bankName: string,
  existingConnectionId?: string,
): Promise<{ connectionId: string }> {
  const bank = findBankByBlz(blz)!;
  const loginEnc = encrypt(loginName);
  const pinEnc = pin ? encrypt(pin) : { ciphertext: '', iv: '', tag: '' };

  const connection = existingConnectionId
    ? await prisma.bankConnection.update({
        where: { id: existingConnectionId },
        data: { syncStatus: SyncStatus.SUCCESS, lastSyncAt: new Date() },
      })
    : await prisma.bankConnection.create({
        data: {
          userId,
          bankCode: blz,
          bankName,
          fintsUrl: bank.fintsUrl,
          loginNameEncrypted: `${loginEnc.ciphertext}:${loginEnc.iv}:${loginEnc.tag}`,
          pinEncrypted: pinEnc.ciphertext,
          pinIv: pinEnc.iv,
          syncStatus: SyncStatus.SUCCESS,
          lastSyncAt: new Date(),
        },
      });

  for (const acc of accounts) {
    const iban = acc.iban ?? '';
    await prisma.bankAccount.upsert({
      where: { id: `${connection.id}_${iban}` },
      update: { balanceCents: BigInt(0) },
      create: {
        id: `${connection.id}_${iban}`,
        userId,
        bankConnectionId: connection.id,
        iban: encrypt(iban).ciphertext,
        ibanMasked: maskIBAN(iban),
        bic: acc.bic ?? '',
        accountType: mapAccountType(acc.type ?? ''),
        accountName: acc.accountName ?? bankName,
        ownerName: acc.name ?? '',
        currency: 'EUR',
      },
    });
  }

  return { connectionId: connection.id };
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
    const [loginCipher, loginIv, loginTag] = connection.loginNameEncrypted.split(':');
    const loginName = decrypt(loginCipher, loginIv, loginTag);
    const pin = decrypt(connection.pinEncrypted, connection.pinIv, '');

    const client = new PinTanClient({
      blz: connection.bankCode,
      name: loginName,
      pin,
      url: connection.fintsUrl,
      productId: 'finanzapp-v1',
    });

    const from = connection.lastSyncAt
      ? new Date(connection.lastSyncAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const to = new Date();

    let totalFetched = 0;
    let totalNew = 0;

    for (const account of connection.accounts) {
      const sepaAccount: SEPAAccount = {
        iban: decrypt(account.iban, '', ''),
        bic: account.bic,
        accountName: account.accountName,
        name: account.ownerName,
        type: account.accountType,
      } as unknown as SEPAAccount;

      let statements: Statement[] = [];
      try {
        statements = await client.statements(sepaAccount, from, to);
      } catch {
        continue;
      }

      for (const stmt of statements) {
        if (stmt.closingBalance) {
          await prisma.bankAccount.update({
            where: { id: account.id },
            data: {
              balanceCents: BigInt(Math.round(stmt.closingBalance.value * 100)),
              balanceDate: new Date(),
            },
          });
        }

        for (const tx of stmt.transactions ?? []) {
          totalFetched++;
          const amountCents = BigInt(Math.round((tx.amount?.value ?? 0) * 100));
          const type = amountCents >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT;
          const externalId = tx.reference ?? `${tx.bookingDate?.toISOString()}_${amountCents}`;

          try {
            await prisma.transaction.create({
              data: {
                userId: connection.userId,
                bankAccountId: account.id,
                externalId,
                valueDate: tx.valueDate ?? tx.bookingDate ?? new Date(),
                bookingDate: tx.bookingDate ?? new Date(),
                amountCents,
                type,
                creditorName: tx.name ?? undefined,
                creditorIban: tx.iban ?? undefined,
                purpose: tx.description ?? undefined,
                endToEndId: tx.endToEndId ?? undefined,
              },
            });
            totalNew++;
          } catch {
            // duplicate — skip
          }
        }
      }
    }

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
