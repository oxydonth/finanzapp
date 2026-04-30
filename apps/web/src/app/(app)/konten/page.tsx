'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { formatEUR, formatDate } from '@finanzapp/utils';
import type { BankAccount } from '@finanzapp/types';
import Link from 'next/link';

export default function KontenPage() {
  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ['accounts'],
    queryFn: () => api.get<BankAccount[]>('/accounts'),
  });

  const total = accounts.reduce((s, a) => s + Number(a.balanceCents), 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Konten</h1>
      <p className="text-gray-500 mb-6">Gesamtsaldo: <span className="font-semibold text-gray-900">{formatEUR(total)}</span></p>

      {isLoading && <div className="text-center text-gray-400 py-12">Laden...</div>}

      <div className="grid grid-cols-2 gap-4">
        {accounts.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">{a.accountType}</p>
                <h3 className="font-semibold text-gray-900">{a.accountName}</h3>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Aktiv</span>
            </div>
            <p className="text-2xl font-bold mb-1">{formatEUR(Number(a.balanceCents))}</p>
            <p className="text-xs text-gray-400 mb-4">{a.ibanMasked}</p>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{a.ownerName}</span>
              {a.balanceDate && <span>Stand: {formatDate(a.balanceDate)}</span>}
            </div>
          </div>
        ))}
      </div>

      {!isLoading && accounts.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🏦</p>
          <p>Keine Konten gefunden.</p>
          <Link href="/banken/verbinden" className="text-brand-600 hover:underline text-sm mt-2 block">Bank verbinden</Link>
        </div>
      )}
    </div>
  );
}
