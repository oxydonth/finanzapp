import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';

const router = Router();

router.get('/net-worth', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const accounts: Array<{ accountType: string; balanceCents: bigint }> =
      await prisma.bankAccount.findMany({
        where: { userId: req.userId!, isHidden: false },
        select: { accountType: true, balanceCents: true },
      });

    const assets = accounts
      .filter((a: { accountType: string; balanceCents: bigint }) => !['LOAN', 'CREDIT_CARD'].includes(a.accountType))
      .reduce((s: number, a: { accountType: string; balanceCents: bigint }) => s + Number(a.balanceCents), 0);
    const liabilities = accounts
      .filter((a: { accountType: string; balanceCents: bigint }) => ['LOAN', 'CREDIT_CARD'].includes(a.accountType))
      .reduce((s: number, a: { accountType: string; balanceCents: bigint }) => s + Math.abs(Number(a.balanceCents)), 0);

    res.json({ data: { assets, liabilities, netWorth: assets - liabilities } });
  } catch (e) { next(e); }
});

router.get('/spending-breakdown', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
        type: 'DEBIT',
        ...(from || to
          ? { bookingDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } }
          : {}),
      },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    });

    const breakdown: Record<string, { name: string; icon?: string | null; color?: string | null; total: number }> = {};
    for (const tx of transactions) {
      const key = tx.categoryId ?? 'other';
      if (!breakdown[key]) {
        breakdown[key] = {
          name: tx.category?.name ?? 'Sonstiges',
          icon: tx.category?.icon,
          color: tx.category?.color,
          total: 0,
        };
      }
      breakdown[key].total += Math.abs(Number(tx.amountCents));
    }

    res.json({
      data: Object.entries(breakdown)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.total - a.total),
    });
  } catch (e) { next(e); }
});

router.get('/cash-flow', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { months = '6' } = req.query as { months?: string };
    const from = new Date();
    from.setMonth(from.getMonth() - parseInt(months));

    const txs = await prisma.transaction.findMany({
      where: { userId: req.userId!, bookingDate: { gte: from } },
      select: { bookingDate: true, amountCents: true, type: true },
    });

    const flow: Record<string, { income: number; expenses: number; savings: number }> = {};
    for (const tx of txs) {
      const key = `${tx.bookingDate.getFullYear()}-${String(tx.bookingDate.getMonth() + 1).padStart(2, '0')}`;
      if (!flow[key]) flow[key] = { income: 0, expenses: 0, savings: 0 };
      const c = Number(tx.amountCents);
      if (tx.type === 'CREDIT') flow[key].income += c;
      else flow[key].expenses += Math.abs(c);
    }
    for (const k of Object.keys(flow)) {
      flow[k].savings = flow[k].income - flow[k].expenses;
    }

    res.json({
      data: Object.entries(flow)
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (e) { next(e); }
});

export default router;
