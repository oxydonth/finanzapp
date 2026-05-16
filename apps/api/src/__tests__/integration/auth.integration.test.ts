import { describe, it, expect } from 'vitest';
import { req, uniqueEmail, registerAndLogin, authHeader } from './helpers';

describe('POST /api/v1/auth/register', () => {
  it('creates user and returns tokens', async () => {
    const email = uniqueEmail('reg');
    const res = await req
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password1!', firstName: 'Max', lastName: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    const email = uniqueEmail('dup');
    await req.post('/api/v1/auth/register').send({ email, password: 'Password1!', firstName: 'A', lastName: 'B' });
    const res = await req.post('/api/v1/auth/register').send({ email, password: 'Password1!', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(409);
  });

  it('rejects short password', async () => {
    const res = await req
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password: 'short', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await req
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'Password1!', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const { email, password } = await registerAndLogin();
    const res = await req.post('/api/v1/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const { email } = await registerAndLogin();
    const res = await req.post('/api/v1/auth/login').send({ email, password: 'WrongPass!' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await req.post('/api/v1/auth/login').send({ email: 'nobody@nowhere.test', password: 'Password1!' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates tokens', async () => {
    const { refreshToken } = await registerAndLogin();
    const res = await req.post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('rejects invalid refresh token', async () => {
    const res = await req.post('/api/v1/auth/refresh').send({ refreshToken: 'bad.token.here' });
    expect(res.status).toBe(401);
  });

  it('rejects reused refresh token', async () => {
    const { refreshToken } = await registerAndLogin();
    await req.post('/api/v1/auth/refresh').send({ refreshToken });
    const res = await req.post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears refresh token', async () => {
    const { accessToken, refreshToken } = await registerAndLogin();
    const logout = await req.post('/api/v1/auth/logout').set(authHeader(accessToken));
    expect(logout.status).toBe(200);

    const refresh = await req.post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);
  });

  it('requires authentication', async () => {
    const res = await req.post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns user profile', async () => {
    const { accessToken, email } = await registerAndLogin();
    const res = await req.get('/api/v1/auth/me').set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('requires authentication', async () => {
    const res = await req.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
