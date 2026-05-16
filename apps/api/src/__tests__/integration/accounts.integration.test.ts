import { describe, it, expect, beforeAll } from 'vitest';
import { req, registerAndLogin, authHeader, createBankConnection, createBankAccount } from './helpers';

describe('/api/v1/accounts', () => {
  let token: string;
  let userId: string;
  let accountId: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;
    userId = session.userId;
    const conn = await createBankConnection(userId);
    const account = await createBankAccount(userId, conn.id);
    accountId = account.id;
  });

  describe('GET /', () => {
    it('returns accounts for authenticated user', async () => {
      const res = await req.get('/api/v1/accounts').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((a: { id: string }) => a.id === accountId)).toBe(true);
    });

    it('requires authentication', async () => {
      const res = await req.get('/api/v1/accounts');
      expect(res.status).toBe(401);
    });

    it('does not return other users accounts', async () => {
      const other = await registerAndLogin();
      const res = await req.get('/api/v1/accounts').set(authHeader(other.accessToken));
      expect(res.body.data.every((a: { id: string }) => a.id !== accountId)).toBe(true);
    });
  });

  describe('GET /:id', () => {
    it('returns single account', async () => {
      const res = await req.get(`/api/v1/accounts/${accountId}`).set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(accountId);
    });

    it('returns 404 for unknown id', async () => {
      const res = await req.get('/api/v1/accounts/00000000-0000-0000-0000-000000000000').set(authHeader(token));
      expect(res.status).toBe(404);
    });

    it('returns 403 for another users account', async () => {
      const other = await registerAndLogin();
      const res = await req.get(`/api/v1/accounts/${accountId}`).set(authHeader(other.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /:id', () => {
    it('updates accountName', async () => {
      const res = await req
        .patch(`/api/v1/accounts/${accountId}`)
        .set(authHeader(token))
        .send({ accountName: 'Renamed Account' });
      expect(res.status).toBe(200);
      expect(res.body.data.accountName).toBe('Renamed Account');
    });

    it('updates isHidden', async () => {
      const res = await req
        .patch(`/api/v1/accounts/${accountId}`)
        .set(authHeader(token))
        .send({ isHidden: true });
      expect(res.status).toBe(200);
      expect(res.body.data.isHidden).toBe(true);
    });

    it('returns 403 for another users account', async () => {
      const other = await registerAndLogin();
      const res = await req
        .patch(`/api/v1/accounts/${accountId}`)
        .set(authHeader(other.accessToken))
        .send({ accountName: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });
});
