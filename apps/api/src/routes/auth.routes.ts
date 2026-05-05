import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import * as mfaService from '../services/mfa.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { verifyMfaToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

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

router.post('/mfa/complete', async (req, res, next) => {
  try {
    const { mfaToken, code } = z.object({ mfaToken: z.string(), code: z.string().min(1) }).parse(req.body);
    let payload: { sub: string };
    try {
      payload = verifyMfaToken(mfaToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired MFA token');
    }
    await mfaService.verifyMfaLogin(payload.sub, code);
    const result = await authService.completeMfaLogin(payload.sub);
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.post('/mfa/setup', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await mfaService.setupMfa(req.userId!);
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.post('/mfa/enable', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
    const result = await mfaService.enableMfa(req.userId!, code);
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.post('/mfa/disable', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse(req.body);
    await mfaService.disableMfa(req.userId!, code);
    res.json({ data: { message: 'MFA disabled' } });
  } catch (e) { next(e); }
});

export default router;
