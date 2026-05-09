export function formatEUR(cents: number, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function formatEURSigned(cents: number, locale = 'de-DE'): string {
  const formatted = formatEUR(Math.abs(cents), locale);
  return cents >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function parseCentsFromString(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}
