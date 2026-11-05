/**
 * Convert an array of objects to CSV string.
 */
export function generateCSV(data: Record<string, unknown>[], columns?: string[]): string {
  if (data.length === 0) return '';

  const headers = columns || Object.keys(data[0]);
  const headerRow = headers.map(escapeCSV).join(',');

  const rows = data.map((row) =>
    headers.map((h) => escapeCSV(String(row[h] ?? ''))).join(',')
  );

  return [headerRow, ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
