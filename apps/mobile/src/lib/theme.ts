export const C = {
  // Brand
  brand: '#4f46e5',
  brandDark: '#4338ca',
  brandLight: '#eef2ff',
  brandMid: '#818cf8',
  brandGlow: 'rgba(79,70,229,0.15)',

  // Dark
  dark: '#0f172a',
  dark2: '#1e293b',
  dark3: '#334155',

  // Backgrounds
  bg: '#f8fafc',
  surface: '#ffffff',

  // Text
  text: '#0f172a',
  textSub: '#64748b',
  textMuted: '#94a3b8',

  // Borders
  border: '#e2e8f0',
  divider: '#f1f5f9',

  // Status
  emerald: '#10b981',
  emeraldBg: '#ecfdf5',
  rose: '#f43f5e',
  roseBg: '#fff1f2',
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  violet: '#7c3aed',
  violetBg: '#f5f3ff',
} as const;

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
