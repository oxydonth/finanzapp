import Link from 'next/link';
import { Logo } from '../components/ui/Logo';
import { ArrowRight, ShieldCheck, Zap, BarChart3, PieChart, Target, Bell, Check } from 'lucide-react';

const FEATURES = [
  {
    icon: BarChart3,
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    title: '15+ deutsche Banken',
    desc: 'FinTS/HBCI Integration für Deutsche Bank, Sparkasse, ING, DKB, N26 und viele mehr.',
  },
  {
    icon: PieChart,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'Auto-Kategorisierung',
    desc: 'KI erkennt automatisch Einkäufe, Miete, Abos – mit eigenen Regeln anpassbar.',
  },
  {
    icon: Target,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'Budgets & Ziele',
    desc: 'Monatliche Limits pro Kategorie. Echtzeit-Fortschritt, sofort sichtbar.',
  },
  {
    icon: Bell,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Benachrichtigungen',
    desc: 'Werde informiert wenn dein Budget überschritten wird oder ungewöhnliche Ausgaben auftreten.',
  },
  {
    icon: ShieldCheck,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    title: 'Bankensicherheit',
    desc: 'Nur-Lese-Zugriff auf deine Konten. Keine Transaktionen möglich. Höchste Datensicherheit.',
  },
  {
    icon: Zap,
    color: 'text-brand-600',
    bg: 'bg-brand-50',
    title: 'Echtzeit-Daten',
    desc: 'Automatische Synchronisation mehrmals täglich. Immer aktuell.',
  },
];

const BANKS = ['Deutsche Bank', 'Sparkasse', 'ING', 'DKB', 'N26', 'Commerzbank', 'Volksbank', 'Comdirect'];

const HOW_IT_WORKS = [
  { step: '01', title: 'Bank verbinden', desc: 'Wähle deine Bank aus und verbinde sie sicher über FinTS/HBCI.' },
  { step: '02', title: 'Ausgaben analysieren', desc: 'Transaktionen werden automatisch importiert und kategorisiert.' },
  { step: '03', title: 'Finanzen im Griff', desc: 'Budgets setzen, Ziele verfolgen, Vermögen aufbauen.' },
];

