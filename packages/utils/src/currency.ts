/** Format euro cents as a localised German currency string: 1234 → "12,34 €" */
export function formatEUR(cents: number, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/** Format cents as a signed string with explicit +/- sign */
export function formatEURSigned(cents: number, locale = 'de-DE'): string {
  const formatted = formatEUR(Math.abs(cents), locale);
  return cents >= 0 ? `+${formatted}` : `-${formatted}`;
}

/** Parse a German-formatted number string to cents: "12,34" → 1234 */
export function parseCentsFromString(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
}

/** Convert euros (float) to cents integer */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Convert cents integer to euros float */
export function centsToEuros(cents: number): number {
  return cents / 100;
}
