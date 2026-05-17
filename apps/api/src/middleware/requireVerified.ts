import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth';
import { ForbiddenError } from '../utils/errors';

export async function requireVerified(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { isEmailVerified: true } });
  if (!user?.isEmailVerified) throw new ForbiddenError('E-Mail-Adresse muss zuerst bestätigt werden.');
  next();
}
