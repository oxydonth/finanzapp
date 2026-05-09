import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotFoundError, UnauthorizedError } from '../utils/errors';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true, firstName: true, lastName: true, currency: true, locale: true, isEmailVerified: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundError('User');
    res.json({ data: user });
  } catch (e) { next(e); }
});

router.patch('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      locale: z.string().optional(),
      currency: z.string().length(3).optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: body,
      select: { id: true, email: true, firstName: true, lastName: true, currency: true, locale: true, isEmailVerified: true, createdAt: true, updatedAt: true },
    });
    res.json({ data: user });
  } catch (e) { next(e); }
});

// Art. 15 & 20 DSGVO — Auskunft & Datenportabilität
router.get('/me/export', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        currency: true, locale: true, isEmailVerified: true,
        mfaEnabled: true, createdAt: true, updatedAt: true,
        bankConnections: {
          select: {
            id: true, bankCode: true, bankName: true,
            syncStatus: true, lastSyncAt: true, createdAt: true,
            accounts: {
              select: {
                id: true, iban: true, ibanMasked: true, bic: true,
                accountType: true, accountName: true, ownerName: true,
                currency: true, balanceCents: true, balanceDate: true,
                createdAt: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { bookingDate: 'desc' },
          select: {
            id: true, externalId: true, valueDate: true, bookingDate: true,
            amountCents: true, currency: true, type: true,
            creditorName: true, purpose: true, merchantName: true,
            isRecurring: true, note: true, tags: true,
            category: { select: { id: true, name: true } },
          },
        },
        budgets: {
          select: {
            id: true, name: true, limitCents: true, period: true,
            startDate: true, endDate: true, isActive: true, createdAt: true,
            category: { select: { id: true, name: true } },
          },
        },
        categories: {
          where: { isSystem: false },
          select: { id: true, name: true, icon: true, color: true, isIncome: true, createdAt: true },
        },
      },
    });

    if (!user) throw new NotFoundError('User');

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      legalBasis: 'Art. 15 & 20 DSGVO (Datenschutz-Grundverordnung)',
      data: {
        ...user,
        // Serialize BigInt fields
        bankConnections: user.bankConnections.map((conn) => ({
          ...conn,
          accounts: conn.accounts.map((acc) => ({
            ...acc,
            balanceCents: acc.balanceCents.toString(),
          })),
        })),
        transactions: user.transactions.map((t) => ({
          ...t,
          amountCents: t.amountCents.toString(),
        })),
        budgets: user.budgets.map((b) => ({
          ...b,
          limitCents: b.limitCents.toString(),
        })),
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="finanzapp-daten-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(exportData);
  } catch (e) { next(e); }
});

// Art. 17 DSGVO — Recht auf Löschung
router.delete('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { password } = z.object({ password: z.string().min(1) }).parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundError('User');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Falsches Passwort');

    // Soft-delete: mark deletedAt, clear PII — cascade deletes all related data
    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        deletedAt: new Date(),
        email: `deleted-${req.userId}@deleted.invalid`,
        firstName: 'Gelöscht',
        lastName: 'Gelöscht',
        passwordHash: '',
        refreshTokenHash: null,
        emailVerifyToken: null,
        passwordResetToken: null,
        totpSecret: null,
        mfaBackupCodes: [],
      },
    });

    // Hard-delete all financial data via cascade (bankConnections → accounts → transactions)
    await prisma.bankConnection.deleteMany({ where: { userId: req.userId! } });
    await prisma.budget.deleteMany({ where: { userId: req.userId! } });
    await prisma.category.deleteMany({ where: { userId: req.userId!, isSystem: false } });

    res.json({ data: { message: 'Konto und alle zugehörigen Daten wurden gelöscht.' } });
  } catch (e) { next(e); }
});

export default router;
