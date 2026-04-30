import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { startOfCurrentMonth, endOfCurrentMonth } from '@finanzapp/utils';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId!, isActive: true },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });

    const from = startOfCurrentMonth();
    const to = endOfCurrentMonth();

    const withSpend = await Promise.all(
      budgets.map(async (b: typeof budgets[number]) => {
        const agg = await prisma.transaction.aggregate({
          where: {
            userId: req.userId!,
            categoryId: b.categoryId,
            type: 'DEBIT',
            bookingDate: { gte: from, lte: to },
            ...(b.bankAccountId ? { bankAccountId: b.bankAccountId } : {}),
          },
          _sum: { amountCents: true },
        });
        const spentCents = Math.abs(Number(agg._sum.amountCents ?? 0));
        const limitCents = Number(b.limitCents);
        return {
          ...b,
          limitCents,
          spentCents,
          remainingCents: Math.max(0, limitCents - spentCents),
          progressPercent: Math.min(100, Math.round((spentCents / limitCents) * 100)),
        };
      }),
    );

    res.json({ data: withSpend });
  } catch (e) { next(e); }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      categoryId: z.string(),
      limitCents: z.number().int().positive(),
      period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
      startDate: z.string(),
      endDate: z.string().optional(),
      bankAccountId: z.string().optional(),
      alertThreshold: z.number().int().min(1).max(100).default(80),
    }).parse(req.body);

    const budget = await prisma.budget.create({
      data: {
        ...body,
        userId: req.userId!,
        limitCents: BigInt(body.limitCents),
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    res.status(201).json({ data: budget });
  } catch (e) { next(e); }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const budget = await prisma.budget.findUnique({ where: { id: req.params.id } });
    if (!budget) throw new NotFoundError('Budget');
    if (budget.userId !== req.userId) throw new ForbiddenError();

    const body = z.object({
      name: z.string().min(1).optional(),
      limitCents: z.number().int().positive().optional(),
      alertThreshold: z.number().int().min(1).max(100).optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);

    const updated = await prisma.budget.update({
      where: { id: req.params.id },
      data: { ...body, ...(body.limitCents ? { limitCents: BigInt(body.limitCents) } : {}) },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const budget = await prisma.budget.findUnique({ where: { id: req.params.id } });
    if (!budget) throw new NotFoundError('Budget');
    if (budget.userId !== req.userId) throw new ForbiddenError();
    await prisma.budget.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { next(e); }
});

export default router;
