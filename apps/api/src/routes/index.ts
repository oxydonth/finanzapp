import { Router } from 'express';
import authRouter from './auth.routes';
import banksRouter from './banks.routes';
import accountsRouter from './accounts.routes';
import transactionsRouter from './transactions.routes';
import categoriesRouter from './categories.routes';
import budgetsRouter from './budgets.routes';
import analyticsRouter from './analytics.routes';
import usersRouter from './users.routes';
import { authenticate } from '../middleware/auth';
import { requireVerified } from '../middleware/requireVerified';

export const router = Router();

router.use('/auth', authRouter);
// Users endpoints accessible without email verification (profile, settings, export, delete)
router.use('/users', usersRouter);
// Banks router has public registry endpoints (GET /, search, /:blz) — keep as-is,
// individual connection routes inside banks.routes.ts guard themselves with authenticate
router.use('/banks', banksRouter);
// Financial data requires verified email — applied at router level (each route also calls authenticate internally)
router.use('/accounts', authenticate, requireVerified, accountsRouter);
router.use('/transactions', authenticate, requireVerified, transactionsRouter);
router.use('/categories', authenticate, requireVerified, categoriesRouter);
router.use('/budgets', authenticate, requireVerified, budgetsRouter);
router.use('/analytics', authenticate, requireVerified, analyticsRouter);
