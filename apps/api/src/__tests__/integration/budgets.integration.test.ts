import { describe, it, expect, beforeAll } from 'vitest';
import { req, registerAndLogin, authHeader, createCategory } from './helpers';

describe('/api/v1/budgets', () => {
  let token: string;
  let categoryId: string;
  let budgetId: string;

  beforeAll(async () => {
    const session = await registerAndLogin();
    token = session.accessToken;
    const cat = await createCategory(token, { name: 'Groceries Budget Cat' });
    categoryId = cat.id;
  });

  describe('POST /', () => {
    it('creates a budget', async () => {
      const res = await req
        .post('/api/v1/budgets')
        .set(authHeader(token))
        .send({
          name: 'Monthly Groceries',
          categoryId,
          limitCents: 30000,
          period: 'MONTHLY',
          startDate: '2025-01-01',
          alertThreshold: 80,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Monthly Groceries');
      budgetId = res.body.data.id;
    });

    it('requires categoryId', async () => {
      const res = await req
        .post('/api/v1/budgets')
        .set(authHeader(token))
        .send({ name: 'Bad', limitCents: 100, period: 'MONTHLY', startDate: '2025-01-01' });
      expect(res.status).toBe(400);
    });

    it('requires positive limitCents', async () => {
      const res = await req
        .post('/api/v1/budgets')
        .set(authHeader(token))
        .send({ name: 'Bad', categoryId, limitCents: 0, period: 'MONTHLY', startDate: '2025-01-01' });
      expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
      const res = await req.post('/api/v1/budgets').send({ name: 'x', categoryId, limitCents: 100, period: 'MONTHLY', startDate: '2025-01-01' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /', () => {
    it('returns budgets with spentCents', async () => {
      const res = await req.get('/api/v1/budgets').set(authHeader(token));
      expect(res.status).toBe(200);
      const found = res.body.data.find((b: { id: string }) => b.id === budgetId);
      expect(found).toBeTruthy();
      expect(typeof found.spentCents).toBe('number');
      expect(typeof found.progressPercent).toBe('number');
    });

    it('does not return other users budgets', async () => {
      const other = await registerAndLogin();
      const res = await req.get('/api/v1/budgets').set(authHeader(other.accessToken));
      expect(res.body.data.every((b: { id: string }) => b.id !== budgetId)).toBe(true);
    });
  });

  describe('PATCH /:id', () => {
    it('updates limitCents', async () => {
      const res = await req
        .patch(`/api/v1/budgets/${budgetId}`)
        .set(authHeader(token))
        .send({ limitCents: 50000 });
      expect(res.status).toBe(200);
    });

    it('updates name', async () => {
      const res = await req
        .patch(`/api/v1/budgets/${budgetId}`)
        .set(authHeader(token))
        .send({ name: 'Renamed Budget' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed Budget');
    });

    it('returns 403 for another users budget', async () => {
      const other = await registerAndLogin();
      const res = await req
        .patch(`/api/v1/budgets/${budgetId}`)
        .set(authHeader(other.accessToken))
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /:id', () => {
    it('deletes budget', async () => {
      const create = await req
        .post('/api/v1/budgets')
        .set(authHeader(token))
        .send({ name: 'To Delete', categoryId, limitCents: 1000, period: 'MONTHLY', startDate: '2025-01-01' });
      const id = create.body.data.id;

      const del = await req.delete(`/api/v1/budgets/${id}`).set(authHeader(token));
      expect(del.status).toBe(200);

      const list = await req.get('/api/v1/budgets').set(authHeader(token));
      expect(list.body.data.every((b: { id: string }) => b.id !== id)).toBe(true);
    });

    it('returns 403 for another users budget', async () => {
      const other = await registerAndLogin();
      const res = await req.delete(`/api/v1/budgets/${budgetId}`).set(authHeader(other.accessToken));
      expect(res.status).toBe(403);
    });
  });
});
