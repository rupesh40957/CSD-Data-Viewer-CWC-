/**
 * Parse timestamp in format: DD/MM/YYYY HH:mm:ss.mmm
 * e.g. "29/09/2026 00:01:26.573"
 */
export function parseCsdTimestamp(raw: string): { date: Date; isValid: boolean } {
  if (!raw || typeof raw !== 'string') {
    return { date: new Date(0), isValid: false };
  }

  const trimmed = raw.trim();
  // Regex for DD/MM/YYYY HH:mm:ss.mmm
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);

  if (!match) {
    const fallback = new Date(trimmed);
    return {
      date: isNaN(fallback.getTime()) ? new Date(0) : fallback,
      isValid: !isNaN(fallback.getTime()),
    };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed in JS Date
  const year = parseInt(match[3], 10);
  const hours = parseInt(match[4], 10);
  const minutes = parseInt(match[5], 10);
  const seconds = parseInt(match[6], 10);
  const millis = match[7] ? parseInt(match[7].padEnd(3, '0').slice(0, 3), 10) : 0;

  const date = new Date(year, month, day, hours, minutes, seconds, millis);
  const isValid = !isNaN(date.getTime());

  return { date, isValid };
}

/**
 * Format timestamp into standard readable display string
 */
export function formatCsdTimestamp(date: Date, includeMillis: boolean = true): string {
  if (!date || isNaN(date.getTime())) return 'Invalid Date';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  if (includeMillis) {
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${millis}`;
  }
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatTimeOnly(date: Date): string {
  if (!date || isNaN(date.getTime())) return '--:--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
