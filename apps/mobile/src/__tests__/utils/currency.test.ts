import {
  formatEUR,
  formatEURSigned,
  parseCentsFromString,
  eurosToCents,
  centsToEuros,
} from '../../shared/utils/currency';

describe('formatEUR', () => {
  it('formats positive cents as EUR', () => {
    expect(formatEUR(100, 'de-DE')).toContain('1');
  });

  it('formats zero as 0,00 EUR', () => {
    expect(formatEUR(0, 'de-DE')).toContain('0');
  });

  it('formats 1000 cents as 10 euros', () => {
    const result = formatEUR(1000, 'de-DE');
    expect(result).toContain('10');
  });
});

describe('formatEURSigned', () => {
  it('prefixes positive with +', () => {
    expect(formatEURSigned(100)).toStartWith('+');
  });

  it('prefixes negative with -', () => {
    expect(formatEURSigned(-100)).toStartWith('-');
  });

  it('prefixes zero with +', () => {
    expect(formatEURSigned(0)).toStartWith('+');
  });
});

describe('parseCentsFromString', () => {
  it('parses german decimal format', () => {
    expect(parseCentsFromString('10,50')).toBe(1050);
  });

  it('parses plain number', () => {
    expect(parseCentsFromString('5.00')).toBe(500);
  });

  it('ignores currency symbols', () => {
    expect(parseCentsFromString('€10,00')).toBe(1000);
  });
});

describe('eurosToCents / centsToEuros', () => {
  it('converts euros to cents', () => {
    expect(eurosToCents(10.5)).toBe(1050);
  });

  it('converts cents to euros', () => {
    expect(centsToEuros(1050)).toBe(10.5);
  });

  it('round-trips', () => {
    expect(centsToEuros(eurosToCents(99.99))).toBeCloseTo(99.99, 2);
  });
});
