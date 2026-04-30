import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.register(body.email, body.password, body.firstName, body.lastName);
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await authService.logout(req.userId!);
    res.json({ data: { message: 'Logged out' } });
  } catch (e) { next(e); }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await authService.getProfile(req.userId!);
    res.json({ data: user });
  } catch (e) { next(e); }
});

export default router;
