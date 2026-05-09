import { format, parseISO, isValid } from 'date-fns';
import { de } from 'date-fns/locale';

export function formatDate(date: string | Date, pattern = 'dd.MM.yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, pattern, { locale: de });
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd.MM.yyyy HH:mm');
}

export function formatMonthYear(date: string | Date): string {
  return formatDate(date, 'MMMM yyyy');
}

export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function endOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isoToDate(iso: string): Date {
  return parseISO(iso);
}
