'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../../lib/api';
import type { BankRegistryEntry } from '@finanzapp/config';
import { Search, ChevronRight, Lock, CheckCircle, Building2, Wallet } from 'lucide-react';

type Step = 'provider' | 'select' | 'credentials' | 'tan' | 'oauth' | 'done';
type OAuthProvider = 'paypal' | 'wise' | 'revolut';
const FINTS_STEPS: Step[] = ['provider', 'select', 'credentials', 'tan', 'done'];
const OAUTH_STEPS: Step[] = ['provider', 'oauth', 'done'];

export default function VerbindenPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('provider');
  const [provider, setProvider] = useState<'fints' | OAuthProvider | null>(null);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankRegistryEntry | null>(null);
  const [creds, setCreds] = useState({ loginName: '', pin: '' });
  const [tan, setTan] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [tanChallenge, setTanChallenge] = useState('');
  const [error, setError] = useState('');

  // Detect return from OAuth redirect (PayPal / Wise / Revolut)
  useEffect(() => {
    for (const p of ['paypal', 'wise', 'revolut'] as OAuthProvider[]) {
      const val = params.get(p);
      if (val === 'connected') { setProvider(p); setStep('done'); return; }
      if (val === 'error') { setProvider(p); setError(params.get('msg') ?? t('connectBank.connectionFailed')); return; }
    }
  }, [params, t]);

  const { data: banks = [] } = useQuery<BankRegistryEntry[]>({
    queryKey: ['banks'],
    queryFn: () => api.get<BankRegistryEntry[]>('/banks'),
    enabled: step === 'select',
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

  const oauthMutation = useMutation({
    mutationFn: (p: OAuthProvider) => api.get<{ authUrl: string }>(`/banks/${p}/auth-url`),
    onSuccess: (res) => { window.location.href = res.authUrl; },
    onError: (err) => setError(err instanceof Error ? err.message : t('connectBank.connectionFailed')),
  });

  const steps = provider === 'fints' || provider === null ? FINTS_STEPS : OAUTH_STEPS;
  const currentStepIndex = steps.indexOf(step);

  function chooseProvider(p: 'fints' | OAuthProvider) {
    setProvider(p);
    setError('');
    setStep(p === 'fints' ? 'select' : 'oauth');
  }

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      <h1 className="page-title mb-6">{t('connectBank.title')}</h1>

      {/* Progress stepper */}
      <div className="flex items-center gap-1 mb-8">
        {steps.filter((s) => s !== 'tan' || step === 'tan').map((s, i) => {
          const visibleSteps = steps.filter((x) => x !== 'tan' || step === 'tan');
          const idx = visibleSteps.indexOf(s);
          const done = idx < currentStepIndex;
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {done ? <CheckCircle size={14} /> : i + 1}
              </div>
              {i < visibleSteps.length - 1 && (
                <div className={`flex-1 h-px mx-1 transition-all ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-5 text-sm ring-1 ring-rose-200/60">{error}</div>
      )}

      {/* Step: choose provider */}
      {step === 'provider' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 mb-5">{t('connectBank.chooseProvider')}</p>
          <button
            onClick={() => chooseProvider('fints')}
            className="w-full flex items-center gap-4 p-5 card hover:shadow-card-hover transition-all text-left group"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
              <Building2 size={20} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                {t('connectBank.germanBank')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{t('connectBank.germanBankDesc')}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 transition-colors" />
          </button>

          {(
            [
              { key: 'paypal', label: 'PayPal', desc: t('connectBank.paypalDesc'), color: 'blue' },
              { key: 'wise', label: 'Wise', desc: t('connectBank.wiseDesc'), color: 'emerald' },
              { key: 'revolut', label: 'Revolut', desc: t('connectBank.revolutDesc'), color: 'violet' },
            ] as { key: OAuthProvider; label: string; desc: string; color: string }[]
          ).map(({ key, label, desc, color }) => (
            <button
              key={key}
              onClick={() => chooseProvider(key)}
              className="w-full flex items-center gap-4 p-5 card hover:shadow-card-hover transition-all text-left group"
            >
              <div className={`w-11 h-11 rounded-xl bg-${color}-50 flex items-center justify-center shrink-0 group-hover:bg-${color}-100 transition-colors`}>
                <Wallet size={20} className={`text-${color}-600`} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-slate-900 group-hover:text-${color}-600 transition-colors`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={16} className={`text-slate-300 group-hover:text-${color}-400 transition-colors`} />
            </button>
          ))}
        </div>
      )}

      {/* Step: select German bank */}
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

      {/* Step: FinTS credentials */}
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

      {/* Step: TAN */}
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

      {/* Step: OAuth (PayPal / Wise / Revolut) */}
      {step === 'oauth' && provider && provider !== 'fints' && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-5 card">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Wallet size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 capitalize">{provider}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t(`connectBank.${provider}Desc`)}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{t('connectBank.oauthNote')}</p>
          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 rounded-xl p-3.5 ring-1 ring-slate-200/60">
            <Lock size={13} className="text-slate-400 shrink-0 mt-0.5" />
            {t('connectBank.securityNote')}
          </div>
          <button
            onClick={() => oauthMutation.mutate(provider)}
            disabled={oauthMutation.isPending}
            className="btn-primary w-full py-2.5"
          >
            {oauthMutation.isPending ? t('connectBank.paypalConnecting') : t('connectBank.oauthButton', { provider: provider.charAt(0).toUpperCase() + provider.slice(1) })}
          </button>
        </div>
      )}

      {/* Step: done */}
      {step === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('connectBank.successTitle')}</h2>
          <p className="text-slate-500 text-sm mb-7">{t('connectBank.successDesc')}</p>
          <button onClick={() => router.push('/banks')} className="btn-primary px-8 py-2.5">
            {t('connectBank.goToBanks')}
          </button>
        </div>
      )}
    </div>
  );
}
