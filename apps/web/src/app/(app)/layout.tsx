'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight,
  Tag, Target, BarChart2, Building2, Settings, LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Übersicht' },
  { href: '/konten', icon: CreditCard, label: 'Konten' },
  { href: '/transaktionen', icon: ArrowLeftRight, label: 'Transaktionen' },
  { href: '/kategorien', icon: Tag, label: 'Kategorien' },
  { href: '/budget', icon: Target, label: 'Budget' },
  { href: '/statistiken', icon: BarChart2, label: 'Statistiken' },
  { href: '/banken', icon: Building2, label: 'Banken' },
  { href: '/einstellungen', icon: Settings, label: 'Einstellungen' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-xl font-bold text-brand-600">Finanzapp</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-1 text-sm text-gray-500">
            {user.firstName} {user.lastName}
          </div>
          <button
            onClick={() => { clearAuth(); router.push('/login'); }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
