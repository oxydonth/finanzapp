'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { LoginResponse, MfaChallengeResponse } from '@finanzapp/types';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../../components/ui/Logo';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<LoginResponse | MfaChallengeResponse>('/auth/login', { email, password });
      if ('requiresMfa' in res && res.requiresMfa) {
        setMfaToken(res.mfaToken);
        setStep('mfa');
      } else {
        const r = res as LoginResponse;
        setAuth(r.user, r.accessToken, r.refreshToken);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/mfa/complete', { mfaToken, code });
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[420px] bg-slate-950 flex-col p-10 shrink-0">
        <Link href="/" className="mb-auto">
          <Logo markSize={30} textClass="text-[15px] text-white" dark />
        </Link>
        <div className="mt-auto">
          <blockquote className="text-slate-300 text-lg font-medium leading-relaxed mb-4">
            "Endlich alle Konten auf einen Blick – ohne zwischen 5 Apps zu wechseln."
          </blockquote>
          <p className="text-slate-500 text-sm">— Nutzer aus München</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          {step === 'credentials' ? (
            <div className="animate-fade-in">
              <div className="lg:hidden mb-8">
                <Logo markSize={26} textClass="text-[14px]" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{t('auth.welcomeBack')}</h1>
              <p className="text-slate-500 mb-8 text-sm">{t('auth.signInSubtitle')}</p>

              {error && (
                <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-5 text-sm ring-1 ring-rose-200/60">
                  {error}
                </div>
              )}

              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="label">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input"
                    placeholder="max@example.com"
                  />
                </div>
                <div>
                  <label className="label">{t('auth.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
                  {loading ? t('auth.signingIn') : t('auth.signIn')}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                {t('auth.noAccount')}{' '}
                <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">{t('auth.register')}</Link>
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <button
                onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
              >
                <ArrowLeft size={14} /> {t('auth.backToLogin')}
              </button>

              <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{t('auth.twoFactor')}</h1>
              <p className="text-slate-500 mb-8 text-sm">{t('auth.twoFactorSubtitle')}</p>

              {error && (
                <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-5 text-sm ring-1 ring-rose-200/60">
                  {error}
                </div>
              )}

              <form onSubmit={handleMfa} className="space-y-4">
                <div>
                  <label className="label">{t('auth.authCode')}</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                    placeholder="000 000"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    autoFocus
                    className="input text-center text-2xl tracking-[0.4em] font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="btn-primary w-full py-2.5"
                >
                  {loading ? t('auth.verifying') : t('auth.confirm')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
