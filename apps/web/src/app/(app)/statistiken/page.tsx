'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { formatEUR } from '@finanzapp/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import Link from 'next/link';

type CashFlowEntry = { month: string; income: number; expenses: number; savings: number };
type BreakdownEntry = { id: string; name: string; icon?: string | null; color?: string | null; total: number };
type NetWorth = { assets: number; liabilities: number; netWorth: number };

function rangeParams(months: number): string {
  if (months === 0) return '';
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return `?from=${from.toISOString()}&to=${to.toISOString()}`;
}

export default function StatistikenPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [rangeMonths, setRangeMonths] = useState(6);
  const [toast, setToast] = useState<string | null>(null);

  const RANGES = [
    { label: t('statistics.thisMonth'), months: 1 },
    { label: t('statistics.last3Months'), months: 3 },
    { label: t('statistics.last6Months'), months: 6 },
    { label: t('statistics.thisYear'), months: 12 },
    { label: t('statistics.total'), months: 0 },
  ] as const;

  const { data: cashFlow = [] } = useQuery<CashFlowEntry[]>({
    queryKey: ['cash-flow-12'],
    queryFn: () => api.get('/analytics/cash-flow?months=12'),
  });

  const { data: netWorthData } = useQuery<NetWorth>({
    queryKey: ['net-worth'],
    queryFn: () => api.get('/analytics/net-worth'),
  });

  const { data: breakdown = [] } = useQuery<BreakdownEntry[]>({
    queryKey: ['spending-breakdown', rangeMonths],
    queryFn: () => api.get(`/analytics/spending-breakdown${rangeParams(rangeMonths)}`),
  });

  const autoCategorize = useMutation({
    mutationFn: () => api.post<{ count: number }>('/analytics/auto-categorize', {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['spending-breakdown'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setToast(t('statistics.categorized', { count: res.count }));
      setTimeout(() => setToast(null), 4000);
    },
  });

  const wealthTrend = useMemo(() => {
    if (!netWorthData || cashFlow.length === 0) return [];
    let running = netWorthData.netWorth / 100;
    const points: { month: string; netWorth: number }[] = [];
    for (const entry of [...cashFlow].reverse()) {
      points.unshift({ month: entry.month, netWorth: running });
      running -= entry.savings / 100;
    }
    return points;
  }, [cashFlow, netWorthData]);

  const wealthDelta = wealthTrend.length >= 2
    ? wealthTrend[wealthTrend.length - 1].netWorth - wealthTrend[0].netWorth
    : null;

  const flowData = cashFlow.map((d) => ({
    ...d,
    income: d.income / 100,
    expenses: d.expenses / 100,
    savings: d.savings / 100,
  }));

  const pieData = breakdown.filter((d) => d.id !== 'other').slice(0, 8).map((d) => ({
    ...d,
    total: d.total / 100,
  }));

  const uncategorized = breakdown.find((d) => d.id === 'other');

  const totalExpenses = breakdown.filter((d) => d.id !== 'other').reduce((s, d) => s + d.total, 0);
  const totalIncome = cashFlow.slice(-rangeMonths || -12).reduce((s, d) => s + d.income, 0);
  const totalSavings = totalIncome - totalExpenses;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('statistics.title')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {RANGES.map((r) => (
              <button
                key={r.months}
                onClick={() => setRangeMonths(r.months)}
                className={`px-3 py-1.5 transition-colors ${rangeMonths === r.months ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => autoCategorize.mutate()}
            disabled={autoCategorize.isPending}
            className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {autoCategorize.isPending ? t('statistics.running') : t('statistics.autoCategorize')}
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 text-green-800 text-sm border border-green-200">
          ✓ {toast}
        </div>
      )}

      {uncategorized && (
        <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <span>{t('statistics.uncategorized_amount', { amount: formatEUR(uncategorized.total) })}</span>
          <Link href="/kategorien" className="font-medium underline underline-offset-2">{t('statistics.createRules')}</Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: t('statistics.expenses'), value: totalExpenses, color: 'text-red-500' },
          { label: t('statistics.income'), value: totalIncome, color: 'text-green-600' },
          { label: t('statistics.savings'), value: totalSavings, color: totalSavings >= 0 ? 'text-brand-600' : 'text-red-500' },
          { label: t('statistics.assets'), value: (netWorthData?.netWorth ?? 0) / 100, color: 'text-emerald-600' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{formatEUR(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Cash flow */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">{t('statistics.cashflow12m')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={flowData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
              <Tooltip formatter={(v: number) => formatEUR(v * 100)} />
              <Bar dataKey="income" fill="#22c55e" name={t('statistics.income')} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" fill="#f87171" name={t('statistics.expenses')} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">{t('statistics.expensesByCategory')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                onClick={(_, i) => {
                  if (pieData[i]) router.push(`/transaktionen?categoryId=${pieData[i].id}`);
                }}
                style={{ cursor: 'pointer' }}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color ?? `hsl(${i * 45}, 65%, 55%)`} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatEUR(v * 100)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">{t('statistics.savingsRate12m')}</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={flowData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
            <Tooltip formatter={(v: number) => formatEUR(v * 100)} />
            <Line type="monotone" dataKey="savings" stroke="#6366f1" strokeWidth={2} dot={false} name={t('statistics.savings')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Wealth trend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-semibold">{t('statistics.wealthTrend12m')}</h2>
          {wealthDelta !== null && (
            <span className={`text-sm font-medium ${wealthDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {wealthDelta >= 0 ? '▲' : '▼'} {formatEUR(Math.abs(wealthDelta) * 100)}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">{t('statistics.estimatedTrend')}</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={wealthTrend}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
            <Tooltip formatter={(v: number) => formatEUR(v * 100)} />
            <Line type="monotone" dataKey="netWorth" stroke="#10b981" strokeWidth={2} dot={false} name={t('statistics.assets')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category bar breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold mb-4">{t('statistics.allCategories')}</h2>
        <div className="space-y-3">
          {breakdown.filter((d) => d.id !== 'other').map((cat) => {
            const max = breakdown.filter((d) => d.id !== 'other')[0]?.total ?? 1;
            const pct = Math.round((cat.total / max) * 100);
            return (
              <Link key={cat.id} href={`/transaktionen?categoryId=${cat.id}`} className="flex items-center gap-3 group">
                <span className="w-6 text-center">{cat.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="group-hover:text-brand-600 transition-colors">{cat.name}</span>
                    <span className="font-medium">{formatEUR(cat.total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: cat.color ?? '#6366f1' }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
          {breakdown.filter((d) => d.id !== 'other').length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">{t('statistics.noExpenses')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
