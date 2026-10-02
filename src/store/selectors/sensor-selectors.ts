import { AppStore } from '../use-app-store';
import { CSDRecord } from '@/types/csd';
import { selectFilteredRecords } from './records-selectors';

export interface SensorParameterSummary {
  key: string;            // e.g. "s16", "s00", "c1"
  label: string;          // Default label or mapped label
  customLabel?: string;   // User-defined label
  unit?: string;          // User-defined unit (e.g. "m", "V")
  totalReadings: number;  // Total frames containing this key
  validReadings: number;  // Frames with valid numerical values
  corruptedReadings: number; // Frames with $$ or null
  validPct: number;       // Valid percentage (0-100)
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
}

const EMPTY_SUMMARY: SensorParameterSummary[] = [];

let lastRecordRef: CSDRecord[] | null = null;
let lastMetaRef: Record<string, { customLabel: string; unit: string }> | null = null;
let cachedSensorSummary: SensorParameterSummary[] = EMPTY_SUMMARY;

/**
 * Known telemetry channels present in the CSD logger specification.
 * s00 - s17 are standard slots, c1 - c3 are channel configurations,
 * signalPower is extracted from the RF link string.
 */
const KNOWN_SENSOR_ORDER = [
  's16', // Composite float
  's17', // Auxiliary
  's00',
  's01',
  's02',
  's03',
  's04',
  's08', // Integer part
  's09', // Fractional part
  's10',
  'c1',
  'c2',
  'c3',
  'signalPower',
];

/**
 * Memoized selector that calculates factual, real statistics for every detected sensor/parameter.
 * Computes min, max, avg, valid counts, and corrupted counts directly from the actual data stream.
 */
export function selectDetectedSensorsSummary(state: AppStore): SensorParameterSummary[] {
  const records = selectFilteredRecords(state);
  const metadata = state.sensorMetadata;

  if (records.length === 0) return EMPTY_SUMMARY;

  if (records === lastRecordRef && metadata === lastMetaRef) {
    return cachedSensorSummary;
  }

  // 1. Discover all unique sensor keys across records
  const keyStatsMap = new Map<
    string,
    {
      total: number;
      valid: number;
      corrupted: number;
      min: number | null;
      max: number | null;
      sum: number;
      latest: number | null;
    }
  >();

  // Initialize known keys
  for (const k of KNOWN_SENSOR_ORDER) {
    keyStatsMap.set(k, {
      total: 0,
      valid: 0,
      corrupted: 0,
      min: null,
      max: null,
      sum: 0,
      latest: null,
    });
  }

  // Scan through records
  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    // Check c1, c2, c3
    if (r.c1 !== null) {
      updateKeyStat(keyStatsMap, 'c1', r.c1, false);
    }
    if (r.c2 !== null) {
      updateKeyStat(keyStatsMap, 'c2', r.c2, false);
    }
    if (r.c3 !== null) {
      updateKeyStat(keyStatsMap, 'c3', r.c3, false);
    }

    // Check signal power
    if (r.signal && r.signal.power !== undefined) {
      updateKeyStat(keyStatsMap, 'signalPower', r.signal.power, false);
    }

    // Check s16, s17
    if (r.s16 !== null) {
      updateKeyStat(keyStatsMap, 's16', r.s16, false);
    } else {
      updateKeyStat(keyStatsMap, 's16', null, true);
    }

    if (r.s17 !== null) {
      updateKeyStat(keyStatsMap, 's17', r.s17, false);
    } else {
      updateKeyStat(keyStatsMap, 's17', null, true);
    }

    // Check generic sensors
    for (let s = 0; s < r.sensors.length; s++) {
      const sensor = r.sensors[s];
      const key = sensor.key;
      if (key === 's16' || key === 's17') continue; // already tracked

      if (!keyStatsMap.has(key)) {
        keyStatsMap.set(key, {
          total: 0,
          valid: 0,
          corrupted: 0,
          min: null,
          max: null,
          sum: 0,
          latest: null,
        });
      }

      updateKeyStat(keyStatsMap, key, sensor.value, sensor.isCorrupted);
    }
  }

  // Build result list, filtering out keys that had zero readings
  const results: SensorParameterSummary[] = [];

  for (const [key, stat] of keyStatsMap.entries()) {
    if (stat.total === 0) continue;

    const userMeta = metadata[key];
    let label = key;
    if (userMeta && userMeta.customLabel) {
      label = `${key} (${userMeta.customLabel})`;
    } else if (key === 's16') {
      label = 's16 (Float)';
    } else if (key === 'signalPower') {
      label = 'Signal Power (dB)';
    }

    results.push({
      key,
      label,
      customLabel: userMeta?.customLabel || '',
      unit: userMeta?.unit || (key === 'signalPower' ? 'dB' : ''),
      totalReadings: stat.total,
      validReadings: stat.valid,
      corruptedReadings: stat.corrupted,
      validPct: stat.total > 0 ? Number(((stat.valid / stat.total) * 100).toFixed(1)) : 0,
      min: stat.min,
      max: stat.max,
      avg: stat.valid > 0 ? Number((stat.sum / stat.valid).toFixed(2)) : null,
      latest: stat.latest,
    });
  }

  lastRecordRef = records;
  lastMetaRef = metadata;
  cachedSensorSummary = results;

  return cachedSensorSummary;
}

function updateKeyStat(
  map: Map<
    string,
    {
      total: number;
      valid: number;
      corrupted: number;
      min: number | null;
      max: number | null;
      sum: number;
      latest: number | null;
    }
  >,
  key: string,
  val: number | null,
  isCorrupted: boolean
) {
  const stat = map.get(key);
  if (!stat) return;

  stat.total++;

  if (val !== null && !isNaN(val) && !isCorrupted) {
    stat.valid++;
    stat.sum += val;
    stat.latest = val;
    if (stat.min === null || val < stat.min) stat.min = val;
    if (stat.max === null || val > stat.max) stat.max = val;
  } else {
    stat.corrupted++;
  }
}
