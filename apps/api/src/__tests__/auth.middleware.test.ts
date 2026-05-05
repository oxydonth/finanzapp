import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { signAccessToken, signRefreshToken } from '../utils/jwt';

const USER_ID = 'auth-middleware-test-user';

function makeMocks(authorization?: string) {
  const req = {
    headers: authorization ? { authorization } : {},
  } as AuthRequest;
  const res = {} as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('calls next() with valid Bearer token', () => {
    const token = signAccessToken(USER_ID);
    const { req, res, next } = makeMocks(`Bearer ${token}`);
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(USER_ID);
  });

  it('sets userId on request', () => {
    const token = signAccessToken(USER_ID);
    const { req, res, next } = makeMocks(`Bearer ${token}`);
    authenticate(req, res, next);
    expect(req.userId).toBe(USER_ID);
  });

  it('throws UnauthorizedError when no Authorization header', () => {
    const { req, res, next } = makeMocks();
    expect(() => authenticate(req, res, next)).toThrow();
  });

  it('throws when header missing Bearer prefix', () => {
    const token = signAccessToken(USER_ID);
    const { req, res, next } = makeMocks(token);
    expect(() => authenticate(req, res, next)).toThrow();
  });

  it('throws on expired / invalid token', () => {
    const { req, res, next } = makeMocks('Bearer invalid.token.here');
    expect(() => authenticate(req, res, next)).toThrow();
  });

  it('throws on refresh token used as access token', () => {
    const refreshToken = signRefreshToken(USER_ID);
    const { req, res, next } = makeMocks(`Bearer ${refreshToken}`);
    // refresh token signed with different secret — should throw
    expect(() => authenticate(req, res, next)).toThrow();
  });
});
