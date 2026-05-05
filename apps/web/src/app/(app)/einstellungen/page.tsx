'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
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
      if (user) setAuth({ ...user, mfaEnabled: true }, useAuthStore.getState().accessToken!);
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
      if (user) setAuth({ ...user, mfaEnabled: false }, useAuthStore.getState().accessToken!);
    },
    onError: (err) => setError(err instanceof Error ? err.message : t('settings.invalidCode')),
  });

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('settings.title')}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('settings.accountSecurity')}</p>

      {/* Profile info */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{t('settings.profile')}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">{t('settings.name')}</p>
            <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-gray-500">{t('settings.email')}</p>
            <p className="font-medium text-gray-900">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* Language selector */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">{t('settings.language')}</h2>
        </div>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </section>

      {/* MFA section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          {mfaEnabled
            ? <ShieldCheck className="w-5 h-5 text-emerald-500" />
            : <Shield className="w-5 h-5 text-gray-400" />}
          <h2 className="text-base font-semibold text-gray-900">{t('settings.twoFactor')}</h2>
          {mfaEnabled && (
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{t('settings.twoFactorActive')}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-6">{t('settings.twoFactorDesc')}</p>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        {/* Not enabled — setup flow */}
        {!mfaEnabled && step === 'idle' && (
          <button
            onClick={() => setupMfa.mutate()}
            disabled={setupMfa.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            <Shield className="w-4 h-4" />
            {setupMfa.isPending ? t('settings.preparing') : t('settings.enableMfa')}
          </button>
        )}

        {/* Step 1: scan QR code */}
        {step === 'setup' && setupData && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">{t('settings.scanQr')}</p>
              <img src={setupData.qrCodeDataUrl} alt="TOTP QR Code" className="w-44 h-44 rounded-lg border border-gray-200" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('settings.orEnterManually')}</p>
              <code className="text-xs bg-gray-100 px-3 py-1.5 rounded font-mono tracking-widest">{setupData.secret}</code>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('settings.enterCode')}</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={() => enableMfa.mutate()}
                  disabled={code.length < 6 || enableMfa.isPending}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                >
                  {enableMfa.isPending ? t('settings.verifying') : t('settings.confirm')}
                </button>
              </div>
            </div>
            <button onClick={() => { setStep('idle'); setSetupData(null); }} className="text-sm text-gray-400 hover:text-gray-600">
              {t('settings.cancel')}
            </button>
          </div>
        )}

        {/* Step 2: backup codes */}
        {step === 'backup-codes' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
              <p className="text-sm font-medium">{t('settings.mfaSuccess')}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900 mb-3">{t('settings.backupCodesTitle')}</p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-sm text-amber-800 mb-3">
                {backupCodes.map((c) => <span key={c}>{c}</span>)}
              </div>
              <button
                onClick={copyBackupCodes}
                className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('settings.copied') : t('settings.copy')}
              </button>
            </div>
            <p className="text-xs text-gray-400">{t('settings.backupCodesNote')}</p>
            <button
              onClick={() => setStep('idle')}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              {t('settings.done')}
            </button>
          </div>
        )}

        {/* Enabled — disable flow */}
        {mfaEnabled && step === 'idle' && (
          <div>
            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                <ShieldOff className="w-4 h-4" />
                {t('settings.disableMfa')}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">{t('settings.disableMfaDesc')}</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\s/g, '').slice(0, 8))}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button
                    onClick={() => disableMfa.mutate()}
                    disabled={disableCode.length < 6 || disableMfa.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                  >
                    {disableMfa.isPending ? t('settings.disabling') : t('settings.disable')}
                  </button>
                  <button onClick={() => { setShowDisable(false); setDisableCode(''); setError(''); }} className="text-sm text-gray-400 hover:text-gray-600 px-2">
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
