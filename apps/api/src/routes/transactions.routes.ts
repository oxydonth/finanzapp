import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

const transactionWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      accountId: z.string().optional(),
      categoryId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      type: z.enum(['CREDIT', 'DEBIT']).optional(),
      search: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    }).parse(req.query);

    const where = {
      userId: req.userId!,
      ...(query.accountId && { bankAccountId: query.accountId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.type && { type: query.type as 'CREDIT' | 'DEBIT' }),
      ...(query.from || query.to
        ? {
            bookingDate: {
              ...(query.from && { gte: new Date(query.from) }),
              ...(query.to && { lte: new Date(query.to) }),
            },
          }
        : {}),
      ...(query.search && {
        OR: [
          { purpose: { contains: query.search, mode: 'insensitive' as const } },
          { creditorName: { contains: query.search, mode: 'insensitive' as const } },
          { merchantName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: { category: { select: { id: true, name: true, icon: true, color: true } } },
        orderBy: { bookingDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    res.json({
      data: transactions,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    });
  } catch (e) { next(e); }
});

router.get('/stats/monthly', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { months = '6' } = req.query as { months?: string };
    const from = new Date();
    from.setMonth(from.getMonth() - parseInt(months));

    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId!, bookingDate: { gte: from } },
      select: { bookingDate: true, amountCents: true, type: true },
    });

    const monthly: Record<string, { income: number; expenses: number }> = {};
    for (const tx of transactions) {
      const key = `${tx.bookingDate.getFullYear()}-${String(tx.bookingDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { income: 0, expenses: 0 };
      const cents = Number(tx.amountCents);
      if (tx.type === 'CREDIT') monthly[key].income += cents;
      else monthly[key].expenses += Math.abs(cents);
    }

    res.json({ data: Object.entries(monthly).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month)) });
  } catch (e) { next(e); }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { category: true, bankAccount: { select: { accountName: true, ibanMasked: true } } },
    });
    if (!tx) throw new NotFoundError('Transaction');
    if (tx.userId !== req.userId) throw new ForbiddenError();
    res.json({ data: tx });
  } catch (e) { next(e); }
});

router.patch('/:id', authenticate, transactionWriteLimiter, async (req: AuthRequest, res, next) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!tx) throw new NotFoundError('Transaction');
    if (tx.userId !== req.userId) throw new ForbiddenError();

    const body = z.object({
      categoryId: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      merchantName: z.string().nullable().optional(),
      isReviewed: z.boolean().optional(),
    }).parse(req.body);

    const updated = await prisma.transaction.update({ where: { id: req.params.id }, data: body });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

export default router;
