import { describe, it, expect } from 'vitest';
import {
  AppError, NotFoundError, UnauthorizedError,
  ForbiddenError, ValidationError, ConflictError,
} from '../utils/errors';

describe('AppError', () => {
  it('sets message, statusCode, code', () => {
    const err = new AppError('something failed', 500, 'INTERNAL');
    expect(err.message).toBe('something failed');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL');
    expect(err.name).toBe('AppError');
  });

  it('defaults statusCode to 500', () => {
    const err = new AppError('oops');
    expect(err.statusCode).toBe(500);
  });

  it('is instance of Error', () => {
    expect(new AppError('x')).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('formats message with resource name', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('UnauthorizedError', () => {
  it('defaults to "Unauthorized"', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('accepts custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('returns 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('ValidationError', () => {
  it('returns 422', () => {
    const err = new ValidationError('field required');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('field required');
  });
});

describe('ConflictError', () => {
  it('returns 409', () => {
    const err = new ConflictError('already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('already exists');
  });
});
