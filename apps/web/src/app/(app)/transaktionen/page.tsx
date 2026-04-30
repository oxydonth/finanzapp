'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { Transaction } from '@finanzapp/types';

interface TxPage { data: Transaction[]; total: number; totalPages: number; page: number }

export default function TransaktionenPage() {
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
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transaktionen</h1>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Alle</option>
          <option value="CREDIT">Einnahmen</option>
          <option value="DEBIT">Ausgaben</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48 text-gray-400">Laden...</div>
        ) : transactions.length === 0 ? (
          <div className="flex justify-center items-center h-48 text-gray-400">Keine Transaktionen gefunden</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Datum</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empfänger / Absender</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kategorie</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Betrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(tx.bookingDate)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{tx.merchantName ?? tx.creditorName ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{tx.purpose}</p>
                    </td>
                    <td className="px-4 py-3">
                      {tx.category ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {tx.category.icon} {tx.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'}`}>
                      {tx.type === 'CREDIT' ? '+' : ''}{formatEUR(Number(tx.amountCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 py-4 border-t border-gray-100">
                <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Zurück</button>
                <span className="text-sm text-gray-500">Seite {page} von {data.totalPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page >= data.totalPages} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Weiter</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
