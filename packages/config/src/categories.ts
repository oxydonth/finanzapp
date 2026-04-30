export interface SystemCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
  children?: Omit<SystemCategory, 'children'>[];
}

export const SYSTEM_CATEGORIES: SystemCategory[] = [
  // ── Income ──────────────────────────────────────────────────────────────
  {
    id: 'income',
    name: 'Einnahmen',
    icon: '💰',
    color: '#22C55E',
    isIncome: true,
    children: [
      { id: 'income-salary', name: 'Gehalt', icon: '💼', color: '#16A34A', isIncome: true },
      { id: 'income-freelance', name: 'Freelance', icon: '🖥️', color: '#15803D', isIncome: true },
      { id: 'income-rental', name: 'Mieteinnahmen', icon: '🏠', color: '#166534', isIncome: true },
      { id: 'income-investment', name: 'Kapitalerträge', icon: '📈', color: '#14532D', isIncome: true },
      { id: 'income-other', name: 'Sonstige Einnahmen', icon: '➕', color: '#4ADE80', isIncome: true },
    ],
  },
  // ── Housing ──────────────────────────────────────────────────────────────
  {
    id: 'housing',
    name: 'Wohnen',
    icon: '🏠',
    color: '#3B82F6',
    isIncome: false,
    children: [
      { id: 'housing-rent', name: 'Miete', icon: '🏘️', color: '#2563EB', isIncome: false },
      { id: 'housing-mortgage', name: 'Hypothek', icon: '🏦', color: '#1D4ED8', isIncome: false },
      { id: 'housing-utilities', name: 'Nebenkosten', icon: '💡', color: '#1E40AF', isIncome: false },
      { id: 'housing-insurance', name: 'Hausversicherung', icon: '🛡️', color: '#1E3A8A', isIncome: false },
      { id: 'housing-maintenance', name: 'Reparaturen', icon: '🔧', color: '#60A5FA', isIncome: false },
    ],
  },
  // ── Food & Groceries ─────────────────────────────────────────────────────
  {
    id: 'food',
    name: 'Ernährung',
    icon: '🛒',
    color: '#F59E0B',
    isIncome: false,
    children: [
      { id: 'food-groceries', name: 'Lebensmittel', icon: '🥦', color: '#D97706', isIncome: false },
      { id: 'food-restaurant', name: 'Restaurant', icon: '🍽️', color: '#B45309', isIncome: false },
      { id: 'food-delivery', name: 'Lieferdienste', icon: '🛵', color: '#92400E', isIncome: false },
      { id: 'food-cafe', name: 'Café & Bäcker', icon: '☕', color: '#FBBF24', isIncome: false },
    ],
  },
  // ── Transport ────────────────────────────────────────────────────────────
  {
    id: 'transport',
    name: 'Mobilität',
    icon: '🚗',
    color: '#8B5CF6',
    isIncome: false,
    children: [
      { id: 'transport-public', name: 'ÖPNV', icon: '🚆', color: '#7C3AED', isIncome: false },
      { id: 'transport-car', name: 'Auto', icon: '⛽', color: '#6D28D9', isIncome: false },
      { id: 'transport-taxi', name: 'Taxi & Ridesharing', icon: '🚕', color: '#5B21B6', isIncome: false },
      { id: 'transport-flight', name: 'Flüge', icon: '✈️', color: '#4C1D95', isIncome: false },
    ],
  },
  // ── Health ───────────────────────────────────────────────────────────────
  {
    id: 'health',
    name: 'Gesundheit',
    icon: '❤️',
    color: '#EF4444',
    isIncome: false,
    children: [
      { id: 'health-insurance', name: 'Krankenversicherung', icon: '🏥', color: '#DC2626', isIncome: false },
      { id: 'health-pharmacy', name: 'Apotheke', icon: '💊', color: '#B91C1C', isIncome: false },
      { id: 'health-doctor', name: 'Arztkosten', icon: '👨‍⚕️', color: '#991B1B', isIncome: false },
      { id: 'health-sports', name: 'Sport & Fitness', icon: '🏋️', color: '#F87171', isIncome: false },
    ],
  },
  // ── Entertainment ────────────────────────────────────────────────────────
  {
    id: 'entertainment',
    name: 'Freizeit',
    icon: '🎬',
    color: '#EC4899',
    isIncome: false,
    children: [
      { id: 'entertainment-streaming', name: 'Streaming', icon: '📺', color: '#DB2777', isIncome: false },
      { id: 'entertainment-music', name: 'Musik', icon: '🎵', color: '#BE185D', isIncome: false },
      { id: 'entertainment-gaming', name: 'Gaming', icon: '🎮', color: '#9D174D', isIncome: false },
      { id: 'entertainment-cinema', name: 'Kino & Events', icon: '🎟️', color: '#F472B6', isIncome: false },
    ],
  },
  // ── Shopping ─────────────────────────────────────────────────────────────
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    color: '#F97316',
    isIncome: false,
    children: [
      { id: 'shopping-clothing', name: 'Kleidung', icon: '👗', color: '#EA580C', isIncome: false },
      { id: 'shopping-electronics', name: 'Elektronik', icon: '💻', color: '#C2410C', isIncome: false },
      { id: 'shopping-household', name: 'Haushalt', icon: '🪴', color: '#9A3412', isIncome: false },
      { id: 'shopping-online', name: 'Online Shopping', icon: '📦', color: '#FB923C', isIncome: false },
    ],
  },
  // ── Savings & Investments ─────────────────────────────────────────────────
  {
    id: 'savings',
    name: 'Sparen & Investieren',
    icon: '📊',
    color: '#14B8A6',
    isIncome: false,
    children: [
      { id: 'savings-etf', name: 'ETF / Aktien', icon: '📈', color: '#0D9488', isIncome: false },
      { id: 'savings-pension', name: 'Altersvorsorge', icon: '🏦', color: '#0F766E', isIncome: false },
      { id: 'savings-savings', name: 'Sparbuch', icon: '🐷', color: '#115E59', isIncome: false },
    ],
  },
  // ── Taxes & Fees ─────────────────────────────────────────────────────────
  {
    id: 'taxes',
    name: 'Steuern & Abgaben',
    icon: '📋',
    color: '#6B7280',
    isIncome: false,
    children: [
      { id: 'taxes-income', name: 'Einkommensteuer', icon: '🏛️', color: '#4B5563', isIncome: false },
      { id: 'taxes-church', name: 'Kirchensteuer', icon: '⛪', color: '#374151', isIncome: false },
      { id: 'taxes-fees', name: 'Gebühren', icon: '💳', color: '#9CA3AF', isIncome: false },
    ],
  },
  // ── Uncategorized ─────────────────────────────────────────────────────────
  {
    id: 'other',
    name: 'Sonstiges',
    icon: '❓',
    color: '#94A3B8',
    isIncome: false,
  },
];
