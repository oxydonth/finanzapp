'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { Transaction } from '@finanzapp/types';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface TxPage { data: Transaction[]; total: number; totalPages: number; page: number }

export default function TransaktionenPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');

  const params = new URLSearchParams({ page: String(page), limit: '50', ...(search && { search }), ...(type && { type }) });
  const { data, isLoading } = useQuery<TxPage>({
    queryKey: ['transactions', page, search, type],
    queryFn: () => api.get<TxPage>(`/transactions?${params}`),
  });

  const transactions = data?.data ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <h1 className="page-title mb-6">{t('transactions.title')}</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('transactions.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9"
          />
        </div>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">{t('transactions.all')}</option>
          <option value="CREDIT">{t('transactions.income')}</option>
          <option value="DEBIT">{t('transactions.expenses')}</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48 text-slate-400 text-sm">{t('transactions.loading')}</div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <p className="text-sm">{t('transactions.noTransactions')}</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('transactions.date')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('transactions.recipientSender')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('transactions.category')}</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('transactions.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-400 whitespace-nowrap tabular-nums">{formatDate(tx.bookingDate)}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-900 leading-tight">{tx.merchantName ?? tx.creditorName ?? '—'}</p>
                      {tx.purpose && <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{tx.purpose}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      {tx.category ? (
                        <span className="badge-gray">
                          {tx.category.icon} {tx.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-semibold text-right whitespace-nowrap tabular-nums ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && data.totalPages > 1 && (
              <div className="flex justify-between items-center px-5 py-3.5 border-t border-slate-100 bg-slate-50/40">
                <span className="text-xs text-slate-400">{t('transactions.page', { page, total: data.totalPages })}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.totalPages}
                    className="btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
