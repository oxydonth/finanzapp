'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { LoginResponse, MfaChallengeResponse } from '@finanzapp/types';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
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
        setAuth(r.user, r.accessToken);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
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
      setAuth(res.user, res.accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ungültiger Code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {step === 'credentials' ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Willkommen zurück</h1>
            <p className="text-gray-500 mb-8">Melde dich bei Finanzapp an</p>

            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60"
              >
                {loading ? 'Anmelden...' : 'Anmelden'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Noch kein Konto?{' '}
              <Link href="/register" className="text-brand-600 font-medium hover:underline">Registrieren</Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Zwei-Faktor-Authentifizierung</h1>
            <p className="text-gray-500 mb-8">
              Gib den 6-stelligen Code aus deinem Microsoft Authenticator ein oder einen Backup-Code.
            </p>

            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleMfa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authentifizierungscode</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60"
              >
                {loading ? 'Überprüfen...' : 'Bestätigen'}
              </button>
            </form>

            <button
              onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 text-center"
            >
              ← Zurück zur Anmeldung
            </button>
          </>
        )}
      </div>
    </div>
  );
}
