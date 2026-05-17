import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import * as fintsService from '../services/fints.service';
import * as paypalService from '../services/paypal.service';
import * as wiseService from '../services/wise.service';
import * as revolutService from '../services/revolut.service';
import * as gcService from '../services/gocardless.service';
import * as seService from '../services/saltedge.service';
import { getAllBanks, searchBanks, findBankByBlz } from '@finanzapp/config';
import { ConnectorType } from '@finanzapp/types';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { env } from '../config/env';

const router = Router();

// ── Bank registry ─────────────────────────────────────────────────────────────

router.get('/', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.json({ data: getAllBanks() });
  } catch (e) { next(e); }
});

router.get('/search', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    const { q } = z.object({ q: z.string().min(1) }).parse(req.query);
    res.json({ data: searchBanks(q) });
  } catch (e) { next(e); }
});

// ── Connections (must be before /:blz) ────────────────────────────────────────

router.post('/connections', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      bankCode: z.string().min(8).max(8),
      loginName: z.string().min(1),
      pin: z.string().min(4),
    }).parse(req.body);
    const result = await fintsService.initiateConnection(req.userId!, body.bankCode, body.loginName, body.pin);
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
    const safe = connections.map(({ pinEncrypted: _p, pinIv: _iv, loginNameEncrypted: _ln, ...c }) => {
      void _p; void _iv; void _ln; return c;
    });
    res.json({ data: safe });
  } catch (e) { next(e); }
});

router.get('/connections/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conn = await prisma.bankConnection.findUnique({ where: { id: req.params.id }, include: { accounts: true } });
    if (!conn) throw new NotFoundError('BankConnection');
    if (conn.userId !== req.userId) throw new ForbiddenError();
    const { pinEncrypted: _p, pinIv: _iv, loginNameEncrypted: _ln, ...safe } = conn;
    void _p; void _iv; void _ln;
    res.json({ data: safe });
  } catch (e) { next(e); }
});

router.post('/connections/:id/sync', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const conn = await prisma.bankConnection.findUnique({ where: { id: req.params.id } });
    if (!conn) throw new NotFoundError('BankConnection');
    if (conn.userId !== req.userId) throw new ForbiddenError();

    if (conn.connectorType === ConnectorType.PAYPAL) {
      paypalService.syncTransactions(req.params.id).catch(console.error);
    } else if (conn.connectorType === ConnectorType.WISE) {
      wiseService.syncTransactions(req.params.id).catch(console.error);
    } else if (conn.connectorType === ConnectorType.REVOLUT) {
      revolutService.syncTransactions(req.params.id).catch(console.error);
    } else if (conn.connectorType === ConnectorType.GOCARDLESS) {
      gcService.syncTransactions(req.params.id).catch(console.error);
    } else if (conn.connectorType === ConnectorType.SALTEDGE) {
      seService.syncTransactions(req.params.id).catch(console.error);
    } else {
      fintsService.syncTransactions(req.params.id).catch(console.error);
    }
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
    await prisma.bankConnection.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ data: { message: 'Disconnected' } });
  } catch (e) { next(e); }
});

// ── PayPal OAuth ──────────────────────────────────────────────────────────────

router.get('/paypal/auth-url', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const authUrl = paypalService.getAuthUrl(req.userId!);
    res.json({ data: { authUrl, configured: true } });
  } catch (e) { next(e); }
});

router.get('/paypal/callback', async (req, res, next) => {
  const frontendBase = env.CORS_ORIGINS[0] ?? 'http://localhost:3001';
  try {
    const { code, state } = z.object({ code: z.string(), state: z.string() }).parse(req.query);
    await paypalService.handleCallback(code, state);
    res.redirect(`${frontendBase}/banks/connect?paypal=connected`);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : 'unknown_error';
    res.redirect(`${frontendBase}/banks/connect?paypal=error&msg=${msg}`);
    void next;
  }
});

// ── Wise OAuth ────────────────────────────────────────────────────────────────

router.get('/wise/auth-url', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const authUrl = wiseService.getAuthUrl(req.userId!);
    res.json({ data: { authUrl, configured: true } });
  } catch (e) { next(e); }
});

router.get('/wise/callback', async (req, res, next) => {
  const frontendBase = env.CORS_ORIGINS[0] ?? 'http://localhost:3001';
  try {
    const { code, state } = z.object({ code: z.string(), state: z.string() }).parse(req.query);
    await wiseService.handleCallback(code, state);
    res.redirect(`${frontendBase}/banks/connect?wise=connected`);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : 'unknown_error';
    res.redirect(`${frontendBase}/banks/connect?wise=error&msg=${msg}`);
    void next;
  }
});

// ── Revolut OAuth ─────────────────────────────────────────────────────────────

router.get('/revolut/auth-url', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const authUrl = revolutService.getAuthUrl(req.userId!);
    res.json({ data: { authUrl, configured: true } });
  } catch (e) { next(e); }
});

router.get('/revolut/callback', async (req, res, next) => {
  const frontendBase = env.CORS_ORIGINS[0] ?? 'http://localhost:3001';
  try {
    const { code, state } = z.object({ code: z.string(), state: z.string() }).parse(req.query);
    await revolutService.handleCallback(code, state);
    res.redirect(`${frontendBase}/banks/connect?revolut=connected`);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : 'unknown_error';
    res.redirect(`${frontendBase}/banks/connect?revolut=error&msg=${msg}`);
    void next;
  }
});

// ── GoCardless Open Banking ───────────────────────────────────────────────────

router.get('/gocardless/institutions', authenticate, async (req, res, next) => {
  try {
    const country = typeof req.query.country === 'string' ? req.query.country : 'DE';
    const institutions = await gcService.getInstitutions(country);
    res.json({ data: institutions });
  } catch (e) { next(e); }
});

router.post('/gocardless/requisition', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { institutionId } = z.object({ institutionId: z.string().min(1) }).parse(req.body);
    const result = await gcService.createRequisition(req.userId!, institutionId);
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.get('/gocardless/callback', async (req, res, next) => {
  const frontendBase = env.CORS_ORIGINS[0] ?? 'http://localhost:3001';
  try {
    const { ref } = z.object({ ref: z.string().min(1) }).parse(req.query);
    await gcService.handleCallback(ref);
    res.redirect(`${frontendBase}/banks/connect?gocardless=connected`);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : 'unknown_error';
    res.redirect(`${frontendBase}/banks/connect?gocardless=error&msg=${msg}`);
    void next;
  }
});

// ── Salt Edge ─────────────────────────────────────────────────────────────────

router.get('/saltedge/auth-url', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await seService.createConnectSession(req.userId!);
    res.json({ data: { authUrl: result.url, configured: true } });
  } catch (e) { next(e); }
});

router.get('/saltedge/callback', async (req, res, next) => {
  const frontendBase = env.CORS_ORIGINS[0] ?? 'http://localhost:3001';
  try {
    const { connection_id, state } = z.object({
      connection_id: z.string().min(1),
      state: z.string().min(1),
    }).parse(req.query);
    await seService.handleCallback(connection_id, state);
    res.redirect(`${frontendBase}/banks/connect?saltedge=connected`);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : 'unknown_error';
    res.redirect(`${frontendBase}/banks/connect?saltedge=error&msg=${msg}`);
    void next;
  }
});

// ── Single bank lookup (catch-all — must stay last) ──────────────────────────

router.get('/:blz', async (req, res, next) => {
  try {
    const bank = findBankByBlz(req.params.blz);
    if (!bank) throw new NotFoundError('Bank');
    res.json({ data: bank });
  } catch (e) { next(e); }
});

export default router;
