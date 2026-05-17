import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { signAccessToken, signRefreshToken, signMfaToken, verifyRefreshToken } from '../utils/jwt';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { sendVerificationEmail, sendPasswordResetEmail } from './mail.service';

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, emailVerifyToken },
    select: { id: true, email: true, firstName: true, lastName: true, currency: true, locale: true, isEmailVerified: true, mfaEnabled: true, createdAt: true, updatedAt: true },
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
  });

  // Non-blocking — email failure must not fail registration
  sendVerificationEmail(email, firstName, emailVerifyToken).catch(console.error);

  return { user, accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) throw new UnauthorizedError('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid email or password');

  if (user.mfaEnabled) {
    return { requiresMfa: true as const, mfaToken: signMfaToken(user.id) };
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
  });

  const { passwordHash: _, refreshTokenHash: __, totpSecret: ___, mfaBackupCodes: ____, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

export async function completeMfaLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError();

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
  });

  const { passwordHash: _, refreshTokenHash: __, totpSecret: ___, mfaBackupCodes: ____, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
}

export async function refresh(token: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user?.refreshTokenHash) throw new UnauthorizedError();

  const valid = await bcrypt.compare(token, user.refreshTokenHash);
  if (!valid) throw new UnauthorizedError('Refresh token reuse detected');

  const accessToken = signAccessToken(user.id);
  const newRefresh = signRefreshToken(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(newRefresh, 8) },
  });

  return { accessToken, refreshToken: newRefresh };
}

export async function logout(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null },
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw new NotFoundError('Verification token');
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyToken: null },
  });
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  if (user.isEmailVerified) return; // already verified, silently succeed
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: userId }, data: { emailVerifyToken } });
  sendVerificationEmail(user.email, user.firstName, emailVerifyToken).catch(console.error);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed silently — prevents email enumeration
  if (!user || user.deletedAt) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  sendPasswordResetEmail(user.email, user.firstName, token).catch(console.error);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
      deletedAt: null,
    },
  });
  if (!user) throw new UnauthorizedError('Invalid or expired reset token');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      refreshTokenHash: null, // invalidate all sessions
    },
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, currency: true, locale: true, isEmailVerified: true, mfaEnabled: true, createdAt: true, updatedAt: true },
  });
  if (!user) throw new NotFoundError('User');
  return user;
}
