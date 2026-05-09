'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { LoginResponse } from '@finanzapp/types';
import { Logo } from '../../../components/ui/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/register', form);
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registrationFailed'));
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
        <div className="mt-auto space-y-4">
          {[
            { emoji: '🏦', text: '15+ deutsche Banken verbinden' },
            { emoji: '📊', text: 'Ausgaben automatisch kategorisieren' },
            { emoji: '🎯', text: 'Budgets setzen und verfolgen' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-slate-300 text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden mb-8">
            <Logo markSize={26} textClass="text-[14px]" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">{t('auth.createAccount')}</h1>
          <p className="text-slate-500 mb-8 text-sm">{t('auth.startForFree')}</p>

          {error && (
            <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-5 text-sm ring-1 ring-rose-200/60">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(['firstName', 'lastName'] as const).map((f) => (
                <div key={f}>
                  <label className="label">
                    {f === 'firstName' ? t('auth.firstName') : t('auth.lastName')}
                  </label>
                  <input
                    value={form[f]}
                    onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                    required
                    className="input"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="input"
                placeholder="max@example.com"
              />
            </div>
            <div>
              <label className="label">{t('auth.passwordMin8')}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                required
                className="input"
                placeholder="Min. 8 Zeichen"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {t('auth.alreadyRegistered')}{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">{t('auth.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
