import crypto from 'crypto';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { UnauthorizedError, NotFoundError } from '../utils/errors';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ISSUER = 'Finanzapp';
const BACKUP_CODE_COUNT = 10;

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function hotpToken(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

function totpGenerate(secret: string): string {
  return hotpToken(base32Decode(secret), Math.floor(Date.now() / 1000 / 30));
}

function totpVerify(secret: string, token: string): boolean {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -1; i <= 1; i++) {
    if (hotpToken(key, counter + i) === token) return true;
  }
  return false;
}

function totpUri(email: string, secret: string): string {
  const label = encodeURIComponent(`${ISSUER}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
}

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  );
}

export async function setupMfa(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, mfaEnabled: true } });
  if (!user) throw new NotFoundError('User');

  const secret = base32Encode(crypto.randomBytes(20));
  const qrCodeDataUrl = await QRCode.toDataURL(totpUri(user.email, secret));

  await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });

  return { secret, qrCodeDataUrl };
}

export async function enableMfa(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, mfaEnabled: true } });
  if (!user) throw new NotFoundError('User');
  if (user.mfaEnabled) throw new UnauthorizedError('MFA already enabled');
  if (!user.totpSecret) throw new UnauthorizedError('MFA setup not started');

  if (!totpVerify(user.totpSecret, code)) throw new UnauthorizedError('Invalid authenticator code');

  const plainCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 12)));

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaBackupCodes: hashedCodes } });

  return { backupCodes: plainCodes };
}

export async function disableMfa(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, mfaEnabled: true, mfaBackupCodes: true } });
  if (!user) throw new NotFoundError('User');
  if (!user.mfaEnabled) throw new UnauthorizedError('MFA not enabled');

  const valid = await verifyCode(user.totpSecret, user.mfaBackupCodes, code);
  if (!valid.ok) throw new UnauthorizedError('Invalid authenticator code');

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, totpSecret: null, mfaBackupCodes: [] } });
}

export async function verifyMfaLogin(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, mfaEnabled: true, mfaBackupCodes: true } });
  if (!user) throw new NotFoundError('User');

  const result = await verifyCode(user.totpSecret, user.mfaBackupCodes, code);
  if (!result.ok) throw new UnauthorizedError('Invalid authenticator code');

  if (result.usedBackupIndex !== undefined) {
    const updated = user.mfaBackupCodes.filter((_: string, i: number) => i !== result.usedBackupIndex);
    await prisma.user.update({ where: { id: userId }, data: { mfaBackupCodes: updated } });
  }
}

async function verifyCode(
  totpSecret: string | null,
  backupCodes: string[],
  code: string,
): Promise<{ ok: boolean; usedBackupIndex?: number }> {
  const normalized = code.replace(/\s/g, '');
  if (totpSecret && totpVerify(totpSecret, normalized)) return { ok: true };
  const upper = normalized.toUpperCase();
  for (let i = 0; i < backupCodes.length; i++) {
    if (await bcrypt.compare(upper, backupCodes[i])) return { ok: true, usedBackupIndex: i };
  }
  return { ok: false };
}

export { totpGenerate };
