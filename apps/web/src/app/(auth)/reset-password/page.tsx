'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Logo } from '../../../components/ui/Logo';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) setError('Kein Reset-Token gefunden. Bitte fordere einen neuen Link an.');
    else setToken(t);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[420px] bg-slate-950 flex-col p-10 shrink-0">
        <Link href="/" className="mb-auto">
          <Logo markSize={30} textClass="text-[15px] text-white" dark />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden mb-8">
            <Logo markSize={26} textClass="text-[14px]" />
          </div>

          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-600" size={28} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">Passwort geändert</h1>
              <p className="text-slate-500 text-sm">Du wirst in Kürze zum Login weitergeleitet…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">Neues Passwort setzen</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                Mindestens 8 Zeichen. Alle aktiven Sitzungen werden beendet.
              </p>

              {error && (
                <div className="flex items-center gap-2.5 bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-5 text-sm ring-1 ring-rose-200/60">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Neues Passwort</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    disabled={!token}
                    className="input"
                    placeholder="Min. 8 Zeichen"
                  />
                </div>
                <div>
                  <label className="label">Passwort bestätigen</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={8}
                    required
                    disabled={!token}
                    className="input"
                    placeholder="Passwort wiederholen"
                  />
                </div>
                <button type="submit" disabled={loading || !token} className="btn-primary w-full py-2.5 mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Speichere…' : 'Passwort speichern'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                <Link href="/forgot-password" className="text-brand-600 font-medium hover:text-brand-700">
                  Neuen Reset-Link anfordern
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
