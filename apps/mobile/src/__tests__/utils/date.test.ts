import { formatDate, formatDateTime, formatMonthYear, startOfCurrentMonth, endOfCurrentMonth } from '../../shared/utils/date';

describe('formatDate', () => {
  it('formats ISO string to dd.MM.yyyy', () => {
    expect(formatDate('2025-06-15')).toBe('15.06.2025');
  });

  it('formats Date object', () => {
    expect(formatDate(new Date('2025-01-01'))).toBe('01.01.2025');
  });

  it('returns — for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('includes time', () => {
    const result = formatDateTime('2025-06-15T14:30:00');
    expect(result).toContain('15.06.2025');
    expect(result).toContain('14:30');
  });
});

describe('formatMonthYear', () => {
  it('returns month name and year in German', () => {
    const result = formatMonthYear('2025-06-01');
    expect(result).toContain('2025');
    expect(result.toLowerCase()).toContain('juni');
  });
});

describe('startOfCurrentMonth / endOfCurrentMonth', () => {
  it('startOfCurrentMonth is day 1', () => {
    const d = startOfCurrentMonth();
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });

  it('endOfCurrentMonth is last day at 23:59:59', () => {
    const d = endOfCurrentMonth();
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    expect(nextDay.getDate()).toBe(1);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  it('start is before end', () => {
    expect(startOfCurrentMonth() < endOfCurrentMonth()).toBe(true);
  });
});
