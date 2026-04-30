import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';

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

export default router;
