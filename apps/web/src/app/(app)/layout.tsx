'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { api } from '../../lib/api';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight,
  Tag, Target, BarChart2, Building2, Settings, LogOut,
  Sparkles, Wallet, ShoppingBag, Bookmark, Gift, TrendingUp, Landmark, SlidersHorizontal, Heart,
  MailWarning, X,
} from 'lucide-react';
import { LogoMark } from '../../components/ui/Logo';
import type { LucideIcon } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const { t, i18n } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const localeSynced = useRef(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const resendMutation = useMutation({
    mutationFn: () => api.post('/auth/resend-verification', {}),
  });

  // Sync user's locale from DB on first load — overrides browser/OS detection
  useEffect(() => {
    if (!user?.locale || localeSynced.current) return;
    const code = user.locale.split('-')[0];
    if (i18n.language.split('-')[0] !== code) {
      i18n.changeLanguage(code);
    }
    localeSynced.current = true;
  }, [user, i18n]);

  const NAV: { href: string; icon: LucideIcon; girlyIcon: LucideIcon; label: string }[] = [
    { href: '/dashboard',    icon: LayoutDashboard, girlyIcon: Sparkles,         label: t('nav.dashboard') },
    { href: '/accounts',     icon: CreditCard,      girlyIcon: Wallet,           label: t('nav.accounts') },
    { href: '/transactions', icon: ArrowLeftRight,  girlyIcon: ShoppingBag,      label: t('nav.transactions') },
    { href: '/categories',   icon: Tag,             girlyIcon: Bookmark,         label: t('nav.categories') },
    { href: '/budget',       icon: Target,          girlyIcon: Gift,             label: t('nav.budget') },
    { href: '/statistics',   icon: BarChart2,       girlyIcon: TrendingUp,       label: t('nav.statistics') },
    { href: '/banks',        icon: Building2,       girlyIcon: Landmark,         label: t('nav.banks') },
    { href: '/settings',     icon: Settings,        girlyIcon: SlidersHorizontal, label: t('nav.settings') },
  ];

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const isGirly = theme === 'girly';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 girly:bg-pink-50">
      <aside className="w-64 shrink-0 bg-slate-950 girly:bg-pink-400 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/[0.06] girly:border-pink-300/40">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="text-[14px] font-semibold text-white tracking-tight">
              {isGirly ? '✿ Finanzapp' : 'Finanzapp'}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, girlyIcon: GirlyIcon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            const NavIcon = isGirly ? GirlyIcon : Icon;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-brand-500/20 text-brand-300 shadow-sm girly:bg-white/30 girly:text-white'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 girly:text-pink-100 girly:hover:bg-white/20 girly:hover:text-white'
                }`}
              >
                <NavIcon size={16} className={`shrink-0 ${active ? 'text-brand-400 girly:text-white' : 'girly:text-pink-100'}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2.5 py-3 border-t border-white/[0.06] girly:border-pink-300/40">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 girly:from-pink-200 girly:to-rose-300 flex items-center justify-center text-xs font-bold text-white girly:text-pink-700 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300 girly:text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[11px] text-slate-500 girly:text-pink-100 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => { clearAuth(); router.push('/login'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-slate-500 hover:text-rose-400 hover:bg-white/[0.06] girly:text-pink-100 girly:hover:text-white girly:hover:bg-white/20 transition-all duration-150 text-sm font-medium"
          >
            {isGirly ? <Heart size={16} /> : <LogOut size={16} />}
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        {!user.isEmailVerified && !bannerDismissed && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-200/60 text-amber-800 text-sm shrink-0">
            <MailWarning size={15} className="shrink-0 text-amber-500" />
            <span className="flex-1">
              {t('auth.emailNotVerified')}{' '}
              <button
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending || resendMutation.isSuccess}
                className="font-semibold underline hover:no-underline disabled:opacity-60"
              >
                {resendMutation.isSuccess ? t('auth.emailSent') : t('auth.resendVerification')}
              </button>
            </span>
            <button onClick={() => setBannerDismissed(true)} className="text-amber-400 hover:text-amber-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
