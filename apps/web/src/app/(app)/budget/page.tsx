'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { formatEUR } from '@finanzapp/utils';
import type { Budget } from '@finanzapp/types';

export default function BudgetPage() {
  const { t } = useTranslation();
  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: () => api.get<Budget[]>('/budgets'),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('budget.title')}</h1>
      {isLoading && <div className="text-center text-gray-400 py-12">{t('budget.loading')}</div>}
      <div className="grid grid-cols-2 gap-4">
        {budgets.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{b.category?.icon}</span>
              <div>
                <h3 className="font-semibold">{b.name}</h3>
                <p className="text-xs text-gray-400">{b.period}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">{formatEUR(b.spentCents ?? 0)} {t('budget.spent')}</span>
              <span className="font-medium">{formatEUR(b.limitCents)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${(b.progressPercent ?? 0) > 90 ? 'bg-red-500' : (b.progressPercent ?? 0) > 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                style={{ width: `${b.progressPercent ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{formatEUR(b.remainingCents ?? 0)} {t('budget.remaining')} ({b.progressPercent ?? 0}%)</p>
          </div>
        ))}
      </div>
      {!isLoading && budgets.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🎯</p>
          <p>{t('budget.noBudgets')}</p>
        </div>
      )}
    </div>
  );
}