const PLAN_ITEMS = [
  'Alle Bankkonten verbinden',
  'Automatische Kategorisierung',
  'Unbegrenzte Budgets',
  'Ausgaben-Statistiken',
  'Monatliche Reports',
  'Exportfunktion (CSV)',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo markSize={26} textClass="text-[14px] text-white" dark />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-slate-950 flex items-center overflow-hidden pt-14">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-radial from-brand-600/20 to-transparent blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-radial from-violet-600/15 to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-gradient-radial from-brand-500/10 to-transparent blur-3xl" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
          {/* Left – copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse shrink-0" />
              Jetzt kostenlos — keine Kreditkarte nötig
            </div>

            <h1 className="text-[clamp(2.6rem,5vw,4.2rem)] font-extrabold text-white leading-[1.08] tracking-[-0.03em] mb-6">
              Alle deutschen{' '}
              <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">
                Bankkonten
              </span>
              <br />auf einen Blick.
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Verbinde Deutsche Bank, Sparkasse, ING, DKB, N26 und mehr.
              Ausgaben automatisch kategorisieren, Budgets planen, Finanzziele erreichen.
            </p>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-10">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-150 shadow-lg shadow-brand-900/40 text-sm"
              >
                Jetzt kostenlos testen <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-6 py-3 rounded-xl transition-all duration-150 text-sm"
              >
                Bereits Konto? Anmelden
              </Link>
            </div>

            <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Check size={13} className="text-brand-400" /> Kein Abo</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-brand-400" /> Keine Kreditkarte</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-brand-400" /> DSGVO-konform</span>
            </div>
          </div>

          {/* Right – phone mockup */}
          <div className="shrink-0 relative">
            <div className="relative w-[280px] h-[560px]">
              {/* Phone frame */}
              <div className="absolute inset-0 rounded-[2.8rem] bg-gradient-to-b from-slate-700 to-slate-800 shadow-2xl shadow-black/60 ring-1 ring-white/10" />
              <div className="absolute inset-[3px] rounded-[2.5rem] bg-slate-900 overflow-hidden">
                {/* Screen content */}
                <div className="h-full flex flex-col p-5 pt-8">
                  {/* Status bar notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-slate-800" />

                  {/* App header */}
                  <div className="flex items-center justify-between mb-5 mt-2">
                    <div>
                      <p className="text-[10px] text-slate-500">Gesamtvermögen</p>
                      <p className="text-xl font-bold text-white tracking-tight">€18.420</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">M</div>
                  </div>

                  {/* Balance card */}
                  <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-violet-700 p-4 mb-4 shadow-lg">
                    <p className="text-[10px] text-white/60 mb-1">Girokonto DKB</p>
                    <p className="text-2xl font-bold text-white">€2.847,50</p>
                    <div className="flex justify-between mt-3 text-[10px] text-white/60">
                      <span>**** 4291</span>
                      <span className="text-white/80 font-medium">▲ +€320 diese Woche</span>
                    </div>
                  </div>

                  {/* Mini chart */}
                  <div className="rounded-xl bg-white/5 p-3 mb-4">
                    <p className="text-[10px] text-slate-400 mb-2">Ausgaben Mai</p>
                    <div className="flex items-end gap-1 h-12">
                      {[30, 55, 40, 70, 45, 85, 60, 50, 75, 45, 65, 80].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm ${i === 11 ? 'bg-brand-400' : 'bg-white/20'}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Recent txns */}
                  <div className="space-y-2">
                    {[
                      { icon: '🛒', name: 'Rewe', amount: '-€42,90', color: 'text-rose-400' },
                      { icon: '💰', name: 'Gehalt', amount: '+€3.200', color: 'text-emerald-400' },
                      { icon: '🍕', name: 'Lieferando', amount: '-€18,50', color: 'text-rose-400' },
                    ].map((tx) => (
                      <div key={tx.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-sm">{tx.icon}</div>
                          <span className="text-[11px] text-slate-300">{tx.name}</span>
                        </div>
                        <span className={`text-[11px] font-semibold ${tx.color}`}>{tx.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Glow under phone */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-12 bg-brand-600/30 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Bank logos ──────────────────────────────────────────────── */}
      <section className="bg-slate-950 border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-6">Kompatibel mit allen großen deutschen Banken</p>
          <div className="flex flex-wrap justify-center gap-3">
            {BANKS.map((bank) => (
              <span key={bank} className="px-4 py-2 rounded-xl bg-white/5 border border-white/8 text-slate-400 text-sm font-medium">
                {bank}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">So einfach geht's</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">In 3 Minuten startklar</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="relative text-center md:text-left">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-[calc(100%_-_16px)] w-8 h-px border-t-2 border-dashed border-slate-200 z-10" />
                )}
                <span className="inline-block text-5xl font-black text-slate-100 mb-4 leading-none">{item.step}</span>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────── */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Alles was du brauchst</h2>
            <p className="text-slate-500 mt-3 max-w-md mx-auto">Vollständige Finanzübersicht mit deutschen Datenschutzstandards.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-900/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing / CTA ───────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">Kostenlos</p>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Komplett gratis</h2>
          <p className="text-slate-500 mb-10">Alle Features enthalten. Kein Abo, kein Kleingedrucktes.</p>
          <div className="bg-slate-950 rounded-2xl p-8 text-left mb-8 ring-1 ring-white/5">
            <div className="flex items-end gap-1 mb-6">
              <span className="text-5xl font-extrabold text-white">0€</span>
              <span className="text-slate-400 mb-1.5">/Monat</span>
            </div>
            <div className="space-y-3">
              {PLAN_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-600/20 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-brand-400" />
                  </div>
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 w-full justify-center bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-brand-900/30"
          >
            Jetzt kostenlos starten <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <Logo markSize={22} textClass="text-[13px] text-white" dark />
          <div className="flex items-center gap-6">
            <Link href="/datenschutz" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Datenschutz</Link>
            <p className="text-xs text-slate-600">© 2026 Finanzapp · Made in Germany</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
