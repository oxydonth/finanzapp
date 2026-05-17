import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AGB – Finanzapp',
  description: 'Allgemeine Geschäftsbedingungen für Finanzapp',
};

export default function AgbPage() {
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
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-sm text-slate-500 mb-10">Stand: Mai 2026</p>

        <Section title="§ 1 Geltungsbereich">
          <p>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Finanzapp-Dienste,
            betrieben durch die Finanzapp UG (haftungsbeschränkt), Musterstraße 1, 10115 Berlin (nachfolgend „Anbieter").
          </p>
          <p>
            Durch die Registrierung akzeptierst du diese AGB sowie die{' '}
            <Link href="/datenschutz" className="text-brand-600 hover:underline">Datenschutzerklärung</Link>.
          </p>
        </Section>

        <Section title="§ 2 Leistungsbeschreibung">
          <p>
            Finanzapp ist ein persönliches Finanzmanagement-Tool, das Nutzern ermöglicht, ihre Bankkonten
            über standardisierte Schnittstellen (FinTS/HBCI, Open Banking) in Lesemodus abzurufen, Transaktionen
            zu analysieren, Budgets zu verwalten und Ausgaben zu kategorisieren.
          </p>
          <p>
            Der Dienst bietet ausschließlich Lesezugriff auf Kontodaten. Überweisungen oder andere
            Zahlungsaufträge sind nicht möglich.
          </p>
        </Section>

        <Section title="§ 3 Registrierung und Konto">
          <p>
            Die Nutzung erfordert eine Registrierung mit einer gültigen E-Mail-Adresse und einem Passwort.
            Du bist verpflichtet, deine Zugangsdaten sicher aufzubewahren und uns bei Verdacht auf Missbrauch
            unverzüglich zu informieren.
          </p>
          <p>
            Pro Person ist ein Konto zulässig. Die Weitergabe von Zugangsdaten an Dritte ist untersagt.
          </p>
        </Section>

        <Section title="§ 4 Nutzungsbedingungen">
          <p>Du verpflichtest dich, den Dienst nur für rechtmäßige Zwecke zu nutzen und insbesondere:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>keine automatisierten Abfragen über das erlaubte Maß hinaus durchzuführen,</li>
            <li>keine falschen oder irreführenden Angaben zu machen,</li>
            <li>keine Maßnahmen zu ergreifen, die die Infrastruktur des Anbieters gefährden.</li>
          </ul>
        </Section>

        <Section title="§ 5 Verfügbarkeit">
          <p>
            Der Anbieter strebt eine hohe Verfügbarkeit an, übernimmt jedoch keine Garantie für ununterbrochene
            Verfügbarkeit. Wartungsarbeiten werden nach Möglichkeit im Voraus angekündigt.
          </p>
        </Section>

        <Section title="§ 6 Preise und Zahlung">
          <p>
            Die Grundfunktionen von Finanzapp sind kostenlos nutzbar. Sollten zukünftig kostenpflichtige
            Features eingeführt werden, werden Nutzer mindestens 30 Tage im Voraus informiert.
          </p>
        </Section>

        <Section title="§ 7 Kündigung und Datenlöschung">
          <p>
            Du kannst dein Konto jederzeit unter Einstellungen → Konto löschen kündigen. Nach Kündigung
            werden alle personenbezogenen Daten und Finanzdaten innerhalb von 30 Tagen unwiderruflich gelöscht.
          </p>
          <p>
            Der Anbieter kann das Konto bei schwerwiegenden Verstößen gegen diese AGB nach vorheriger
            Warnung sperren oder löschen.
          </p>
        </Section>

        <Section title="§ 8 Haftungsbeschränkung">
          <p>
            Der Anbieter haftet nicht für die Richtigkeit, Vollständigkeit oder Aktualität der von den Banken
            übermittelten Daten. Finanzentscheidungen, die auf Basis der in der App angezeigten Daten getroffen
            werden, liegen in der alleinigen Verantwortung des Nutzers.
          </p>
          <p>
            Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, sofern keine wesentlichen
            Vertragspflichten verletzt werden und es sich nicht um Schäden aus der Verletzung des Lebens,
            des Körpers oder der Gesundheit handelt.
          </p>
        </Section>

        <Section title="§ 9 Änderungen der AGB">
          <p>
            Der Anbieter behält sich vor, diese AGB bei sachlichem Grund mit einer Ankündigungsfrist von
            mindestens 30 Tagen per E-Mail zu ändern. Widersprichst du der Änderung nicht innerhalb von
            30 Tagen, gelten die neuen AGB als akzeptiert.
          </p>
        </Section>

        <Section title="§ 10 Anwendbares Recht und Gerichtsstand">
          <p>
            Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für Kaufleute und
            juristische Personen ist Berlin.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-slate-100 text-sm text-slate-400">
          <p>Finanzapp UG (haftungsbeschränkt) · Musterstraße 1, 10115 Berlin</p>
          <p className="mt-1">
            Fragen:{' '}
            <a href="mailto:hallo@finanzapp.de" className="text-brand-600 hover:underline">hallo@finanzapp.de</a>
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
