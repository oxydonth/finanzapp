import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b">
        <span className="text-2xl font-bold text-brand-600">Finanzapp</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">Anmelden</Link>
          <Link href="/register" className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">
            Kostenlos starten
          </Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-8 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Alle deutschen Bankkonten<br />auf einen Blick
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Verbinde Deutsche Bank, Sparkasse, ING, DKB, N26 und mehr.
          Ausgaben automatisch kategorisieren, Budgets planen, Finanzziele erreichen.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register" className="bg-brand-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-brand-700">
            Jetzt kostenlos testen
          </Link>
          <Link href="/login" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl text-lg font-semibold hover:bg-gray-50">
            Anmelden
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '🏦', title: '15+ deutsche Banken', desc: 'FinTS/HBCI Integration für alle großen deutschen Institute' },
            { icon: '📊', title: 'Automatische Kategorisierung', desc: 'KI-gestützte Erkennung von Einkäufen, Miete, Abos und mehr' },
            { icon: '🎯', title: 'Budgets & Ziele', desc: 'Monatliche Budgets pro Kategorie mit Echtzeit-Fortschritt' },
          ].map((f) => (
            <div key={f.title} className="text-center p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
