import {
  PinTanClient, SEPAAccount, Statement, Transaction as FintsTransaction,
  TanRequiredError, HKTAN, HISPA, Dialog,
} from 'node-fints';
import { prisma } from '../config/database';
import { encrypt, decrypt } from './encryption.service';
import { maskIBAN } from '@finanzapp/utils';
import { findBankByBlz } from '@finanzapp/config';
import { SyncStatus, AccountType, TransactionType } from '@finanzapp/types';
import { AppError, NotFoundError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { applyCategorizationRules } from './categorization.service';
import { redis } from '../config/redis';

interface PendingSession {
  client: PinTanClient;
  blz: string;
  loginName: string;
  pin: string;
  userId: string;
  bankConnectionId?: string;
  tanDialog?: Dialog;
  transactionReference?: string;
  challengeText?: string;
}

const TAN_SESSION_TTL = 10 * 60; // 10 minutes in seconds
const FINTS_SESSION_PREFIX = 'fints:session:';

async function setSession(sessionId: string, data: Omit<PendingSession, 'client'>): Promise<void> {
  await redis.setex(`${FINTS_SESSION_PREFIX}${sessionId}`, TAN_SESSION_TTL, JSON.stringify(data));
}

async function getSession(sessionId: string): Promise<Omit<PendingSession, 'client'> | null> {
  const raw = await redis.get(`${FINTS_SESSION_PREFIX}${sessionId}`);
  return raw ? JSON.parse(raw) : null;
}

async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`${FINTS_SESSION_PREFIX}${sessionId}`);
}

// In-memory map for active PinTanClient objects (can't be serialized to Redis)
const activeClients = new Map<string, PinTanClient>();

export async function initiateConnection(
  userId: string,
  blz: string,
  loginName: string,
  pin: string,
): Promise<{ sessionId?: string; tanChallenge?: string; requiresTanInput?: boolean; connectionId?: string }> {
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
    if (err instanceof TanRequiredError) {
      const sessionId = uuidv4();
      const method = err.dialog.tanMethods[0];
      // Decoupled/push-TAN: no code to enter (user approves in banking app)
      const requiresTanInput = method
        ? method.challengeValueRequired !== false && (method.maxLengthInput ?? 1) > 0
        : true;
      activeClients.set(sessionId, client);
      await setSession(sessionId, {
        blz, loginName, pin, userId,
        tanDialog: err.dialog,
        transactionReference: err.transactionReference,
        challengeText: err.challengeText,
      });
      // Clean up in-memory client when Redis TTL expires
      setTimeout(() => activeClients.delete(sessionId), TAN_SESSION_TTL * 1000);
      return { sessionId, tanChallenge: err.challengeText || 'TAN required', requiresTanInput };
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError(`FinTS connection failed: ${msg}`, 502);
  }

  const result = await finaliseConnection(userId, blz, loginName, pin, accounts, bank.name);
  return result;
}

export async function submitTan(
  userId: string,
  sessionId: string,
  tan: string,
): Promise<{ connectionId: string }> {
  const sessionData = await getSession(sessionId);
  if (!sessionData) throw new AppError('Session expired or not found', 404);
  if (sessionData.userId !== userId) throw new AppError('Session expired or not found', 404);
  await deleteSession(sessionId);
  const client = activeClients.get(sessionId);
  activeClients.delete(sessionId);
  const session = { ...sessionData, client };

  if (!client) throw new AppError('Session expired — client no longer in memory', 404);

  let accounts: SEPAAccount[];
  try {
    if (session.tanDialog && session.transactionReference) {
      // Continue the stalled FinTS dialog by sending the TAN response.
      // createDialog(savedDialog) uses Object.assign so it copies dialogId, msgNo, tanMethods etc.
      const dialog = client.createDialog(session.tanDialog);
      dialog.msgNo = dialog.msgNo + 1;
      const request = client.createRequest(dialog, [
        new HKTAN({
          segNo: 3,
          version: 6,
          process: '2',
          segmentReference: 'HKSPA',
          aref: session.transactionReference,
          medium: dialog.tanMethods[0]?.name ?? '',
        }),
      ], tan);
      const response = await dialog.send(request);
      await dialog.end();
      const hispa = response.findSegment(HISPA);
      accounts = hispa.accounts;
      // enrich with account owner names from HIUPD
      accounts.forEach((acc) => {
        const hiupdMatch = dialog.hiupd?.find((h) => h.account.iban === acc.iban);
        if (hiupdMatch) {
          acc.accountOwnerName = hiupdMatch.account.accountOwnerName1;
          acc.accountName = hiupdMatch.account.accountName;
        }
      });
    } else {
      // Decoupled push-TAN (e.g. DKB app approval): just retry — user approved externally
      const bank = findBankByBlz(session.blz)!;
      const retryClient = new PinTanClient({
        blz: session.blz,
        name: session.loginName,
        pin: session.pin,
        url: bank.fintsUrl,
        productId: 'finanzapp-v1',
      });
      accounts = await retryClient.accounts();
    }
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
        iban: (() => { const e = encrypt(iban); return `${e.ciphertext}:${e.iv}:${e.tag}`; })(),
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
      const [ibanCipher, ibanIv, ibanTag] = account.iban.split(':');
      const sepaAccount: SEPAAccount = {
        iban: ibanCipher && ibanIv && ibanTag ? decrypt(ibanCipher, ibanIv, ibanTag) : account.iban,
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
