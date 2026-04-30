/** Validate a German IBAN (DE + 20 digits) */
export function isValidIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^DE\d{20}$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged
    .split('')
    .map((c) => (/[A-Z]/.test(c) ? (c.charCodeAt(0) - 55).toString() : c))
    .join('');
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  return remainder === 1;
}

/** Mask an IBAN for display: "DE89370400440532013000" → "DE89 **** **** **** 3000" */
export function maskIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (cleaned.length < 8) return cleaned;
  const visible = cleaned.slice(-4);
  const country = cleaned.slice(0, 4);
  return `${country} **** **** **** ${visible}`;
}

/** Format IBAN with spaces: "DE89..." → "DE89 3704 0044 0532 0130 00" */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '');
  return cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
}
