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
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { useThemeStore } from '../../../store/themeStore';

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
  const theme = useThemeStore((s) => s.theme);

  const TOOLTIP_STYLE = theme === 'dark'
    ? { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.4)', fontSize: '12px', padding: '8px 12px', background: '#1e293b', color: '#e2e8f0' }
    : { borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '12px', padding: '8px 12px' };

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

  const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <h1 className="page-title">{t('statistics.title')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden text-sm bg-white dark:bg-slate-800">
            {RANGES.map((r) => (
              <button
                key={r.months}
                onClick={() => setRangeMonths(r.months)}
                className={`px-3.5 py-2 text-xs font-medium transition-colors ${
                  rangeMonths === r.months
                    ? 'bg-brand-600 text-white dark:bg-brand-500'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => autoCategorize.mutate()}
            disabled={autoCategorize.isPending}
            className="btn-primary"
          >
            <Sparkles size={14} />
            {autoCategorize.isPending ? t('statistics.running') : t('statistics.autoCategorize')}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm ring-1 ring-emerald-200/60 animate-slide-up">
          ✓ {toast}
        </div>
      )}

      {/* Uncategorized banner */}
      {uncategorized && (
        <div className="mb-6 flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 ring-1 ring-amber-200/60 text-sm text-amber-800">
          <span>{t('statistics.uncategorized_amount', { amount: formatEUR(uncategorized.total) })}</span>
          <Link href="/categories" className="font-semibold hover:text-amber-900 transition-colors">
            {t('statistics.createRules')} →
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: t('statistics.expenses'), value: totalExpenses, color: 'text-rose-500', icon: TrendingDown, bg: 'bg-rose-50', iconColor: 'text-rose-500' },
          { label: t('statistics.income'), value: totalIncome, color: 'text-emerald-600', icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: t('statistics.savings'), value: totalSavings, color: totalSavings >= 0 ? 'text-brand-600' : 'text-rose-500', icon: TrendingUp, bg: 'bg-brand-50', iconColor: 'text-brand-600' },
          { label: t('statistics.assets'), value: (netWorthData?.netWorth ?? 0) / 100, color: 'text-emerald-600', icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        ].map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon size={15} className={c.iconColor} />
              </div>
            </div>
            <p className={`text-xl font-bold tracking-tight tabular-nums ${c.color}`}>{formatEUR(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Cash flow */}
        <div className="card p-6">
          <h2 className="section-title mb-5">{t('statistics.cashflow12m')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={flowData} barGap={3}>
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}€`} axisLine={false} tickLine={false} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatEUR(v * 100)} />
              <Bar dataKey="income" fill="#10b981" name={t('statistics.income')} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" fill="#f43f5e" name={t('statistics.expenses')} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card p-6">
          <h2 className="section-title mb-5">{t('statistics.expensesByCategory')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                onClick={(_, i) => {
                  if (pieData[i]) router.push(`/transactions?categoryId=${pieData[i].id}`);
                }}
                style={{ cursor: 'pointer' }}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color ?? `hsl(${i * 45}, 65%, 55%)`} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatEUR(v * 100)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings trend */}
      <div className="card p-6 mb-5">
        <h2 className="section-title mb-5">{t('statistics.savingsRate12m')}</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={flowData}>
            <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}€`} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatEUR(v * 100)} />
            <Line type="monotone" dataKey="savings" stroke="#6366f1" strokeWidth={2} dot={false} name={t('statistics.savings')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Wealth trend */}
      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between mb-1">
          <h2 className="section-title">{t('statistics.wealthTrend12m')}</h2>
          {wealthDelta !== null && (
            <span className={`text-sm font-semibold tabular-nums flex items-center gap-1 ${wealthDelta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {wealthDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatEUR(Math.abs(wealthDelta) * 100)}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">{t('statistics.estimatedTrend')}</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={wealthTrend}>
            <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${v}€`} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatEUR(v * 100)} />
            <Line type="monotone" dataKey="netWorth" stroke="#10b981" strokeWidth={2} dot={false} name={t('statistics.assets')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      <div className="card p-6">
        <h2 className="section-title mb-5">{t('statistics.allCategories')}</h2>
        <div className="space-y-3.5">
          {breakdown.filter((d) => d.id !== 'other').map((cat) => {
            const max = breakdown.filter((d) => d.id !== 'other')[0]?.total ?? 1;
            const pct = Math.round((cat.total / max) * 100);
            return (
              <Link key={cat.id} href={`/transactions?categoryId=${cat.id}`} className="flex items-center gap-3 group">
                <span className="w-6 text-center text-base shrink-0">{cat.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors font-medium">{cat.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatEUR(cat.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: cat.color ?? '#6366f1' }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
          {breakdown.filter((d) => d.id !== 'other').length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">{t('statistics.noExpenses')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
