'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { BankAccount, Transaction, Budget } from '@finanzapp/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function DashboardPage() {
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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Übersicht</h1>

      {/* Net worth */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Nettovermögen', value: netWorth?.netWorth ?? 0, color: 'text-brand-600' },
          { label: 'Vermögen', value: netWorth?.assets ?? 0, color: 'text-green-600' },
          { label: 'Verbindlichkeiten', value: netWorth?.liabilities ?? 0, color: 'text-red-500' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{formatEUR(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Cash flow chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">Cashflow (6 Monate)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={flowData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}€`} />
              <Tooltip formatter={(v: number) => formatEUR(v * 100)} />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Einnahmen" />
              <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Ausgaben" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budgets */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Budgets</h2>
            <Link href="/budget" className="text-sm text-brand-600 hover:underline">Alle anzeigen</Link>
          </div>
          <div className="space-y-3">
            {budgetList.slice(0, 4).map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{b.category?.icon} {b.name}</span>
                  <span className="text-gray-500">{formatEUR(b.spentCents ?? 0)} / {formatEUR(b.limitCents)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(b.progressPercent ?? 0) > 90 ? 'bg-red-500' : (b.progressPercent ?? 0) > 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                    style={{ width: `${b.progressPercent ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
            {budgetList.length === 0 && <p className="text-sm text-gray-400">Noch keine Budgets. <Link href="/budget" className="text-brand-600">Budget erstellen</Link></p>}
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Konten</h2>
          <Link href="/konten" className="text-sm text-brand-600 hover:underline">Alle anzeigen</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {accounts.slice(0, 4).map((a) => (
            <div key={a.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <p className="text-sm text-gray-500 mb-1">{a.accountName}</p>
              <p className="text-lg font-bold">{formatEUR(Number(a.balanceCents))}</p>
              <p className="text-xs text-gray-400">{a.ibanMasked}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Letzte Transaktionen</h2>
          <Link href="/transaktionen" className="text-sm text-brand-600 hover:underline">Alle anzeigen</Link>
        </div>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{tx.category?.icon ?? '💳'}</span>
                <div>
                  <p className="text-sm font-medium">{tx.merchantName ?? tx.creditorName ?? tx.purpose ?? 'Unbekannt'}</p>
                  <p className="text-xs text-gray-400">{formatDate(tx.bookingDate)}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'}`}>
                {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
