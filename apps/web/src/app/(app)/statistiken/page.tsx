'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatEUR } from '@finanzapp/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function StatistikenPage() {
  const { data: cashFlow = [] } = useQuery<{ month: string; income: number; expenses: number; savings: number }[]>({
    queryKey: ['cash-flow-12'],
    queryFn: () => api.get('/analytics/cash-flow?months=12'),
  });
  const { data: breakdown = [] } = useQuery<{ id: string; name: string; icon?: string | null; color?: string | null; total: number }[]>({
    queryKey: ['spending-breakdown'],
    queryFn: () => api.get('/analytics/spending-breakdown'),
  });

  const flowData = cashFlow.map((d) => ({ ...d, income: d.income / 100, expenses: d.expenses / 100 }));
  const pieData = breakdown.slice(0, 8).map((d) => ({ ...d, total: d.total / 100 }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Statistiken</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">Cashflow (12 Monate)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={flowData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
              <Tooltip formatter={(v: number) => formatEUR(v * 100)} />
              <Bar dataKey="income" fill="#22c55e" name="Einnahmen" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" fill="#f87171" name="Ausgaben" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">Ausgaben nach Kategorie</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
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

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold mb-4">Ausgaben nach Kategorie</h2>
        <div className="space-y-3">
          {breakdown.map((cat) => {
            const max = breakdown[0]?.total ?? 1;
            const pct = Math.round((cat.total / max) * 100);
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="w-6">{cat.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cat.name}</span>
                    <span className="font-medium">{formatEUR(cat.total)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${pct}%`, backgroundColor: cat.color ?? undefined }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
