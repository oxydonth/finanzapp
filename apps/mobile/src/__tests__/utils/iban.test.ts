import { isValidIBAN, maskIBAN, formatIBAN } from '../../shared/utils/iban';

describe('isValidIBAN', () => {
  it('accepts valid German IBAN', () => {
    expect(isValidIBAN('DE89370400440532013000')).toBe(true);
  });

  it('rejects IBAN with wrong checksum', () => {
    expect(isValidIBAN('DE00370400440532013000')).toBe(false);
  });

  it('rejects non-German IBAN', () => {
    expect(isValidIBAN('GB29NWBK60161331926819')).toBe(false);
  });

  it('rejects too-short string', () => {
    expect(isValidIBAN('DE12')).toBe(false);
  });

  it('accepts IBAN with spaces (strips them)', () => {
    expect(isValidIBAN('DE89 3704 0044 0532 0130 00')).toBe(true);
  });
});

describe('maskIBAN', () => {
  it('shows country code and last 4 digits', () => {
    const masked = maskIBAN('DE89370400440532013000');
    expect(masked).toContain('DE89');
    expect(masked).toContain('3000');
    expect(masked).toContain('****');
  });

  it('returns short IBANs unchanged', () => {
    expect(maskIBAN('DE12')).toBe('DE12');
  });
});

describe('formatIBAN', () => {
  it('groups into chunks of 4', () => {
    const formatted = formatIBAN('DE89370400440532013000');
    expect(formatted).toBe('DE89 3704 0044 0532 0130 00');
  });

  it('handles already-spaced IBAN', () => {
    const formatted = formatIBAN('DE89 3704 0044 0532 0130 00');
    expect(formatted).toContain('DE89');
  });
});
