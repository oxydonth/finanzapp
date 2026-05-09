'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { BankAccount, Transaction, Budget } from '@finanzapp/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: netWorth } = useQuery({
    queryKey: ['net-worth'],
    queryFn: () => api.get<{ assets: number; liabilities: number; netWorth: number }>('/analytics/net-worth'),
  });
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<BankAccount[]>('/accounts'),
  });
  const { data: txData } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => api.get<Transaction[]>('/transactions?limit=5'),
  });
  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get<Budget[]>('/budgets'),
  });
  const { data: cashFlow } = useQuery({
    queryKey: ['cash-flow'],
    queryFn: () => api.get<{ month: string; income: number; expenses: number }[]>('/analytics/cash-flow?months=6'),
  });

  const accounts = Array.isArray(accountsData) ? accountsData : [];
  const transactions: Transaction[] = Array.isArray(txData) ? txData : [];
  const budgetList = Array.isArray(budgets) ? budgets : [];
  const flowData = Array.isArray(cashFlow) ? cashFlow.map((d) => ({
    ...d,
    income: d.income / 100,
    expenses: d.expenses / 100,
  })) : [];

  const statCards = [
    {
      label: t('dashboard.netWorth'),
      value: netWorth?.netWorth ?? 0,
      icon: Wallet,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-600',
      valueColor: 'text-brand-600',
    },
    {
      label: t('dashboard.assets'),
      value: netWorth?.assets ?? 0,
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      label: t('dashboard.liabilities'),
      value: netWorth?.liabilities ?? 0,
      icon: TrendingDown,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      valueColor: 'text-rose-500',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <h1 className="page-title mb-7">{t('dashboard.title')}</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {statCards.map((c) => (
          <div key={c.label} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-slate-500">{c.label}</p>
              <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                <c.icon className={`w-4.5 h-4.5 ${c.iconColor}`} size={18} />
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${c.valueColor}`}>{formatEUR(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Cash flow chart */}
        <div className="card p-6">
          <h2 className="section-title mb-5">{t('dashboard.cashflow6m')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={flowData} barGap={3}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${v}€`} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                formatter={(v: number) => formatEUR(v * 100)}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name={t('dashboard.income')} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name={t('dashboard.expenses')} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budgets */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">{t('dashboard.budgets')}</h2>
            <Link href="/budget" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
              {t('dashboard.showAll')} <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-4">
            {budgetList.slice(0, 4).map((b) => {
              const pct = b.progressPercent ?? 0;
              const barColor = pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-500';
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-700 font-medium">{b.category?.icon} {b.name}</span>
                    <span className="text-slate-400 text-xs">{formatEUR(b.spentCents ?? 0)} / {formatEUR(b.limitCents)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {budgetList.length === 0 && (
              <p className="text-sm text-slate-400">
                {t('dashboard.noBudgets')}{' '}
                <Link href="/budget" className="text-brand-600">{t('dashboard.createBudget')}</Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="card p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">{t('nav.accounts')}</h2>
          <Link href="/konten" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
            {t('dashboard.showAll')} <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {accounts.slice(0, 4).map((a) => (
            <div key={a.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:shadow-sm transition-all duration-150">
              <p className="text-xs text-slate-400 mb-0.5">{a.accountName}</p>
              <p className="text-lg font-bold text-slate-900 tracking-tight">{formatEUR(Number(a.balanceCents))}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">{a.ibanMasked}</p>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
              <Link href="/banken/verbinden" className="text-brand-600 hover:text-brand-700">{t('dashboard.connectBank')}</Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title">{t('dashboard.recentTransactions')}</h2>
          <Link href="/transaktionen" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
            {t('dashboard.showAll')} <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="space-y-1">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base shrink-0">
                  {tx.category?.icon ?? '💳'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 leading-tight">
                    {tx.merchantName ?? tx.creditorName ?? tx.purpose ?? t('dashboard.unknown')}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(tx.bookingDate)}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">{t('dashboard.noTransactions')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
