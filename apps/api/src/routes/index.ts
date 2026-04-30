import { Router } from 'express';
import authRouter from './auth.routes';
import banksRouter from './banks.routes';
import accountsRouter from './accounts.routes';
import transactionsRouter from './transactions.routes';
import categoriesRouter from './categories.routes';
import budgetsRouter from './budgets.routes';
import analyticsRouter from './analytics.routes';
import usersRouter from './users.routes';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/banks', banksRouter);
router.use('/accounts', accountsRouter);
router.use('/transactions', transactionsRouter);
router.use('/categories', categoriesRouter);
router.use('/budgets', budgetsRouter);
router.use('/analytics', analyticsRouter);
