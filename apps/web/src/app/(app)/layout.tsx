'use client';
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight,
  Tag, Target, BarChart2, Building2, Settings, LogOut,
} from 'lucide-react';
import { LogoMark } from '../../components/ui/Logo';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const { t, i18n } = useTranslation();
  const localeSynced = useRef(false);

  // Apply user's saved locale on first load, unless user has manually chosen a language
  useEffect(() => {
    if (!user?.locale || localeSynced.current) return;
    const manualChoice = typeof window !== 'undefined' && localStorage.getItem('i18nextLng');
    if (!manualChoice) {
      const code = user.locale.split('-')[0];
      i18n.changeLanguage(code);
    }
    localeSynced.current = true;
  }, [user, i18n]);

  const NAV = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/konten', icon: CreditCard, label: t('nav.accounts') },
    { href: '/transaktionen', icon: ArrowLeftRight, label: t('nav.transactions') },
    { href: '/kategorien', icon: Tag, label: t('nav.categories') },
    { href: '/budget', icon: Target, label: t('nav.budget') },
    { href: '/statistiken', icon: BarChart2, label: t('nav.statistics') },
    { href: '/banken', icon: Building2, label: t('nav.banks') },
    { href: '/einstellungen', icon: Settings, label: t('nav.settings') },
  ];

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 shrink-0 bg-slate-950 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-[14px] font-semibold text-white tracking-tight">Finanzapp</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-brand-500/20 text-brand-300 shadow-sm'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                }`}
              >
                <Icon size={16} className={`shrink-0 ${active ? 'text-brand-400' : ''}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2.5 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => { clearAuth(); router.push('/login'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-white/[0.06] transition-all duration-150 text-sm font-medium"
          >
            <LogOut size={16} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
