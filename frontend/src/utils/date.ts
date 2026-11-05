import { format, parseISO, isValid } from 'date-fns';

export function formatDate(dateStr: string | Date | undefined | null, formatPattern: string = 'dd MMM yyyy'): string {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(d)) return '';
    return format(d, formatPattern);
  } catch {
    return '';
  }
}

export function toInputDate(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
