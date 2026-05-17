'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Logo } from '../../../components/ui/Logo';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
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

          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-emerald-600" size={28} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">E-Mail versendet</h1>
              <p className="text-slate-500 text-sm mb-6">
                Falls ein Konto mit dieser E-Mail existiert, hast du einen Link zum Zurücksetzen erhalten. Bitte prüfe auch deinen Spam-Ordner.
              </p>
              <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700 text-sm">
                Zurück zum Login
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
                <ArrowLeft size={14} /> Zurück zum Login
              </Link>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">Passwort vergessen?</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                Gib deine E-Mail ein – wir senden dir einen Link zum Zurücksetzen.
              </p>

              {error && (
                <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-5 text-sm ring-1 ring-rose-200/60">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">E-Mail-Adresse</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input"
                    placeholder="max@example.com"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
                  {loading ? 'Sende Link…' : 'Reset-Link senden'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
