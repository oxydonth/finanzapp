import Bull from 'bull';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { sendBudgetAlertEmail } from '../../services/mail.service';
import { startOfCurrentMonth, endOfCurrentMonth } from '@finanzapp/utils';

export const budgetAlertQueue = new Bull('budget-alerts', { createClient: () => redis });

const ALERT_DEDUP_TTL = 24 * 60 * 60; // 24 hours — don't re-alert for the same budget same day

export async function checkBudgetAlertsForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, currency: true },
  });
  if (!user) return;

  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
    include: { category: { select: { id: true, name: true } } },
  });

  const from = startOfCurrentMonth();
  const to = endOfCurrentMonth();
  const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: user.currency });

  for (const budget of budgets) {
    const agg = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: 'DEBIT',
        bookingDate: { gte: from, lte: to },
      },
      _sum: { amountCents: true },
    });

    const spentCents = Math.abs(Number(agg._sum.amountCents ?? 0));
    const limitCents = Number(budget.limitCents);
    const spentPercent = Math.round((spentCents / limitCents) * 100);

    if (spentPercent < budget.alertThreshold) continue;

    // Deduplicate: skip if we already alerted today for this budget
    const dedupKey = `budget:alert:${budget.id}:${new Date().toISOString().slice(0, 10)}`;
    const alreadySent = await redis.get(dedupKey);
    if (alreadySent) continue;

    await redis.setex(dedupKey, ALERT_DEDUP_TTL, '1');
    sendBudgetAlertEmail(
      user.email,
      user.firstName,
      budget.name,
      spentPercent,
      fmt.format(spentCents / 100),
      fmt.format(limitCents / 100),
    ).catch(console.error);
  }
}

budgetAlertQueue.process(async (job) => {
  const { userId } = job.data as { userId: string };
  await checkBudgetAlertsForUser(userId);
});

budgetAlertQueue.on('failed', (job, err) => {
  console.error(`[budget-alert-queue] job ${job.id} failed for user ${job.data.userId}:`, err.message);
});
