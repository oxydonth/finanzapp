'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { User, MfaSetupResponse, MfaEnableResponse } from '@finanzapp/types';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';

type MfaStep = 'idle' | 'setup' | 'backup-codes';

export default function EinstellungenPage() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const storeUser = useAuthStore((s) => s.user);

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
    onError: (err) => setError(err instanceof Error ? err.message : 'Ungültiger Code'),
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
    onError: (err) => setError(err instanceof Error ? err.message : 'Ungültiger Code'),
  });

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Einstellungen</h1>
      <p className="text-sm text-gray-500 mb-8">Konto & Sicherheit</p>

      {/* Profile info */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Profil</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-gray-500">E-Mail</p>
            <p className="font-medium text-gray-900">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* MFA section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-1">
          {mfaEnabled
            ? <ShieldCheck className="w-5 h-5 text-emerald-500" />
            : <Shield className="w-5 h-5 text-gray-400" />}
          <h2 className="text-base font-semibold text-gray-900">Zwei-Faktor-Authentifizierung</h2>
          {mfaEnabled && (
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Aktiv</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Schütze dein Konto mit dem Microsoft Authenticator. Nach der Einrichtung benötigst du beim Anmelden einen zusätzlichen Code.
        </p>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        {/* Not enabled — setup flow */}
        {!mfaEnabled && step === 'idle' && (
          <button
            onClick={() => setupMfa.mutate()}
            disabled={setupMfa.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            <Shield className="w-4 h-4" />
            {setupMfa.isPending ? 'Vorbereitung...' : 'MFA aktivieren'}
          </button>
        )}

        {/* Step 1: scan QR code */}
        {step === 'setup' && setupData && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                1. Öffne den <strong>Microsoft Authenticator</strong> und scanne diesen QR-Code:
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupData.qrCodeDataUrl} alt="TOTP QR Code" className="w-44 h-44 rounded-lg border border-gray-200" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Oder gib diesen Code manuell ein:</p>
              <code className="text-xs bg-gray-100 px-3 py-1.5 rounded font-mono tracking-widest">{setupData.secret}</code>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">2. Gib den 6-stelligen Code zur Bestätigung ein:</p>
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
                  {enableMfa.isPending ? 'Überprüfen...' : 'Bestätigen'}
                </button>
              </div>
            </div>
            <button onClick={() => { setStep('idle'); setSetupData(null); }} className="text-sm text-gray-400 hover:text-gray-600">
              Abbrechen
            </button>
          </div>
        )}

        {/* Step 2: backup codes */}
        {step === 'backup-codes' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
              <p className="text-sm font-medium">MFA erfolgreich aktiviert!</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900 mb-3">Backup-Codes — speichere diese sicher:</p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-sm text-amber-800 mb-3">
                {backupCodes.map((c) => <span key={c}>{c}</span>)}
              </div>
              <button
                onClick={copyBackupCodes}
                className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
            <p className="text-xs text-gray-400">Jeder Code kann nur einmal verwendet werden. Bei Verlust des Authenticators kannst du dich damit anmelden.</p>
            <button
              onClick={() => setStep('idle')}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              Fertig
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
                MFA deaktivieren
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Gib deinen Authenticator-Code ein um MFA zu deaktivieren:</p>
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
                    {disableMfa.isPending ? 'Deaktivieren...' : 'Deaktivieren'}
                  </button>
                  <button onClick={() => { setShowDisable(false); setDisableCode(''); setError(''); }} className="text-sm text-gray-400 hover:text-gray-600 px-2">
                    Abbrechen
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
