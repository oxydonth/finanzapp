'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { BankAccount } from '@finanzapp/types';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function KontenPage() {
  const { t } = useTranslation();
  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get<BankAccount[]>('/accounts'),
  });

  const total = accounts.reduce((s, a) => s + Number(a.balanceCents), 0);

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-7">
        <h1 className="page-title">{t('accounts.title')}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t('accounts.totalBalance')}{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatEUR(total)}</span>
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20 text-slate-400 text-sm">{t('accounts.loading')}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {accounts.map((a) => (
          <div key={a.id} className="card-hover p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{a.accountType}</p>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{a.accountName}</h3>
              </div>
              <span className="badge-green">{t('accounts.active')}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums mb-0.5">
              {formatEUR(Number(a.balanceCents))}
            </p>
            <p className="text-xs text-slate-400 font-mono mb-4">{a.ibanMasked}</p>
            <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span>{a.ownerName}</span>
              {a.balanceDate && <span>{t('accounts.asOf')} {formatDate(a.balanceDate)}</span>}
            </div>
          </div>
        ))}
      </div>

      {!isLoading && accounts.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium mb-1">{t('accounts.noAccounts')}</p>
          <Link href="/banks/connect" className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors">
            {t('accounts.connectBank')}
          </Link>
        </div>
      )}
    </div>
  );
}
