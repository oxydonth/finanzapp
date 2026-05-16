import { describe, it, expect, beforeAll } from 'vitest';
import { req, registerAndLogin, authHeader } from './helpers';

describe('/api/v1/categories', () => {
  let token: string;
  let catId: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;
  });

  describe('GET /', () => {
    it('returns system + user categories', async () => {
      const res = await req.get('/api/v1/categories').set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('requires authentication', async () => {
      const res = await req.get('/api/v1/categories');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /', () => {
    it('creates a custom category', async () => {
      const res = await req
        .post('/api/v1/categories')
        .set(authHeader(token))
        .send({ name: 'My Category', icon: '🛒', color: '#ff0000', isIncome: false });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('My Category');
      catId = res.body.data.id;
    });

    it('creates income category', async () => {
      const res = await req
        .post('/api/v1/categories')
        .set(authHeader(token))
        .send({ name: 'Freelance', isIncome: true });
      expect(res.status).toBe(201);
      expect(res.body.data.isIncome).toBe(true);
    });

    it('rejects empty name', async () => {
      const res = await req
        .post('/api/v1/categories')
        .set(authHeader(token))
        .send({ name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /:id', () => {
    it('updates name', async () => {
      const res = await req
        .patch(`/api/v1/categories/${catId}`)
        .set(authHeader(token))
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('returns 403 for another users category', async () => {
      const other = await registerAndLogin();
      const res = await req
        .patch(`/api/v1/categories/${catId}`)
        .set(authHeader(other.accessToken))
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes category', async () => {
      const create = await req
        .post('/api/v1/categories')
        .set(authHeader(token))
        .send({ name: 'To Delete' });
      const id = create.body.data.id;

      const del = await req.delete(`/api/v1/categories/${id}`).set(authHeader(token));
      expect(del.status).toBe(200);
    });

    it('returns 403 for another users category', async () => {
      const other = await registerAndLogin();
      const res = await req.delete(`/api/v1/categories/${catId}`).set(authHeader(other.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('GET /:id/rules', () => {
    it('returns empty rules for new category', async () => {
      const res = await req.get(`/api/v1/categories/${catId}/rules`).set(authHeader(token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /:id/rules', () => {
    it('creates a rule', async () => {
      const res = await req
        .post(`/api/v1/categories/${catId}/rules`)
        .set(authHeader(token))
        .send({ pattern: 'EDEKA', field: 'purpose', priority: 10 });
      expect(res.status).toBe(201);
      expect(res.body.data.pattern).toBe('EDEKA');
    });

    it('rejects invalid regex', async () => {
      const res = await req
        .post(`/api/v1/categories/${catId}/rules`)
        .set(authHeader(token))
        .send({ pattern: '[invalid(' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /:id/rules/:ruleId', () => {
    it('deletes a rule', async () => {
      const create = await req
        .post(`/api/v1/categories/${catId}/rules`)
        .set(authHeader(token))
        .send({ pattern: 'DELETE_ME' });
      const ruleId = create.body.data.id;

      const del = await req.delete(`/api/v1/categories/${catId}/rules/${ruleId}`).set(authHeader(token));
      expect(del.status).toBe(200);
    });
  });
});
