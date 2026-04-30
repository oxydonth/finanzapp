import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cats = await prisma.category.findMany({
      where: { OR: [{ userId: req.userId! }, { isSystem: true }] },
      include: { children: true },
      orderBy: [{ isSystem: 'desc' }, { sortOrder: 'asc' }],
    });
    res.json({ data: cats });
  } catch (e) { next(e); }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      color: z.string().optional(),
      parentId: z.string().optional(),
      isIncome: z.boolean().default(false),
    }).parse(req.body);

    const cat = await prisma.category.create({
      data: { ...body, userId: req.userId! },
    });
    res.status(201).json({ data: cat });
  } catch (e) { next(e); }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!cat) throw new NotFoundError('Category');
    if (cat.userId !== req.userId) throw new ForbiddenError();

    const body = z.object({
      name: z.string().min(1).optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    }).parse(req.body);

    const updated = await prisma.category.update({ where: { id: req.params.id }, data: body });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!cat) throw new NotFoundError('Category');
    if (cat.userId !== req.userId || cat.isSystem) throw new ForbiddenError();
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { next(e); }
});

export default router;
