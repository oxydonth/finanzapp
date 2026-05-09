'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../lib/api';
import type { BankRegistryEntry } from '@finanzapp/config';
import { Search, ChevronRight, Lock, CheckCircle } from 'lucide-react';

type Step = 'select' | 'credentials' | 'tan' | 'done';

const STEP_LABELS: Step[] = ['select', 'credentials', 'tan', 'done'];

export default function VerbindenPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('select');
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankRegistryEntry | null>(null);
  const [creds, setCreds] = useState({ loginName: '', pin: '' });
  const [tan, setTan] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [tanChallenge, setTanChallenge] = useState('');
  const [error, setError] = useState('');

  const { data: banks = [] } = useQuery<BankRegistryEntry[]>({
    queryKey: ['banks'],
    queryFn: () => api.get<BankRegistryEntry[]>('/banks'),
  });

  const filtered = bankSearch
    ? banks.filter((b) =>
        b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
        b.blz.includes(bankSearch),
      )
    : banks;

  const connectMutation = useMutation({
    mutationFn: (data: { bankCode: string; loginName: string; pin: string }) =>
      api.post<{ sessionId?: string; tanChallenge?: string; connectionId?: string }>(
        '/banks/connections',
        data,
      ),
    onSuccess: (res) => {
      if (res.sessionId) {
        setSessionId(res.sessionId);
        setTanChallenge(res.tanChallenge ?? t('connectBank.enterTan'));
        setStep('tan');
      } else {
        setStep('done');
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('connectBank.connectionFailed')),
  });

  const tanMutation = useMutation({
    mutationFn: (t: string) =>
      api.post('/banks/connections/dummy/tan', { sessionId, tan: t }),
    onSuccess: () => setStep('done'),
    onError: (err) => setError(err instanceof Error ? err.message : t('connectBank.tanFailed')),
  });

  const currentStepIndex = STEP_LABELS.indexOf(step);

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      <h1 className="page-title mb-6">{t('connectBank.title')}</h1>

      {/* Progress stepper */}
      <div className="flex items-center gap-1 mb-8">
        {STEP_LABELS.map((s, i) => {
          const done = i < currentStepIndex;
          const active = i === currentStepIndex;
          return (
            <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {done ? <CheckCircle size={14} /> : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-px mx-1 transition-all ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-5 text-sm ring-1 ring-rose-200/60">{error}</div>
      )}

      {step === 'select' && (
        <div>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              placeholder={t('connectBank.searchPlaceholder')}
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filtered.map((bank) => (
              <button
                key={bank.blz}
                onClick={() => { setSelectedBank(bank); setStep('credentials'); }}
                className="w-full flex items-center justify-between p-4 card hover:shadow-card-hover transition-all text-left group"
              >
                <div>
                  <p className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">{bank.name}</p>
                  <p className="text-xs text-slate-400">{t('banks.bankCode')} {bank.blz}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">{t('banks.noBanksFound')}</p>
            )}
          </div>
        </div>
      )}

      {step === 'credentials' && selectedBank && (
        <div>
          <div className="card p-4 mb-6">
            <p className="font-semibold text-slate-900">{selectedBank.name}</p>
            <p className="text-sm text-slate-400">{t('banks.bankCode')} {selectedBank.blz}</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">{t('connectBank.username')}</label>
              <input
                value={creds.loginName}
                onChange={(e) => setCreds({ ...creds, loginName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">{t('connectBank.pin')}</label>
              <input
                type="password"
                value={creds.pin}
                onChange={(e) => setCreds({ ...creds, pin: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 rounded-xl p-3.5 ring-1 ring-slate-200/60">
              <Lock size={13} className="text-slate-400 shrink-0 mt-0.5" />
              {t('connectBank.securityNote')}
            </div>
            <button
              onClick={() => connectMutation.mutate({ bankCode: selectedBank.blz, ...creds })}
              disabled={connectMutation.isPending || !creds.loginName || !creds.pin}
              className="btn-primary w-full py-2.5"
            >
              {connectMutation.isPending ? t('connectBank.connecting') : t('connectBank.connect')}
            </button>
          </div>
        </div>
      )}

      {step === 'tan' && (
        <div className="space-y-4">
          <p className="text-slate-700 text-sm leading-relaxed">{tanChallenge}</p>
          <div>
            <label className="label">{t('connectBank.enterTan')}</label>
            <input
              value={tan}
              onChange={(e) => setTan(e.target.value)}
              placeholder={t('connectBank.enterTan')}
              className="input"
            />
          </div>
          <button
            onClick={() => tanMutation.mutate(tan)}
            disabled={tanMutation.isPending || !tan}
            className="btn-primary w-full py-2.5"
          >
            {tanMutation.isPending ? t('connectBank.verifyingTan') : t('connectBank.confirmTan')}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('connectBank.successTitle')}</h2>
          <p className="text-slate-500 text-sm mb-7">{t('connectBank.successDesc')}</p>
          <button onClick={() => router.push('/banken')} className="btn-primary px-8 py-2.5">
            {t('connectBank.goToBanks')}
          </button>
        </div>
      )}
    </div>
  );
}
