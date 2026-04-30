'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import type { BankRegistryEntry } from '@finanzapp/config';
import { Search, ChevronRight, Lock } from 'lucide-react';

type Step = 'select' | 'credentials' | 'tan' | 'done';

export default function VerbindenPage() {
  const router = useRouter();
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
        setTanChallenge(res.tanChallenge ?? 'Bitte TAN eingeben');
        setStep('tan');
      } else {
        setStep('done');
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen'),
  });

  const tanMutation = useMutation({
    mutationFn: (t: string) =>
      api.post('/banks/connections/dummy/tan', { sessionId, tan: t }),
    onSuccess: () => setStep('done'),
    onError: (err) => setError(err instanceof Error ? err.message : 'TAN fehlgeschlagen'),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bank verbinden</h1>
      <div className="flex items-center gap-2 mb-8">
        {(['select', 'credentials', 'tan', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {step === 'select' && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              placeholder="Bank oder BLZ suchen..."
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map((bank) => (
              <button
                key={bank.blz}
                onClick={() => { setSelectedBank(bank); setStep('credentials'); }}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-brand-200 hover:shadow-sm transition-all text-left"
              >
                <div>
                  <p className="font-medium text-gray-900">{bank.name}</p>
                  <p className="text-xs text-gray-400">BLZ: {bank.blz}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'credentials' && selectedBank && (
        <div>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="font-medium">{selectedBank.name}</p>
            <p className="text-sm text-gray-500">BLZ: {selectedBank.blz}</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Benutzername / Kontonummer</label>
              <input
                value={creds.loginName}
                onChange={(e) => setCreds({ ...creds, loginName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Online-Banking PIN</label>
              <input
                type="password"
                value={creds.pin}
                onChange={(e) => setCreds({ ...creds, pin: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              <Lock className="w-3 h-3 shrink-0" />
              Deine Zugangsdaten werden AES-256 verschlüsselt gespeichert und niemals im Klartext übertragen.
            </div>
            <button
              onClick={() => connectMutation.mutate({ bankCode: selectedBank.blz, ...creds })}
              disabled={connectMutation.isPending || !creds.loginName || !creds.pin}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {connectMutation.isPending ? 'Verbinden...' : 'Bank verbinden'}
            </button>
          </div>
        </div>
      )}

      {step === 'tan' && (
        <div>
          <p className="text-gray-700 mb-4">{tanChallenge}</p>
          <input
            value={tan}
            onChange={(e) => setTan(e.target.value)}
            placeholder="TAN eingeben"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={() => tanMutation.mutate(tan)}
            disabled={tanMutation.isPending || !tan}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {tanMutation.isPending ? 'Prüfen...' : 'TAN bestätigen'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">Bank erfolgreich verbunden!</h2>
          <p className="text-gray-500 mb-6">Deine Konten werden jetzt synchronisiert.</p>
          <button
            onClick={() => router.push('/banken')}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700"
          >
            Zu meinen Banken
          </button>
        </div>
      )}
    </div>
  );
}
