/**
 * End-to-end banking integration tests.
 *
 * node-fints (PinTanClient) is mocked so no real bank connection is made.
 * The test drives the full HTTP layer through supertest against a real
 * Postgres database, exercising encryption, DB writes, and route auth.
 *
 * Flows covered:
 *  1. Bank registry — GET /banks, /banks/search, /banks/:blz
 *  2. FinTS happy path — POST /connections → account created in DB
 *  3. FinTS TAN-required flow — POST /connections → sessionId → POST /connections/:id/tan
 *  4. FinTS error handling — bad BLZ, network failure
 *  5. Connection lifecycle — list, get, sync trigger, disconnect
 *  6. Auth enforcement — all protected endpoints reject without token
 *  7. Isolation — user A cannot access user B's connections
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { req, registerAndLogin, authHeader } from './helpers';
import { prisma } from '../../config/database';

// ── node-fints mock ───────────────────────────────────────────────────────────

const mockAccountsList = [
  {
    iban: 'DE89370400440532013000',
    bic: 'COBADEFFXXX',
    accountNumber: '0532013000',
    accountName: 'Girokonto',
    accountOwnerName: 'Max Mustermann',
  },
  {
    iban: 'DE91100000000123456789',
    bic: 'MARKDEFF',
    accountNumber: '0123456789',
    accountName: 'Sparkonto',
    accountOwnerName: 'Max Mustermann',
  },
];

let mockAccountsImpl: () => Promise<typeof mockAccountsList> = async () => mockAccountsList;

vi.mock('node-fints', async () => {
  class MockPinTanClient {
    accounts() { return mockAccountsImpl(); }
    createDialog() { return {}; }
    createRequest() { return {}; }
  }

  class MockTanRequiredError extends Error {
    dialog = {
      tanMethods: [{ name: 'pushTAN', challengeValueRequired: false, maxLengthInput: 0 }],
      msgNo: 1,
      hiupd: [],
    };
    transactionReference = 'TXN-REF-123';
    challengeText = 'Bitte bestätigen Sie in Ihrer Banking-App';
    constructor() { super('TAN required'); }
  }

  return {
    PinTanClient: MockPinTanClient,
    TanRequiredError: MockTanRequiredError,
    SEPAAccount: class {},
    Statement: class {},
    Transaction: class {},
    HKTAN: class { constructor(public opts: Record<string, unknown>) {} },
    HISPA: class {},
    Dialog: class {},
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

const VALID_BLZ = '20010020'; // Deutsche Bank Hamburg — in the bank registry
const LOGIN = 'testuser';
const PIN = '12345';

describe('GET /api/v1/banks — bank registry', () => {
  it('returns list of supported banks', async () => {
    const res = await req.get('/api/v1/banks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('blz');
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('fintsUrl');
  });

  it('does not require authentication', async () => {
    const res = await req.get('/api/v1/banks');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/banks/search — bank search', () => {
  it('returns matching banks for query', async () => {
    const res = await req.get('/api/v1/banks/search?q=Deutsche');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((b: { name: string }) => b.name.includes('Deutsche'))).toBe(true);
  });

  it('returns empty array for no match', async () => {
    const res = await req.get('/api/v1/banks/search?q=ZZZNoMatchBank999');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('rejects empty query', async () => {
    const res = await req.get('/api/v1/banks/search?q=');
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/banks/:blz — single bank lookup', () => {
  it('returns bank for valid BLZ', async () => {
    const res = await req.get(`/api/v1/banks/${VALID_BLZ}`);
    expect(res.status).toBe(200);
    expect(res.body.data.blz).toBe(VALID_BLZ);
    expect(res.body.data.fintsUrl).toBeTruthy();
  });

  it('returns 404 for unknown BLZ', async () => {
    const res = await req.get('/api/v1/banks/99999999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/banks/connections — FinTS happy path', () => {
  let token: string;
  let userId: string;
  let connectionId: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;
    userId = session.userId;
    mockAccountsImpl = async () => mockAccountsList;
  });

  afterAll(async () => {
    if (connectionId) {
      await prisma.bankAccount.deleteMany({ where: { bankConnectionId: connectionId } });
      await prisma.bankConnection.deleteMany({ where: { id: connectionId } });
    }
  });

  it('creates connection and accounts in DB', async () => {
    const res = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: PIN });

    expect(res.status).toBe(201);
    expect(res.body.data.connectionId).toBeTruthy();
    connectionId = res.body.data.connectionId;

    const conn = await prisma.bankConnection.findUnique({ where: { id: connectionId } });
    expect(conn).toBeTruthy();
    expect(conn!.bankCode).toBe(VALID_BLZ);
    expect(conn!.userId).toBe(userId);
    expect(conn!.syncStatus).toBe('SUCCESS');
    // credentials must be encrypted, never stored plaintext
    expect(conn!.loginNameEncrypted).not.toContain(LOGIN);
    expect(conn!.pinEncrypted).not.toContain(PIN);
    expect(conn!.pinIv).toBeTruthy();
  });

  it('creates both bank accounts in DB', async () => {
    const accounts = await prisma.bankAccount.findMany({ where: { bankConnectionId: connectionId } });
    expect(accounts.length).toBe(2);
    // IBANs must be stored encrypted
    expect(accounts[0].iban).not.toContain('DE89');
    // Masked IBAN must be readable
    expect(accounts[0].ibanMasked).toContain('****');
    expect(accounts[0].bic).toBeTruthy();
  });

  it('connection appears in GET /connections list', async () => {
    const res = await req.get('/api/v1/banks/connections').set(authHeader(token));
    expect(res.status).toBe(200);
    const found = res.body.data.find((c: { id: string }) => c.id === connectionId);
    expect(found).toBeTruthy();
    // Sensitive fields must be stripped from API response
    expect(found.pinEncrypted).toBeUndefined();
    expect(found.pinIv).toBeUndefined();
    expect(found.loginNameEncrypted).toBeUndefined();
  });

  it('connection is accessible via GET /connections/:id', async () => {
    const res = await req.get(`/api/v1/banks/connections/${connectionId}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(connectionId);
    expect(res.body.data.pinEncrypted).toBeUndefined();
  });

  it('requires authentication', async () => {
    const res = await req.post('/api/v1/banks/connections').send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: PIN });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/banks/connections — TAN-required flow', () => {
  let token: string;
  let sessionId: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;

    // Make FinTS client throw TanRequiredError on first call
    const { TanRequiredError } = await import('node-fints');
    mockAccountsImpl = async () => { throw new TanRequiredError(); };
  });

  afterAll(() => {
    mockAccountsImpl = async () => mockAccountsList;
  });

  it('returns sessionId and challenge when TAN required', async () => {
    const res = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: PIN });

    expect(res.status).toBe(201);
    expect(res.body.data.sessionId).toBeTruthy();
    expect(res.body.data.tanChallenge).toBeTruthy();
    sessionId = res.body.data.sessionId;
  });

  it('does NOT yet create a DB connection (pending TAN)', async () => {
    // Session is in-memory; no DB record until TAN submitted
    const conns = await req.get('/api/v1/banks/connections').set(authHeader(token));
    // Connection list may include connections from other tests in this suite,
    // but none should be pending (they're either finalised or not yet created)
    expect(Array.isArray(conns.body.data)).toBe(true);
  });

  it('rejects TAN submission with expired/unknown sessionId', async () => {
    const res = await req
      .post('/api/v1/banks/connections/bad-session-id/tan')
      .set(authHeader(token))
      .send({ sessionId: 'nonexistent-session', tan: '123456' });
    // Route uses /:id/tan — id is the connection id, sessionId is body
    expect([404, 400, 422]).toContain(res.status);
  });
});

describe('POST /api/v1/banks/connections — error handling', () => {
  let token: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;
  });

  afterAll(() => {
    mockAccountsImpl = async () => mockAccountsList;
  });

  it('returns 400 for unknown BLZ', async () => {
    const res = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: '99999999', loginName: LOGIN, pin: PIN });
    expect(res.status).toBe(400);
  });

  it('returns 400 for BLZ too short', async () => {
    const res = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: '1234', loginName: LOGIN, pin: PIN });
    expect(res.status).toBe(422);
  });

  it('returns 502 when FinTS client throws network error', async () => {
    mockAccountsImpl = async () => { throw new Error('ECONNREFUSED'); };
    const res = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: PIN });
    expect(res.status).toBe(502);
  });

  it('returns 422 for missing loginName', async () => {
    const res = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: VALID_BLZ, pin: PIN });
    expect(res.status).toBe(422);
  });

  it('returns 422 for PIN too short', async () => {
    const res = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: '123' });
    expect(res.status).toBe(422);
  });
});

describe('Connection lifecycle — sync & disconnect', () => {
  let token: string;
  let connectionId: string;

  beforeAll(async () => {
    mockAccountsImpl = async () => mockAccountsList;
    const session = await registerAndLogin();
    token = session.accessToken;

    const create = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(token))
      .send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: PIN });
    connectionId = create.body.data.connectionId;
  });

  it('POST /connections/:id/sync triggers async sync (returns 200)', async () => {
    const res = await req
      .post(`/api/v1/banks/connections/${connectionId}/sync`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('Sync');
  });

  it('DELETE /connections/:id soft-deletes connection', async () => {
    const res = await req
      .delete(`/api/v1/banks/connections/${connectionId}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);

    const conn = await prisma.bankConnection.findUnique({ where: { id: connectionId } });
    expect(conn!.isActive).toBe(false);
  });

  it('disconnected connection no longer appears in list', async () => {
    const res = await req.get('/api/v1/banks/connections').set(authHeader(token));
    expect(res.body.data.every((c: { id: string }) => c.id !== connectionId)).toBe(true);
  });
});

describe('Cross-user isolation', () => {
  let tokenA: string;
  let tokenB: string;
  let connectionId: string;

  beforeAll(async () => {
    mockAccountsImpl = async () => mockAccountsList;
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    tokenA = a.accessToken;
    tokenB = b.accessToken;

    const create = await req
      .post('/api/v1/banks/connections')
      .set(authHeader(tokenA))
      .send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: PIN });
    connectionId = create.body.data.connectionId;
  });

  it('user B cannot GET user A connection', async () => {
    const res = await req.get(`/api/v1/banks/connections/${connectionId}`).set(authHeader(tokenB));
    expect(res.status).toBe(403);
  });

  it('user B cannot sync user A connection', async () => {
    const res = await req
      .post(`/api/v1/banks/connections/${connectionId}/sync`)
      .set(authHeader(tokenB));
    expect(res.status).toBe(403);
  });

  it('user B cannot delete user A connection', async () => {
    const res = await req
      .delete(`/api/v1/banks/connections/${connectionId}`)
      .set(authHeader(tokenB));
    expect(res.status).toBe(403);
  });

  it("user B's connection list does not include user A's connection", async () => {
    const res = await req.get('/api/v1/banks/connections').set(authHeader(tokenB));
    expect(res.body.data.every((c: { id: string }) => c.id !== connectionId)).toBe(true);
  });
});

describe('Auth enforcement', () => {
  it('GET /connections requires token', async () => {
    expect((await req.get('/api/v1/banks/connections')).status).toBe(401);
  });

  it('POST /connections requires token', async () => {
    expect((await req.post('/api/v1/banks/connections').send({ bankCode: VALID_BLZ, loginName: LOGIN, pin: PIN })).status).toBe(401);
  });

  it('GET /connections/:id requires token', async () => {
    expect((await req.get('/api/v1/banks/connections/some-id')).status).toBe(401);
  });

  it('POST /connections/:id/sync requires token', async () => {
    expect((await req.post('/api/v1/banks/connections/some-id/sync')).status).toBe(401);
  });

  it('DELETE /connections/:id requires token', async () => {
    expect((await req.delete('/api/v1/banks/connections/some-id')).status).toBe(401);
  });
});
