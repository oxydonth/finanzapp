import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { userId: req.userId!, isHidden: false },
      include: { bankConnection: { select: { bankName: true, bankCode: true, syncStatus: true, lastSyncAt: true } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ data: accounts });
  } catch (e) { next(e); }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: req.params.id },
      include: { bankConnection: { select: { bankName: true, bankCode: true, syncStatus: true, lastSyncAt: true } } },
    });
    if (!account) throw new NotFoundError('BankAccount');
    if (account.userId !== req.userId) throw new ForbiddenError();
    res.json({ data: account });
  } catch (e) { next(e); }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const account = await prisma.bankAccount.findUnique({ where: { id: req.params.id } });
    if (!account) throw new NotFoundError('BankAccount');
    if (account.userId !== req.userId) throw new ForbiddenError();

    const body = z.object({
      accountName: z.string().min(1).optional(),
      isHidden: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }).parse(req.body);

    const updated = await prisma.bankAccount.update({ where: { id: req.params.id }, data: body });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

export default router;
