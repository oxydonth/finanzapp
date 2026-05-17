import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finanzapp – Deine Finanzen im Überblick',
  description: 'Alle deutschen Bankkonten auf einen Blick. Ausgaben tracken, Budgets planen.',
  metadataBase: new URL('https://finanzapp.de'),
  openGraph: {
    title: 'Finanzapp – Deine Finanzen im Überblick',
    description: 'Alle deutschen Bankkonten auf einen Blick. Ausgaben tracken, Budgets planen.',
    url: 'https://finanzapp.de',
    siteName: 'Finanzapp',
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Finanzapp – Deine Finanzen im Überblick',
    description: 'Alle deutschen Bankkonten auf einen Blick.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('finanzapp-theme');var d=s?JSON.parse(s):null;var t=d&&d.state&&d.state.theme;if(t==='dark')document.documentElement.classList.add('dark');else if(t==='girly')document.documentElement.classList.add('girly');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
