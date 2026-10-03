/**
 * CSD Timestamp Parser
 *
 * CSD telemetry timestamps are transmitted in GMT/UTC.
 * This module parses them and converts to IST (UTC+5:30) for display.
 */

/** IST offset from UTC in milliseconds: +5 hours 30 minutes */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Parse timestamp in format: DD/MM/YYYY HH:mm:ss.mmm
 * Treats input as GMT/UTC and converts to IST (+5:30).
 * e.g. "29/09/2026 00:01:26.573" (GMT) → IST Date object at 05:31:26.573
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

  // Create UTC timestamp, then add IST offset
  const utcMs = Date.UTC(year, month, day, hours, minutes, seconds, millis);
  const istMs = utcMs + IST_OFFSET_MS;
  const date = new Date(istMs);
  const isValid = !isNaN(date.getTime());

  return { date, isValid };
}

/**
 * Format timestamp into standard readable display string (IST).
 */
export function formatCsdTimestamp(date: Date, includeMillis: boolean = true): string {
  if (!date || isNaN(date.getTime())) return 'Invalid Date';

  // Use UTC getters since we stored the IST-adjusted time in the UTC epoch
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  if (includeMillis) {
    const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${millis}`;
  }
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatTimeOnly(date: Date): string {
  if (!date || isNaN(date.getTime())) return '--:--:--';
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format a raw GMT timestamp string directly to IST display string.
 * Useful for the Raw Inspector where we only have the raw text.
 */
export function formatRawGmtToIst(rawGmt: string): string {
  const { date, isValid } = parseCsdTimestamp(rawGmt);
  if (!isValid) return rawGmt;
  return formatCsdTimestamp(date, true);
}
