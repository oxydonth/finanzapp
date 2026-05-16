import { describe, it, expect, beforeAll } from 'vitest';
import { req, registerAndLogin, authHeader } from './helpers';

describe('/api/v1/users', () => {
  let token: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;
  });

  describe('GET /me', () => {
    it('returns user profile', async () => {
      const res = await req.get('/api/v1/users/me').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBeTruthy();
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.refreshTokenHash).toBeUndefined();
    });

    it('requires authentication', async () => {
      const res = await req.get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /me', () => {
    it('updates firstName', async () => {
      const res = await req
        .patch('/api/v1/users/me')
        .set(authHeader(token))
        .send({ firstName: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Updated');
    });

    it('updates currency', async () => {
      const res = await req
        .patch('/api/v1/users/me')
        .set(authHeader(token))
        .send({ currency: 'USD' });
      expect(res.status).toBe(200);
      expect(res.body.data.currency).toBe('USD');
    });

    it('rejects currency longer than 3 chars', async () => {
      const res = await req
        .patch('/api/v1/users/me')
        .set(authHeader(token))
        .send({ currency: 'TOOLONG' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /me/export', () => {
    it('returns GDPR data export', async () => {
      const res = await req.get('/api/v1/users/me/export').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.exportVersion).toBe('1.0');
      expect(res.body.legalBasis).toContain('DSGVO');
      expect(res.body.data.email).toBeTruthy();
      expect(res.body.exportedAt).toBeTruthy();
    });

    it('requires authentication', async () => {
      const res = await req.get('/api/v1/users/me/export');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /me', () => {
    it('soft-deletes user and blocks subsequent login', async () => {
      const { email, password, accessToken } = await registerAndLogin();

      const del = await req
        .delete('/api/v1/users/me')
        .set(authHeader(accessToken))
        .send({ password });
      expect(del.status).toBe(200);

      const login = await req.post('/api/v1/auth/login').send({ email, password });
      expect(login.status).toBe(401);
    });

    it('rejects wrong password', async () => {
      const res = await req
        .delete('/api/v1/users/me')
        .set(authHeader(token))
        .send({ password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    });

    it('requires authentication', async () => {
      const res = await req.delete('/api/v1/users/me').send({ password: 'anything' });
      expect(res.status).toBe(401);
    });
  });
});
