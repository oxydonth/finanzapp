import { useThemeStore } from '../store/themeStore';

const lightColors = {
  brand: '#4f46e5',
  brandDark: '#4338ca',
  brandLight: '#eef2ff',
  brandMid: '#818cf8',
  brandGlow: 'rgba(79,70,229,0.15)',
  dark: '#0f172a',
  dark2: '#1e293b',
  dark3: '#334155',
  bg: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  divider: '#f1f5f9',
  emerald: '#10b981',
  emeraldBg: '#ecfdf5',
  rose: '#f43f5e',
  roseBg: '#fff1f2',
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  violet: '#7c3aed',
  violetBg: '#f5f3ff',
};

const darkColors = {
  brand: '#818cf8',
  brandDark: '#6366f1',
  brandLight: 'rgba(99,102,241,0.15)',
  brandMid: '#a5b4fc',
  brandGlow: 'rgba(99,102,241,0.2)',
  dark: '#020617',
  dark2: '#0f172a',
  dark3: '#1e293b',
  bg: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSub: '#94a3b8',
  textMuted: '#475569',
  border: '#334155',
  divider: '#1e293b',
  emerald: '#34d399',
  emeraldBg: 'rgba(52,211,153,0.12)',
  rose: '#fb7185',
  roseBg: 'rgba(251,113,133,0.12)',
  amber: '#fbbf24',
  amberBg: 'rgba(251,191,36,0.12)',
  violet: '#a78bfa',
  violetBg: 'rgba(167,139,250,0.12)',
};

const girlyColors = {
  brand: '#ec4899',
  brandDark: '#db2777',
  brandLight: '#fce7f3',
  brandMid: '#f472b6',
  brandGlow: 'rgba(236,72,153,0.15)',
  dark: '#db2777',
  dark2: '#be185d',
  dark3: '#9d174d',
  bg: '#fdf2f8',
  surface: '#ffffff',
  text: '#0f172a',
  textSub: '#6b7280',
  textMuted: '#9ca3af',
  border: '#fbcfe8',
  divider: '#fce7f3',
  emerald: '#10b981',
  emeraldBg: '#ecfdf5',
  rose: '#f43f5e',
  roseBg: '#fff1f2',
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  violet: '#ec4899',
  violetBg: '#fce7f3',
};

export type ThemeColors = typeof lightColors;

const themeColors = { light: lightColors, dark: darkColors, girly: girlyColors };

export function useTheme(): ThemeColors {
  const theme = useThemeStore((s) => s.theme);
  return themeColors[theme];
}

// Legacy alias — kept so TYPE_COLORS and other module-level constants still compile.
// Screens should call useTheme() instead for reactive updates.
export const C = lightColors;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;
