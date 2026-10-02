import { CORRUPT_VALUE_MARKER } from './constants';
import { RecordStatus, RecordQuality, SensorReading, SignalInfo } from '@/types/csd';

/**
 * Parse key-value tokens like "c1:123", "c2:$$", "H:0256"
 */
export function parsePrefixedNumber(raw: string, prefix: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const expectedPrefix = `${prefix}:`;
  if (!trimmed.startsWith(expectedPrefix)) return null;

  const valStr = trimmed.slice(expectedPrefix.length).trim();
  if (valStr === CORRUPT_VALUE_MARKER || valStr.includes('$')) {
    return null;
  }

  const num = Number(valStr);
  return isNaN(num) ? null : num;
}

/**
 * Parse H code like "H:0256", "H:1007", "H:$$"
 */
export function parseHField(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('H:')) return null;

  const code = trimmed.slice(2).trim();
  if (code === CORRUPT_VALUE_MARKER || code.includes('$')) {
    return null;
  }
  return code;
}

/**
 * Parse a sensor reading like "s00:475", "s10:-02", "s02:$$"
 */
export function parseSensorReading(raw: string, index: number): SensorReading {
  const trimmed = (raw || '').trim();
  const match = trimmed.match(/^(s\d+):(.*)$/);

  if (!match) {
    return {
      key: 'unknown',
      label: 'Unknown Sensor',
      value: null,
      raw: trimmed,
      index,
      isCorrupted: trimmed.includes('$'),
    };
  }

  const key = match[1];
  const valStr = match[2].trim();
  const isCorrupted = valStr === CORRUPT_VALUE_MARKER || valStr.includes('$');

  let value: number | null = null;
  if (!isCorrupted && valStr !== '') {
    const num = Number(valStr);
    if (!isNaN(num)) {
      value = num;
    }
  }

  let label = key;
  if (key === 's16') label = 's16 (Composite Float)';
  else if (key === 's17') label = 's17 (Auxiliary / Battery)';
  else if (key === 's08') label = 's08 (Integer Part)';
  else if (key === 's09') label = 's09 (Fractional Part)';

  return {
    key,
    label,
    value,
    raw: trimmed,
    index,
    isCorrupted,
  };
}

/**
 * Parse float value for s16 (e.g. "s16:01.286" or "s16:$$")
 */
export function parseS16Field(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^s16:(.*)$/);
  if (!match) return null;

  const valStr = match[1].trim();
  if (valStr === CORRUPT_VALUE_MARKER || valStr.includes('$')) {
    return null;
  }

  const num = parseFloat(valStr);
  return isNaN(num) ? null : num;
}

/**
 * Parse signal field like "08P47NG!CA89", "11P41NN!CA89"
 */
export function parseSignalInfo(raw: string): SignalInfo {
  const trimmed = (raw || '').trim();
  // Regex: NN P nn (NG|NN) ! YYYY
  const match = trimmed.match(/^(\d{2})P(\d{2})(N[GN]|..)!?(.*)$/);

  if (!match) {
    return {
      raw: trimmed,
      prefix: 0,
      power: 0,
      signalType: trimmed.includes('NN') ? 'NN' : 'NG',
      suffix: '',
    };
  }

  return {
    raw: trimmed,
    prefix: parseInt(match[1], 10),
    power: parseInt(match[2], 10),
    signalType: match[3],
    suffix: match[4] || '',
  };
}

/**
 * Parse status character: 'L' (Locked), 'U' (Unlocked), or '$' (Corrupt)
 */
export function parseStatus(raw: string): RecordStatus {
  const trimmed = (raw || '').trim().toUpperCase();
  if (trimmed === 'L') return 'L';
  if (trimmed === 'U') return 'U';
  return '$';
}

/**
 * Parse quality string: 'Good' or 'Bad'
 */
export function parseQuality(raw: string): RecordQuality {
  const trimmed = (raw || '').trim();
  if (trimmed.toLowerCase() === 'good') return 'Good';
  return 'Bad';
}
