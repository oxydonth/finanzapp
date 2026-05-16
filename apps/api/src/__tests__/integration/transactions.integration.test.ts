import { describe, it, expect, beforeAll } from 'vitest';
import { req, registerAndLogin, authHeader, createBankConnection, createBankAccount, createTransaction } from './helpers';

describe('/api/v1/transactions', () => {
  let token: string;
  let userId: string;
  let accountId: string;
  let txId: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;
    userId = session.userId;
    const conn = await createBankConnection(userId);
    const account = await createBankAccount(userId, conn.id);
    accountId = account.id;
    const tx = await createTransaction(userId, accountId, {
      amountCents: BigInt(-5000),
      type: 'DEBIT',
      purpose: 'Supermarket EDEKA',
      bookingDate: new Date('2025-06-01'),
    });
    txId = tx.id;
    await createTransaction(userId, accountId, {
      amountCents: BigInt(200000),
      type: 'CREDIT',
      purpose: 'Salary',
      bookingDate: new Date('2025-06-15'),
    });
  });

  describe('GET /', () => {
    it('returns paginated transactions', async () => {
      const res = await req.get('/api/v1/transactions').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.page).toBe(1);
    });

    it('filters by type=DEBIT', async () => {
      const res = await req.get('/api/v1/transactions?type=DEBIT').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.data.every((t: { type: string }) => t.type === 'DEBIT')).toBe(true);
    });

    it('filters by type=CREDIT', async () => {
      const res = await req.get('/api/v1/transactions?type=CREDIT').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.data.every((t: { type: string }) => t.type === 'CREDIT')).toBe(true);
    });

    it('filters by accountId', async () => {
      const res = await req.get(`/api/v1/transactions?accountId=${accountId}`).set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by date range', async () => {
      const res = await req
        .get('/api/v1/transactions?from=2025-06-01&to=2025-06-10')
        .set(authHeader(token));
      expect(res.status).toBe(200);
      const ids = res.body.data.data.map((t: { id: string }) => t.id);
      expect(ids).toContain(txId);
    });

    it('filters by search term', async () => {
      const res = await req.get('/api/v1/transactions?search=EDEKA').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.data.some((t: { id: string }) => t.id === txId)).toBe(true);
    });

    it('supports pagination', async () => {
      const res = await req.get('/api/v1/transactions?page=1&limit=1').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBe(1);
      expect(res.body.data.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('requires authentication', async () => {
      const res = await req.get('/api/v1/transactions');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /stats/monthly', () => {
    it('returns monthly aggregates', async () => {
      const res = await req.get('/api/v1/transactions/stats/monthly?months=3').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /:id', () => {
    it('returns single transaction', async () => {
      const res = await req.get(`/api/v1/transactions/${txId}`).set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(txId);
    });

    it('returns 404 for unknown id', async () => {
      const res = await req
        .get('/api/v1/transactions/00000000-0000-0000-0000-000000000000')
        .set(authHeader(token));
      expect(res.status).toBe(404);
    });

    it('returns 403 for another users transaction', async () => {
      const other = await registerAndLogin();
      const res = await req.get(`/api/v1/transactions/${txId}`).set(authHeader(other.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /:id', () => {
    it('updates note and tags', async () => {
      const res = await req
        .patch(`/api/v1/transactions/${txId}`)
        .set(authHeader(token))
        .send({ note: 'Weekly groceries', tags: ['food', 'groceries'] });
      expect(res.status).toBe(200);
      expect(res.body.data.note).toBe('Weekly groceries');
      expect(res.body.data.tags).toContain('food');
    });

    it('updates isReviewed', async () => {
      const res = await req
        .patch(`/api/v1/transactions/${txId}`)
        .set(authHeader(token))
        .send({ isReviewed: true });
      expect(res.status).toBe(200);
      expect(res.body.data.isReviewed).toBe(true);
    });

    it('returns 403 for another users transaction', async () => {
      const other = await registerAndLogin();
      const res = await req
        .patch(`/api/v1/transactions/${txId}`)
        .set(authHeader(other.accessToken))
        .send({ note: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });
});
