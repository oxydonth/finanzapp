import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorHandler } from '../middleware/errorHandler';
import { AppError, NotFoundError, UnauthorizedError } from '../utils/errors';

function makeMocks() {
  const req = {} as Request;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, status, json, next };
}

describe('errorHandler', () => {
  it('handles AppError with correct status and shape', () => {
    const { req, res, status, json, next } = makeMocks();
    const err = new NotFoundError('Transaction');
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'Transaction not found',
      statusCode: 404,
    });
  });

  it('handles UnauthorizedError', () => {
    const { req, res, status, json, next } = makeMocks();
    errorHandler(new UnauthorizedError('Token expired'), req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'UNAUTHORIZED' }));
  });

  it('handles ZodError with 422 and field details', () => {
    const { req, res, status, json, next } = makeMocks();
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'not-email' });
    const zodErr = (result as { error: ZodError }).error;

    errorHandler(zodErr, req, res, next);
    expect(status).toHaveBeenCalledWith(422);
    const call = json.mock.calls[0][0];
    expect(call.error).toBe('VALIDATION_ERROR');
    expect(call.details).toBeDefined();
  });

  it('handles generic Error with 500', () => {
    const { req, res, status, json, next } = makeMocks();
    errorHandler(new Error('something exploded'), req, res, next);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'INTERNAL_ERROR', statusCode: 500 }));
  });

  it('uses error code from AppError', () => {
    const { req, res, status, json, next } = makeMocks();
    errorHandler(new AppError('custom', 418, 'TEAPOT'), req, res, next);
    expect(status).toHaveBeenCalledWith(418);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'TEAPOT' }));
  });
});
