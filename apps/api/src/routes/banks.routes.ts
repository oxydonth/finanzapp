import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import * as fintsService from '../services/fints.service';
import { getAllBanks, searchBanks, findBankByBlz } from '@finanzapp/config';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json({ data: getAllBanks() });
  } catch (e) { next(e); }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q } = z.object({ q: z.string().min(1) }).parse(req.query);
    res.json({ data: searchBanks(q) });
  } catch (e) { next(e); }
});

router.get('/:blz', async (req, res, next) => {
  try {
    const bank = findBankByBlz(req.params.blz);
    if (!bank) throw new NotFoundError('Bank');
    res.json({ data: bank });
  } catch (e) { next(e); }
});

// ── Connections ───────────────────────────────────────────────────────────────

router.post('/connections', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      bankCode: z.string().min(8).max(8),
      loginName: z.string().min(1),
      pin: z.string().min(4),
    }).parse(req.body);

    const result = await fintsService.initiateConnection(
      req.userId!,
      body.bankCode,
      body.loginName,
      body.pin,
    );
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

router.get('/connections', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const connections = await prisma.bankConnection.findMany({
      where: { userId: req.userId!, isActive: true },
      include: { accounts: { where: { isHidden: false } } },
      orderBy: { createdAt: 'asc' },
    });
    const safe = connections.map((conn: any) => {
      const { pinEncrypted: _p, pinIv: _iv, loginNameEncrypted: _ln, ...c } = conn as typeof conn & { pinEncrypted: string; pinIv: string; loginNameEncrypted: string };
      void _p; void _iv; void _ln;
      return c;
    });
    res.json({ data: safe });
  } catch (e) { next(e); }
});

router.get('/connections/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conn = await prisma.bankConnection.findUnique({
      where: { id: req.params.id },
      include: { accounts: true },
    });
    if (!conn) throw new NotFoundError('BankConnection');
    if (conn.userId !== req.userId) throw new ForbiddenError();
    const { pinEncrypted: _p, pinIv: _iv, loginNameEncrypted: _ln, ...safe } = conn;
    res.json({ data: safe });
  } catch (e) { next(e); }
});

router.post('/connections/:id/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conn = await prisma.bankConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw new NotFoundError('BankConnection');
    if (conn.userId !== req.userId) throw new ForbiddenError();
    fintsService.syncTransactions(req.params.id).catch(console.error);
    res.json({ data: { message: 'Sync started' } });
  } catch (e) { next(e); }
});

router.post('/connections/:id/tan', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { sessionId, tan } = z.object({ sessionId: z.string(), tan: z.string() }).parse(req.body);
    const result = await fintsService.submitTan(req.userId!, sessionId, tan);
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.delete('/connections/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conn = await prisma.bankConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw new NotFoundError('BankConnection');
    if (conn.userId !== req.userId) throw new ForbiddenError();
    await prisma.bankConnection.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ data: { message: 'Disconnected' } });
  } catch (e) { next(e); }
});

export default router;
