import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma and QRCode before importing the service
vi.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,MOCK'),
  },
}));

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcryptjs')>();
  return {
    default: {
      ...actual.default,
      hash: vi.fn(async (s: string) => `hashed:${s}`),
      compare: vi.fn(async (s: string, h: string) => h === `hashed:${s}` || h === `hashed:${s.toUpperCase()}`),
    },
  };
});

import { totpGenerate, setupMfa, enableMfa, disableMfa, verifyMfaLogin } from '../services/mfa.service';
import { prisma } from '../config/database';

const mockPrisma = prisma as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('totpGenerate', () => {
  it('returns a 6-digit string', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = totpGenerate(secret);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('generates same code for same time window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    const secret = 'JBSWY3DPEHPK3PXP';
    const code1 = totpGenerate(secret);
    const code2 = totpGenerate(secret);
    expect(code1).toBe(code2);
    vi.useRealTimers();
  });

  it('generates different code for different time window', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    const code1 = totpGenerate(secret);
    vi.setSystemTime(new Date('2025-01-01T12:01:00Z'));
    const code2 = totpGenerate(secret);
    // Different 30s windows — codes should differ (probability 1/1,000,000 of collision)
    expect(code1).not.toBe(code2);
    vi.useRealTimers();
  });
});

describe('setupMfa', () => {
  beforeEach(() => {
    mockPrisma.user.update.mockResolvedValue({});
  });

  it('returns secret and qrCodeDataUrl', async () => {
    const result = await setupMfa('user-1');
    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    expect(result.qrCodeDataUrl).toContain('data:image');
  });

  it('stores totpSecret via prisma', async () => {
    await setupMfa('user-1');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
  });
});

describe('enableMfa', () => {
  it('throws if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(enableMfa('u1', '123456')).rejects.toThrow('User not found');
  });

  it('throws if MFA already enabled', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: 'SECRET', mfaEnabled: true });
    await expect(enableMfa('u1', '123456')).rejects.toThrow('MFA already enabled');
  });

  it('throws if setup not started', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: null, mfaEnabled: false });
    await expect(enableMfa('u1', '123456')).rejects.toThrow('MFA setup not started');
  });

  it('returns backup codes when code is valid', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    const secret = 'JBSWY3DPEHPK3PXP';
    const validCode = totpGenerate(secret);
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: secret, mfaEnabled: false });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await enableMfa('u1', validCode);
    expect(result.backupCodes).toHaveLength(10);
    expect(result.backupCodes[0]).toMatch(/^[A-Z0-9]{8}$/);
    vi.useRealTimers();
  });

  it('throws on wrong code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: 'JBSWY3DPEHPK3PXP', mfaEnabled: false });
    await expect(enableMfa('u1', '000000')).rejects.toThrow('Invalid authenticator code');
  });
});

describe('disableMfa', () => {
  it('throws if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(disableMfa('u1', '123456')).rejects.toThrow('User not found');
  });

  it('throws if MFA not enabled', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: null, mfaEnabled: false, mfaBackupCodes: [] });
    await expect(disableMfa('u1', '123456')).rejects.toThrow('MFA not enabled');
  });

  it('disables with valid TOTP code', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = totpGenerate(secret);
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: secret, mfaEnabled: true, mfaBackupCodes: [] });
    mockPrisma.user.update.mockResolvedValue({});

    await expect(disableMfa('u1', code)).resolves.toBeUndefined();
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mfaEnabled: false, totpSecret: null, mfaBackupCodes: [] } }),
    );
    vi.useRealTimers();
  });
});

describe('verifyMfaLogin', () => {
  it('throws if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(verifyMfaLogin('u1', '123456')).rejects.toThrow('User not found');
  });

  it('verifies valid TOTP code', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = totpGenerate(secret);
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: secret, mfaEnabled: true, mfaBackupCodes: [] });

    await expect(verifyMfaLogin('u1', code)).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it('throws on invalid code', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ totpSecret: 'JBSWY3DPEHPK3PXP', mfaEnabled: true, mfaBackupCodes: [] });
    await expect(verifyMfaLogin('u1', '000000')).rejects.toThrow('Invalid authenticator code');
  });

  it('accepts backup code and removes it', async () => {
    const backupCode = 'ABCD1234';
    mockPrisma.user.findUnique.mockResolvedValue({
      totpSecret: null,
      mfaEnabled: true,
      mfaBackupCodes: [`hashed:${backupCode}`],
    });
    mockPrisma.user.update.mockResolvedValue({});

    await verifyMfaLogin('u1', backupCode);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mfaBackupCodes: [] } }),
    );
  });
});
