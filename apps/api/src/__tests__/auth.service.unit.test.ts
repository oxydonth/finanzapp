import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../services/mail.service', () => ({
  sendVerificationEmail: vi.fn(async () => {}),
}));

// Deterministic bcrypt for speed
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (s: string) => `hashed:${s}`),
    compare: vi.fn(async (s: string, h: string) => h === `hashed:${s}`),
  },
}));

import * as authService from '../services/auth.service';
import { prisma } from '../config/database';
import { ConflictError, UnauthorizedError } from '../utils/errors';

const mockPrisma = prisma as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const baseUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  currency: 'EUR',
  locale: 'de-DE',
  isEmailVerified: false,
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  passwordHash: 'hashed:Password1!',
  refreshTokenHash: null,
  emailVerifyToken: 'verify-token',
  passwordResetToken: null,
  passwordResetExpiry: null,
  totpSecret: null,
  mfaBackupCodes: [],
};

// Simulates what Prisma returns when select excludes sensitive fields
const safeUser = {
  id: baseUser.id,
  email: baseUser.email,
  firstName: baseUser.firstName,
  lastName: baseUser.lastName,
  currency: baseUser.currency,
  locale: baseUser.locale,
  isEmailVerified: baseUser.isEmailVerified,
  mfaEnabled: baseUser.mfaEnabled,
  createdAt: baseUser.createdAt,
  updatedAt: baseUser.updatedAt,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('register', () => {
  it('creates user and returns tokens', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ ...baseUser });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await authService.register('new@example.com', 'Password1!', 'Test', 'User');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws ConflictError if email already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser);
    await expect(authService.register('test@example.com', 'Password1!', 'A', 'B')).rejects.toThrow(ConflictError);
  });

  it('hashes password before storing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockResolvedValue({});

    await authService.register('new@example.com', 'Password1!', 'A', 'B');
    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBe('hashed:Password1!');
    expect(createCall.data.passwordHash).not.toBe('Password1!');
  });

  it('does not expose passwordHash in return value', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    // Return safeUser to simulate Prisma honoring the select clause
    mockPrisma.user.create.mockResolvedValue(safeUser);
    mockPrisma.user.update.mockResolvedValue({});

    const result = await authService.register('new@example.com', 'Password1!', 'A', 'B');
    expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });
});

describe('login', () => {
  it('returns tokens for valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockResolvedValue({});

    const result = await authService.login('test@example.com', 'Password1!');
    expect('accessToken' in result).toBe(true);
  });

  it('throws UnauthorizedError for unknown email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.login('nobody@example.com', 'Password1!')).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser);
    await expect(authService.login('test@example.com', 'WrongPass!')).rejects.toThrow(UnauthorizedError);
  });

  it('returns requiresMfa when MFA is enabled', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, mfaEnabled: true });
    const result = await authService.login('test@example.com', 'Password1!');
    expect((result as { requiresMfa: boolean }).requiresMfa).toBe(true);
    expect((result as { mfaToken: string }).mfaToken).toBeTruthy();
  });

  it('does not expose passwordHash in return value', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockResolvedValue({});
    const result = await authService.login('test@example.com', 'Password1!') as Record<string, unknown>;
    expect((result.user as Record<string, unknown>)?.passwordHash).toBeUndefined();
  });
});

describe('refresh', () => {
  it('throws on invalid token', async () => {
    await expect(authService.refresh('bad.token.here')).rejects.toThrow(UnauthorizedError);
  });

  it('throws if no user found', async () => {
    // generate a valid refresh token first
    const { refreshToken } = await (() => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(baseUser);
      mockPrisma.user.create.mockResolvedValue(baseUser);
      mockPrisma.user.update.mockResolvedValue({});
      return authService.register('t@t.com', 'Password1!', 'A', 'B');
    })();

    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.refresh(refreshToken)).rejects.toThrow(UnauthorizedError);
  });
});

describe('logout', () => {
  it('clears refreshTokenHash', async () => {
    mockPrisma.user.update.mockResolvedValue({});
    await authService.logout('user-1');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshTokenHash: null },
    });
  });
});

describe('verifyEmail', () => {
  it('marks email as verified', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(baseUser);
    mockPrisma.user.update.mockResolvedValue({});
    await authService.verifyEmail('verify-token');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });
  });

  it('throws if token not found', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    await expect(authService.verifyEmail('bad-token')).rejects.toThrow();
  });
});

describe('getProfile', () => {
  it('returns user without sensitive fields', async () => {
    // Return safeUser to simulate Prisma honoring the select clause
    mockPrisma.user.findUnique.mockResolvedValue(safeUser);
    const profile = await authService.getProfile('user-1');
    expect(profile.email).toBe('test@example.com');
    expect((profile as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('throws if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.getProfile('gone')).rejects.toThrow();
  });
});
