'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import type { BankConnection } from '@finanzapp/types';
import { formatDate } from '@finanzapp/utils';
import Link from 'next/link';
import { RefreshCw, Plus, Trash2, Building2 } from 'lucide-react';

export default function BankenPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
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

  const STATUS: Record<string, { label: string; className: string }> = {
    IDLE: { label: 'Inaktiv', className: 'badge-gray' },
    SYNCING: { label: 'Synchronisiert', className: 'badge-blue' },
    SUCCESS: { label: 'Verbunden', className: 'badge-green' },
    FAILED: { label: 'Fehler', className: 'badge-red' },
    TAN_REQUIRED: { label: 'TAN benötigt', className: 'badge-amber' },
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-7">
        <h1 className="page-title">{t('banks.title')}</h1>
        <Link href="/banks/connect" className="btn-primary">
          <Plus size={16} /> {t('banks.connectBank')}
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20 text-slate-400 text-sm">{t('banks.loading')}</div>
      )}

      {!isLoading && connections.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-900 dark:text-slate-100 font-semibold mb-1">{t('banks.noBanks')}</p>
          <Link href="/banks/connect" className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors">
            {t('banks.connectBankNow')}
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {connections.map((conn) => {
          const status = STATUS[conn.syncStatus] ?? { label: conn.syncStatus, className: 'badge-gray' };
          return (
            <div key={conn.id} className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{conn.bankName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('banks.bankCode')} {conn.bankCode} · {t('banks.lastSync')}{' '}
                    {conn.lastSyncAt ? formatDate(conn.lastSyncAt) : t('banks.never')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={status.className}>{status.label}</span>
                <button
                  onClick={() => syncMutation.mutate(conn.id)}
                  disabled={syncMutation.isPending}
                  className="btn-ghost p-2 text-slate-400 hover:text-brand-600"
                  title={t('banks.sync')}
                >
                  <RefreshCw size={15} className={syncMutation.isPending ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => { if (confirm(t('banks.disconnectConfirm'))) deleteMutation.mutate(conn.id); }}
                  className="btn-ghost p-2 text-slate-400 hover:text-rose-500"
                  title={t('banks.disconnect')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
