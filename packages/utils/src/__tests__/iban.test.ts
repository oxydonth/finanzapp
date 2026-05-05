import { describe, it, expect } from 'vitest';
import { isValidIBAN, maskIBAN, formatIBAN } from '../iban';

const VALID_IBAN = 'DE89370400440532013000';
const INVALID_CHECKSUM = 'DE00370400440532013000';
const NON_DE_IBAN = 'GB29NWBK60161331926819';

describe('isValidIBAN', () => {
  it('accepts a valid German IBAN', () => {
    expect(isValidIBAN(VALID_IBAN)).toBe(true);
  });

  it('rejects wrong checksum', () => {
    expect(isValidIBAN(INVALID_CHECKSUM)).toBe(false);
  });

  it('rejects non-German IBAN', () => {
    expect(isValidIBAN(NON_DE_IBAN)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidIBAN('')).toBe(false);
  });

  it('handles spaces in IBAN', () => {
    expect(isValidIBAN('DE89 3704 0044 0532 0130 00')).toBe(true);
  });

  it('handles lowercase input', () => {
    expect(isValidIBAN('de89370400440532013000')).toBe(true);
  });

  it('rejects IBAN too short', () => {
    expect(isValidIBAN('DE89')).toBe(false);
  });
});

describe('maskIBAN', () => {
  it('masks middle digits preserving country code and last 4', () => {
    const result = maskIBAN(VALID_IBAN);
    expect(result).toBe('DE89 **** **** **** 3000');
  });

  it('shows last 4 digits', () => {
    const result = maskIBAN(VALID_IBAN);
    expect(result).toContain('3000');
  });

  it('shows first 4 characters', () => {
    const result = maskIBAN(VALID_IBAN);
    expect(result.startsWith('DE89')).toBe(true);
  });

  it('handles short input gracefully', () => {
    expect(maskIBAN('DE89')).toBe('DE89');
  });
});

describe('formatIBAN', () => {
  it('inserts spaces every 4 chars', () => {
    expect(formatIBAN(VALID_IBAN)).toBe('DE89 3704 0044 0532 0130 00');
  });

  it('handles already-spaced input', () => {
    const spaced = 'DE89 3704 0044 0532 0130 00';
    expect(formatIBAN(spaced)).toBe('DE89 3704 0044 0532 0130 00');
  });

  it('handles empty string', () => {
    expect(formatIBAN('')).toBe('');
  });
});
