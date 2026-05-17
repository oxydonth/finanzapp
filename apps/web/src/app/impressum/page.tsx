import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum – Finanzapp',
  description: 'Impressum gemäß § 5 TMG für Finanzapp',
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo markSize={26} textClass="text-slate-900 font-bold" />
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            ← Zurück
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Impressum</h1>
        <p className="text-sm text-slate-500 mb-10">Angaben gemäß § 5 TMG</p>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Anbieter</h2>
          <div className="text-slate-700 leading-relaxed space-y-1 text-[15px]">
            <p className="font-semibold">Finanzapp UG (haftungsbeschränkt)</p>
            <p>Musterstraße 1</p>
            <p>10115 Berlin</p>
            <p>Deutschland</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Kontakt</h2>
          <div className="text-slate-700 leading-relaxed space-y-1 text-[15px]">
            <p>E-Mail: <a href="mailto:hallo@finanzapp.de" className="text-brand-600 hover:underline">hallo@finanzapp.de</a></p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Registereintrag</h2>
          <div className="text-slate-700 leading-relaxed space-y-1 text-[15px]">
            <p>Registergericht: Amtsgericht Berlin-Charlottenburg</p>
            <p>Registernummer: HRB [EINZUTRAGEN]</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Umsatzsteuer-ID</h2>
          <div className="text-slate-700 leading-relaxed text-[15px]">
            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE [EINZUTRAGEN]</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Vertreten durch</h2>
          <div className="text-slate-700 leading-relaxed text-[15px]">
            <p>Geschäftsführer: [NAME EINZUTRAGEN]</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
          <div className="text-slate-700 leading-relaxed space-y-1 text-[15px]">
            <p>[NAME EINZUTRAGEN]</p>
            <p>Musterstraße 1, 10115 Berlin</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Streitschlichtung</h2>
          <div className="text-slate-700 leading-relaxed text-[15px]">
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                https://ec.europa.eu/consumers/odr/
              </a>.
            </p>
            <p className="mt-2">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Haftung für Inhalte</h2>
          <div className="text-slate-700 leading-relaxed text-[15px]">
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
              verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen
              zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
