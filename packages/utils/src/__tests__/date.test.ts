import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatMonthYear, startOfCurrentMonth, endOfCurrentMonth, isoToDate } from '../date';

describe('formatDate', () => {
  it('formats ISO string to German format', () => {
    expect(formatDate('2024-03-15')).toBe('15.03.2024');
  });

  it('formats Date object', () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe('05.01.2024');
  });

  it('returns dash for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('accepts custom pattern', () => {
    expect(formatDate('2024-06-01', 'yyyy/MM/dd')).toBe('2024/06/01');
  });
});

describe('formatDateTime', () => {
  it('includes time component', () => {
    const result = formatDateTime('2024-03-15T14:30:00');
    expect(result).toBe('15.03.2024 14:30');
  });
});

describe('formatMonthYear', () => {
  it('formats as German month name + year', () => {
    const result = formatMonthYear('2024-01-01');
    expect(result).toBe('Januar 2024');
  });

  it('formats June correctly', () => {
    const result = formatMonthYear('2024-06-15');
    expect(result).toBe('Juni 2024');
  });
});

describe('startOfCurrentMonth', () => {
  it('returns first day of current month at midnight', () => {
    const result = startOfCurrentMonth();
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('month matches current month', () => {
    const now = new Date();
    const start = startOfCurrentMonth();
    expect(start.getMonth()).toBe(now.getMonth());
    expect(start.getFullYear()).toBe(now.getFullYear());
  });
});

describe('endOfCurrentMonth', () => {
  it('returns last day at 23:59:59', () => {
    const result = endOfCurrentMonth();
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });

  it('end is after start', () => {
    expect(endOfCurrentMonth() > startOfCurrentMonth()).toBe(true);
  });
});

describe('isoToDate', () => {
  it('parses ISO string to Date', () => {
    const result = isoToDate('2024-03-15T10:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(2); // 0-indexed
  });
});
