import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – Finanzapp',
  description: 'Datenschutzerklärung gemäß DSGVO für Finanzapp',
};

const CONTACT = {
  name: 'Finanzapp UG (haftungsbeschränkt)',
  address: 'Musterstraße 1, 10115 Berlin',
  email: 'datenschutz@finanzapp.de',
};

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
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
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Datenschutzerklärung</h1>
        <p className="text-sm text-slate-500 mb-10">Stand: Mai 2026 · gemäß Art. 13 & 14 DSGVO</p>

        <Section title="1. Verantwortlicher">
          <p>
            {CONTACT.name}<br />
            {CONTACT.address}<br />
            E-Mail: <a href={`mailto:${CONTACT.email}`} className="text-brand-600 hover:underline">{CONTACT.email}</a>
          </p>
        </Section>

        <Section title="2. Verarbeitete Daten & Zwecke">
          <p>Wir verarbeiten folgende Datenkategorien ausschließlich zur Erbringung unseres Dienstes:</p>
          <Table rows={[
            ['Stammdaten', 'Name, E-Mail-Adresse', 'Kontoführung, Kommunikation', 'Art. 6 Abs. 1 lit. b DSGVO'],
            ['Bankzugangsdaten', 'Online-Banking-Kennung (AES-256 verschlüsselt), PIN (AES-256, nur-lese Zugriff)', 'Kontoabruf via FinTS/HBCI', 'Art. 6 Abs. 1 lit. b DSGVO'],
            ['Kontobewegungen', 'Transaktionen, Salden, IBANs', 'Anzeige & Analyse Ihrer Finanzdaten', 'Art. 6 Abs. 1 lit. b DSGVO'],
            ['Gerätedaten', 'IP-Adresse (temporär in Logs)', 'Sicherheit & Missbrauchsschutz', 'Art. 6 Abs. 1 lit. f DSGVO'],
          ]} headers={['Kategorie', 'Daten', 'Zweck', 'Rechtsgrundlage']} />
        </Section>

        <Section title="3. Datensicherheit">
          <ul className="list-disc pl-5 space-y-1">
            <li>Bank-PINs werden mit AES-256-GCM verschlüsselt; der Schlüssel wird getrennt vom Datenbankserver gespeichert.</li>
            <li>Passwörter werden ausschließlich als bcrypt-Hash (Kostenfaktor 12) gespeichert, niemals im Klartext.</li>
            <li>Alle Verbindungen sind TLS-verschlüsselt (HTTPS).</li>
            <li>Zugriff auf Ihr Konto erfolgt ausschließlich im Lesemodus; Überweisungen sind nicht möglich.</li>
            <li>Refresh-Tokens werden als Hash gespeichert und bei Abmeldung invalidiert.</li>
          </ul>
        </Section>

        <Section title="4. Speicherdauer">
          <p>
            Ihre Daten werden für die Dauer der Vertragsbeziehung gespeichert. Nach Kündigung bzw. Kontolöschung
            werden alle personenbezogenen Daten und Finanzdaten innerhalb von <strong>30 Tagen</strong> unwiderruflich
            gelöscht. Gesetzliche Aufbewahrungspflichten (§ 257 HGB, § 147 AO) bleiben unberührt, sofern sie
            ausnahmsweise greifen.
          </p>
        </Section>

        <Section title="5. Ihre Rechte (Art. 15–22 DSGVO)">
          <Table rows={[
            ['Auskunft', 'Art. 15', 'Download aller Ihrer Daten unter Einstellungen → Datenexport'],
            ['Berichtigung', 'Art. 16', 'Profil-Einstellungen in der App'],
            ['Löschung', 'Art. 17', 'Einstellungen → Konto löschen (sofortige Wirkung)'],
            ['Einschränkung', 'Art. 18', 'Anfrage an ' + CONTACT.email],
            ['Portabilität', 'Art. 20', 'JSON-Export unter Einstellungen → Datenexport'],
            ['Widerspruch', 'Art. 21', 'Anfrage an ' + CONTACT.email],
          ]} headers={['Recht', 'Artikel', 'Umsetzung']} />
          <p className="mt-4 text-sm">
            Sie haben außerdem das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren.
            In Berlin ist dies der <strong>Berliner Beauftragte für Datenschutz und Informationsfreiheit</strong> (BlnBDI).
          </p>
        </Section>

        <Section title="6. Weitergabe an Dritte">
          <p>
            Wir geben Ihre Daten nicht an Dritte zu Werbezwecken weiter. Eine Weitergabe erfolgt ausschließlich:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>An Hosting-Dienstleister (Render, Vercel) im Rahmen eines Auftragsverarbeitungsvertrags (AVV).</li>
            <li>Bei gesetzlicher Verpflichtung (z. B. behördliche Anfragen).</li>
          </ul>
          <p className="mt-2">
            Die Kommunikation mit Ihrer Bank erfolgt direkt via FinTS/HBCI-Protokoll – keine Daten werden an
            Drittanbieter für Bankdatenanalyse weitergegeben.
          </p>
        </Section>

        <Section title="7. Cookies & Tracking">
          <p>
            Finanzapp setzt <strong>keine Tracking-Cookies</strong> und keine Analyse-Tools von Drittanbietern ein.
            Authentifizierungs-Token werden im Arbeitsspeicher der App (nicht dauerhaft im Browser) vorgehalten.
            Es werden keine Werbecookies oder ähnliche Technologien eingesetzt.
          </p>
        </Section>

        <Section title="8. Änderungen dieser Erklärung">
          <p>
            Bei wesentlichen Änderungen informieren wir registrierte Nutzer per E-Mail mindestens 30 Tage im Voraus.
            Das Datum „Stand:" oben gibt die letzte Aktualisierung an.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-slate-100 text-sm text-slate-400">
          <p>{CONTACT.name} · {CONTACT.address}</p>
          <p className="mt-1">
            Fragen zum Datenschutz:{' '}
            <a href={`mailto:${CONTACT.email}`} className="text-brand-600 hover:underline">{CONTACT.email}</a>
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-slate-700 leading-relaxed space-y-2 text-[15px]">{children}</div>
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 font-semibold text-slate-700 border border-slate-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border border-slate-200 text-slate-600">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
