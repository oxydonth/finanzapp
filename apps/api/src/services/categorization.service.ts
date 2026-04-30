import { prisma } from '../config/database';

export async function applyCategorizationRules(userId: string, txIds?: string[]): Promise<number> {
  const rules = await prisma.categoryRule.findMany({
    where: { category: { OR: [{ userId }, { isSystem: true }] } },
    include: { category: { select: { id: true } } },
    orderBy: [{ priority: 'desc' }, { id: 'asc' }],
  });
  if (rules.length === 0) return 0;

  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      categoryId: null,
      ...(txIds ? { id: { in: txIds } } : {}),
    },
    select: { id: true, purpose: true, creditorName: true, merchantName: true },
  });

  let count = 0;
  for (const tx of txs) {
    for (const rule of rules) {
      const val =
        rule.field === 'creditorName' ? tx.creditorName
        : rule.field === 'merchantName' ? tx.merchantName
        : tx.purpose;
      if (!val) continue;
      try {
        if (new RegExp(rule.pattern, 'i').test(val)) {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: { categoryId: rule.category.id },
          });
          count++;
          break;
        }
      } catch {
        continue;
      }
    }
  }
  return count;
}
