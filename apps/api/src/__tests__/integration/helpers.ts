import supertest from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../config/database';

export const app = createApp();
export const req = supertest(app);

let counter = 0;
export function uniqueEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}-${++counter}@integration.test`;
}

export async function registerAndLogin(email = uniqueEmail()) {
  const password = 'Password1!';
  const reg = await req
    .post('/api/v1/auth/register')
    .send({ email, password, firstName: 'Test', lastName: 'User' });
  const { accessToken, refreshToken } = reg.body.data;
  return { email, password, accessToken, refreshToken, userId: reg.body.data.user.id };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createCategory(token: string, overrides: Record<string, unknown> = {}) {
  const res = await req
    .post('/api/v1/categories')
    .set(authHeader(token))
    .send({ name: 'Test Category', isIncome: false, ...overrides });
  return res.body.data;
}

export async function createBankConnection(userId: string) {
  return prisma.bankConnection.create({
    data: {
      userId,
      bankCode: '10000000',
      bankName: 'Test Bank',
      fintsUrl: 'https://example.com/fints',
      loginNameEncrypted: 'enc',
      pinEncrypted: 'enc',
      pinIv: 'iv',
    },
  });
}

export async function createBankAccount(userId: string, connectionId: string, overrides: Record<string, unknown> = {}) {
  return prisma.bankAccount.create({
    data: {
      userId,
      bankConnectionId: connectionId,
      iban: 'DE89370400440532013000',
      ibanMasked: 'DE89****3000',
      bic: 'COBADEFFXXX',
      accountName: 'Test Account',
      ownerName: 'Test User',
      balanceCents: BigInt(100000),
      ...overrides,
    },
  });
}

export async function createTransaction(userId: string, accountId: string, overrides: Record<string, unknown> = {}) {
  return prisma.transaction.create({
    data: {
      userId,
      bankAccountId: accountId,
      externalId: `ext-${Date.now()}-${Math.random()}`,
      bookingDate: new Date(),
      valueDate: new Date(),
      amountCents: BigInt(-5000),
      currency: 'EUR',
      type: 'DEBIT',
      purpose: 'Test payment',
      ...overrides,
    },
  });
}
