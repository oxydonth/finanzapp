'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { BankConnection } from '@finanzapp/types';
import { formatDate } from '@finanzapp/utils';
import Link from 'next/link';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

export default function BankenPage() {
  const qc = useQueryClient();
  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ['bank-connections'],
    queryFn: () => api.get<BankConnection[]>('/banks/connections'),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.post(`/banks/connections/${id}/sync`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-connections'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/banks/connections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-connections'] }),
  });

  const STATUS_COLOR: Record<string, string> = {
    IDLE: 'bg-gray-100 text-gray-600',
    SYNCING: 'bg-blue-100 text-blue-700',
    SUCCESS: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    TAN_REQUIRED: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Verbundene Banken</h1>
        <Link
          href="/banken/verbinden"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> Bank verbinden
        </Link>
      </div>

      {isLoading && <div className="text-center text-gray-400 py-12">Laden...</div>}
      {!isLoading && connections.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🏦</p>
          <p className="text-lg font-medium mb-2">Noch keine Banken verbunden</p>
          <Link href="/banken/verbinden" className="text-brand-600 hover:underline text-sm">Bank jetzt verbinden</Link>
        </div>
      )}

      <div className="space-y-4">
        {connections.map((conn) => (
          <div key={conn.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{conn.bankName}</h3>
              <p className="text-sm text-gray-500">BLZ: {conn.bankCode}</p>
              <p className="text-xs text-gray-400 mt-1">
                Letzter Sync: {conn.lastSyncAt ? formatDate(conn.lastSyncAt) : 'Noch nie'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[conn.syncStatus]}`}>
                {conn.syncStatus}
              </span>
              <button
                onClick={() => syncMutation.mutate(conn.id)}
                disabled={syncMutation.isPending}
                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-50 rounded-lg"
                title="Synchronisieren"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => { if (confirm('Bank trennen?')) deleteMutation.mutate(conn.id); }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                title="Bank trennen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
