import { describe, it, expect } from 'vitest';
import { formatEUR, formatEURSigned, parseCentsFromString, eurosToCents, centsToEuros } from '../currency';

describe('formatEUR', () => {
  it('formats positive cents', () => {
    expect(formatEUR(1234)).toBe('12,34 €');
  });

  it('formats zero', () => {
    expect(formatEUR(0)).toBe('0,00 €');
  });

  it('formats negative cents', () => {
    expect(formatEUR(-500)).toBe('-5,00 €');
  });

  it('formats large amounts', () => {
    expect(formatEUR(1_000_000_00)).toBe('1.000.000,00 €');
  });

  it('uses provided locale', () => {
    const result = formatEUR(1234, 'en-US');
    expect(result).toContain('12.34');
  });
});

describe('formatEURSigned', () => {
  it('prepends + for positive', () => {
    expect(formatEURSigned(1000)).toMatch(/^\+/);
  });

  it('prepends - for negative', () => {
    expect(formatEURSigned(-1000)).toMatch(/^-/);
  });

  it('treats zero as positive', () => {
    expect(formatEURSigned(0)).toMatch(/^\+/);
  });
});

describe('parseCentsFromString', () => {
  it('parses German decimal format', () => {
    expect(parseCentsFromString('12,34')).toBe(1234);
  });

  it('parses integer string', () => {
    expect(parseCentsFromString('100')).toBe(10000);
  });

  it('handles thousands separator', () => {
    expect(parseCentsFromString('1.234,56')).toBe(123456);
  });

  it('strips currency symbols', () => {
    expect(parseCentsFromString('12,50 €')).toBe(1250);
  });

  it('handles negative values', () => {
    expect(parseCentsFromString('-5,00')).toBe(-500);
  });
});

describe('eurosToCents', () => {
  it('converts whole euros', () => {
    expect(eurosToCents(10)).toBe(1000);
  });

  it('converts fractional euros', () => {
    expect(eurosToCents(12.34)).toBe(1234);
  });

  it('rounds correctly', () => {
    expect(eurosToCents(0.001)).toBe(0);
    expect(eurosToCents(0.005)).toBe(1);
  });

  it('handles zero', () => {
    expect(eurosToCents(0)).toBe(0);
  });
});

describe('centsToEuros', () => {
  it('converts cents to euros', () => {
    expect(centsToEuros(1234)).toBe(12.34);
  });

  it('handles zero', () => {
    expect(centsToEuros(0)).toBe(0);
  });

  it('round trips with eurosToCents', () => {
    const original = 4999;
    expect(eurosToCents(centsToEuros(original))).toBe(original);
  });
});
