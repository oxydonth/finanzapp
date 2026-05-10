'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { formatEUR } from '@finanzapp/utils';
import type { Budget } from '@finanzapp/types';
import { Target } from 'lucide-react';

export default function BudgetPage() {
  const { t } = useTranslation();
  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: () => api.get<Budget[]>('/budgets'),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <h1 className="page-title mb-7">{t('budget.title')}</h1>

      {isLoading && (
        <div className="flex justify-center items-center py-20 text-slate-400 text-sm">{t('budget.loading')}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {budgets.map((b) => {
          const pct = b.progressPercent ?? 0;
          const isOver = pct > 90;
          const isWarning = pct > 70 && pct <= 90;
          const barColor = isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500';
          const badgeClass = isOver ? 'badge-red' : isWarning ? 'badge-amber' : 'badge-green';

          return (
            <div key={b.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">
                    {b.category?.icon ?? '📁'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">{b.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{b.period}</p>
                  </div>
                </div>
                <span className={badgeClass}>{pct}%</span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500 tabular-nums">{formatEUR(b.spentCents ?? 0)} {t('budget.spent')}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatEUR(b.limitCents)}</span>
              </div>

              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              <p className="text-xs text-slate-400 tabular-nums">
                {formatEUR(b.remainingCents ?? 0)} {t('budget.remaining')}
              </p>
            </div>
          );
        })}
      </div>

      {!isLoading && budgets.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">{t('budget.noBudgets')}</p>
        </div>
      )}
    </div>
  );
}
