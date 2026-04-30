import { PinTanClient, SEPAAccount, Statement, Transaction as FintsTransaction } from 'node-fints';
import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { maskIBAN } from '@finanzapp/utils';
import { findBankByBlz } from '@finanzapp/config';
import { SyncStatus, AccountType, TransactionType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { applyCategorizationRules } from './categorization.service';

interface PendingSession {
  client: PinTanClient;
  blz: string;
  loginName: string;
  pin: string;
  bankConnectionId?: string;
}

// In-memory TAN challenge store (use Redis in production)
const pendingSessions = new Map<string, PendingSession>();

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
    // Some banks require a TAN before returning accounts
    if (msg.toLowerCase().includes('tan') || msg.toLowerCase().includes('3920')) {
      const sessionId = uuidv4();
      pendingSessions.set(sessionId, { client, blz, loginName, pin });
      setTimeout(() => pendingSessions.delete(sessionId), 10 * 60 * 1000);
      return { sessionId, tanChallenge: msg };
    }
    throw new AppError(`FinTS connection failed: ${msg}`, 502);
  }

  const result = await finaliseConnection(userId, blz, loginName, pin, accounts, bank.name);
  return result;
}

export async function submitTan(
  userId: string,
  sessionId: string,
  _tan: string,
): Promise<{ connectionId: string }> {
  const session = pendingSessions.get(sessionId);
  if (!session) throw new AppError('Session expired or not found', 404);
  pendingSessions.delete(sessionId);

  // Re-fetch accounts after TAN submission using the saved dialog
  let accounts: SEPAAccount[];
  try {
    // Re-authenticate with the stored credentials + TAN hint
    const bank = findBankByBlz(session.blz)!;
    const clientWithTan = new PinTanClient({
      blz: session.blz,
      name: session.loginName,
      pin: session.pin,
      url: bank.fintsUrl,
      productId: 'finanzapp-v1',
    });
    accounts = await clientWithTan.accounts();
  } catch (err: unknown) {
    throw new AppError(`TAN verification failed: ${err instanceof Error ? err.message : err}`, 502);
  }

  const bank = findBankByBlz(session.blz)!;
  const result = await finaliseConnection(
    userId,
    session.blz,
    session.loginName,
    session.pin,
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
  const pinEnc = encrypt(pin);

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
          pinEncrypted: `${pinEnc.ciphertext}:${pinEnc.tag}`,
          pinIv: pinEnc.iv,
          syncStatus: SyncStatus.SUCCESS,
          lastSyncAt: new Date(),
        },
      });

  for (const acc of accounts) {
    const iban = acc.iban ?? '';
    const accountId = `${connection.id}_${acc.accountNumber ?? iban}`;
    await prisma.bankAccount.upsert({
      where: { id: accountId },
      update: {},
      create: {
        id: accountId,
        userId,
        bankConnectionId: connection.id,
        iban: encrypt(iban).ciphertext,
        ibanMasked: maskIBAN(iban),
        bic: acc.bic ?? '',
        accountType: AccountType.CHECKING,
        accountName: acc.accountName ?? bankName,
        ownerName: acc.accountOwnerName ?? '',
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
    const [pinCipher, pinTag] = connection.pinEncrypted.split(':');
    const pin = decrypt(pinCipher, connection.pinIv, pinTag);

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
    const newTxIds: string[] = [];

    for (const account of connection.accounts) {
      const sepaAccount: SEPAAccount = {
        iban: decrypt(account.iban, '', ''),
        bic: account.bic,
        accountNumber: account.id,
        blz: connection.bankCode,
        accountName: account.accountName,
        accountOwnerName: account.ownerName,
      };

      let statements: Statement[] = [];
      try {
        statements = await client.statements(sepaAccount, from, to);
      } catch {
        continue;
      }

      for (const stmt of statements) {
        // Update balance from closing balance
        if (stmt.closingBalance) {
          const balanceCents = BigInt(Math.round(stmt.closingBalance.value * 100));
          await prisma.bankAccount.update({
            where: { id: account.id },
            data: { balanceCents, balanceDate: new Date() },
          });
        }

        for (const tx of stmt.transactions as FintsTransaction[]) {
          totalFetched++;
          const amountCents = BigInt(Math.round(tx.amount * 100 * (tx.isCredit ? 1 : -1)));
          const type = tx.isCredit ? TransactionType.CREDIT : TransactionType.DEBIT;
          const externalId = tx.id ?? `${tx.entryDate}_${tx.amount}_${tx.customerReference}`;

          const creditorName = tx.descriptionStructured?.name;
          const creditorIban = tx.descriptionStructured?.iban;
          const purpose =
            tx.descriptionStructured?.reference?.text ??
            tx.descriptionStructured?.text ??
            tx.description;
          const endToEndId = tx.descriptionStructured?.reference?.endToEndRef;

          // parse dates — mt940-js returns "YYMMDD" strings
          const parseMT940Date = (d: string): Date => {
            if (!d || d.length < 6) return new Date();
            const yy = parseInt(d.slice(0, 2), 10);
            const mm = parseInt(d.slice(2, 4), 10) - 1;
            const dd = parseInt(d.slice(4, 6), 10);
            return new Date(2000 + yy, mm, dd);
          };

          const bookingDate = parseMT940Date(tx.entryDate);
          const valueDate = parseMT940Date(tx.valueDate);

          try {
            const created = await prisma.transaction.create({
              data: {
                userId: connection.userId,
                bankAccountId: account.id,
                externalId,
                valueDate,
                bookingDate,
                amountCents,
                type,
                creditorName,
                creditorIban,
                purpose,
                endToEndId,
              },
            });
            totalNew++;
            newTxIds.push(created.id);
          } catch {
            // unique constraint violation = duplicate, skip
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
