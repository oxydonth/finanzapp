import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
  signMfaToken, verifyMfaToken,
} from '../utils/jwt';

const USER_ID = 'user-test-123';

describe('signAccessToken / verify', () => {
  it('produces a valid JWT', () => {
    const token = signAccessToken(USER_ID);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('encodes userId as sub claim', () => {
    const token = signAccessToken(USER_ID);
    const payload = jwt.decode(token) as { sub: string };
    expect(payload.sub).toBe(USER_ID);
  });

  it('verifiable with JWT_SECRET env var', () => {
    const token = signAccessToken(USER_ID);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    expect(payload.sub).toBe(USER_ID);
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('produces a verifiable refresh token', () => {
    const token = signRefreshToken(USER_ID);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(USER_ID);
  });

  it('access token not valid as refresh token', () => {
    const accessToken = signAccessToken(USER_ID);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

describe('signMfaToken / verifyMfaToken', () => {
  it('creates token with purpose=mfa', () => {
    const token = signMfaToken(USER_ID);
    const payload = jwt.decode(token) as { sub: string; purpose: string };
    expect(payload.purpose).toBe('mfa');
    expect(payload.sub).toBe(USER_ID);
  });

  it('verifyMfaToken returns sub', () => {
    const token = signMfaToken(USER_ID);
    const payload = verifyMfaToken(token);
    expect(payload.sub).toBe(USER_ID);
  });

  it('rejects non-mfa token as mfa token', () => {
    const token = signAccessToken(USER_ID);
    expect(() => verifyMfaToken(token)).toThrow('Invalid token purpose');
  });
});
