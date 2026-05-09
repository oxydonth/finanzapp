'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { useAuthStore, getAccessToken, getRefreshToken } from '../../../store/authStore';
import type { User, MfaSetupResponse, MfaEnableResponse } from '@finanzapp/types';
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Globe } from 'lucide-react';

type MfaStep = 'idle' | 'setup' | 'backup-codes';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'cs', label: 'Čeština' },
  { code: 'sk', label: 'Slovenčina' },
  { code: 'hu', label: 'Magyar' },
  { code: 'ro', label: 'Română' },
  { code: 'bg', label: 'Български' },
  { code: 'hr', label: 'Hrvatski' },
  { code: 'sr', label: 'Српски' },
  { code: 'sl', label: 'Slovenščina' },
  { code: 'da', label: 'Dansk' },
  { code: 'nb', label: 'Norsk bokmål' },
  { code: 'sv', label: 'Svenska' },
  { code: 'fi', label: 'Suomi' },
  { code: 'et', label: 'Eesti' },
  { code: 'lv', label: 'Latviešu' },
  { code: 'lt', label: 'Lietuvių' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'sq', label: 'Shqip' },
  { code: 'mk', label: 'Македонски' },
  { code: 'bs', label: 'Bosanski' },
  { code: 'ca', label: 'Català' },
  { code: 'cy', label: 'Cymraeg' },
  { code: 'ga', label: 'Gaeilge' },
  { code: 'mt', label: 'Malti' },
  { code: 'is', label: 'Íslenska' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'be', label: 'Беларуская' },
  { code: 'fa', label: 'فارسی' },
];

export default function EinstellungenPage() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const storeUser = useAuthStore((s) => s.user);
  const { t, i18n } = useTranslation();

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me'),
    initialData: storeUser ?? undefined,
  });

  const mfaEnabled = user?.mfaEnabled ?? false;

  const [step, setStep] = useState<MfaStep>('idle');
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const setupMfa = useMutation({
    mutationFn: () => api.post<MfaSetupResponse>('/auth/mfa/setup', {}),
    onSuccess: (data) => {
      setSetupData(data);
      setStep('setup');
      setError('');
    },
  });

  const enableMfa = useMutation({
    mutationFn: () => api.post<MfaEnableResponse>('/auth/mfa/enable', { code }),
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep('backup-codes');
      setCode('');
      setError('');
      qc.invalidateQueries({ queryKey: ['me'] });
      if (user) setAuth({ ...user, mfaEnabled: true }, getAccessToken()!, getRefreshToken()!);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('settings.invalidCode')),
  });

  const disableMfa = useMutation({
    mutationFn: () => api.post<unknown>('/auth/mfa/disable', { code: disableCode }),
    onSuccess: () => {
      setShowDisable(false);
      setDisableCode('');
      setError('');
      qc.invalidateQueries({ queryKey: ['me'] });
      if (user) setAuth({ ...user, mfaEnabled: false }, getAccessToken()!, getRefreshToken()!);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('settings.invalidCode')),
  });

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-7">
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('settings.accountSecurity')}</p>
      </div>

      {/* Profile info */}
      <section className="card p-6 mb-4">
        <h2 className="section-title mb-5">{t('settings.profile')}</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">{t('settings.name')}</p>
            <p className="font-medium text-slate-900">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">{t('settings.email')}</p>
            <p className="font-medium text-slate-900">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* Language selector */}
      <section className="card p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
            <Globe size={16} className="text-brand-600" />
          </div>
          <h2 className="section-title">{t('settings.language')}</h2>
        </div>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="input"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </section>

      {/* MFA section */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mfaEnabled ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            {mfaEnabled
              ? <ShieldCheck size={16} className="text-emerald-600" />
              : <Shield size={16} className="text-slate-500" />
            }
          </div>
          <h2 className="section-title">{t('settings.twoFactor')}</h2>
          {mfaEnabled && <span className="ml-auto badge-green">{t('settings.twoFactorActive')}</span>}
        </div>
        <p className="text-sm text-slate-500 mb-6">{t('settings.twoFactorDesc')}</p>

        {error && (
          <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm ring-1 ring-rose-200/60">{error}</div>
        )}

        {!mfaEnabled && step === 'idle' && (
          <button onClick={() => setupMfa.mutate()} disabled={setupMfa.isPending} className="btn-primary">
            <Shield size={15} />
            {setupMfa.isPending ? t('settings.preparing') : t('settings.enableMfa')}
          </button>
        )}

        {step === 'setup' && setupData && (
          <div className="space-y-5">
            <div>
              <p className="label">{t('settings.scanQr')}</p>
              <img src={setupData.qrCodeDataUrl} alt="TOTP QR Code" className="w-44 h-44 rounded-xl ring-1 ring-slate-200" />
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1.5">{t('settings.orEnterManually')}</p>
              <code className="text-xs bg-slate-100 px-3 py-2 rounded-lg font-mono tracking-widest inline-block">{setupData.secret}</code>
            </div>
            <div>
              <label className="label">{t('settings.enterCode')}</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="input w-36 text-center text-xl tracking-widest font-mono"
                />
                <button
                  onClick={() => enableMfa.mutate()}
                  disabled={code.length < 6 || enableMfa.isPending}
                  className="btn-primary"
                >
                  {enableMfa.isPending ? t('settings.verifying') : t('settings.confirm')}
                </button>
              </div>
            </div>
            <button onClick={() => { setStep('idle'); setSetupData(null); }} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              {t('settings.cancel')}
            </button>
          </div>
        )}

        {step === 'backup-codes' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={16} />
              <p className="text-sm font-medium">{t('settings.mfaSuccess')}</p>
            </div>
            <div className="bg-amber-50 ring-1 ring-amber-200/60 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-900 mb-3">{t('settings.backupCodesTitle')}</p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-sm text-amber-800 mb-3">
                {backupCodes.map((c) => <span key={c}>{c}</span>)}
              </div>
              <button onClick={copyBackupCodes} className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 transition-colors">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? t('settings.copied') : t('settings.copy')}
              </button>
            </div>
            <p className="text-xs text-slate-400">{t('settings.backupCodesNote')}</p>
            <button onClick={() => setStep('idle')} className="btn-primary">
              {t('settings.done')}
            </button>
          </div>
        )}

        {mfaEnabled && step === 'idle' && (
          <div>
            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                className="btn-secondary text-rose-600 ring-rose-200 hover:bg-rose-50"
              >
                <ShieldOff size={15} />
                {t('settings.disableMfa')}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">{t('settings.disableMfaDesc')}</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\s/g, '').slice(0, 8))}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    className="input w-36 text-center text-xl tracking-widest font-mono focus:ring-rose-400/50 focus:border-rose-400"
                  />
                  <button
                    onClick={() => disableMfa.mutate()}
                    disabled={disableCode.length < 6 || disableMfa.isPending}
                    className="btn-danger"
                  >
                    {disableMfa.isPending ? t('settings.disabling') : t('settings.disable')}
                  </button>
                  <button
                    onClick={() => { setShowDisable(false); setDisableCode(''); setError(''); }}
                    className="btn-ghost"
                  >
                    {t('settings.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
