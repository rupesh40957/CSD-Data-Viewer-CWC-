/**
 * Matrix Builder — Constructs a multi-level CWC Telemetry Matrix Report model
 * matching the exact hierarchy of official reports like UYD NEW DELHI 15-OCT TO 31-OCT.xlsx
 */

import { CsdRecord } from '@/types/csd';
import { InsatSensorConfig } from '../insat/types';
import { computeRecordEngineeringValues } from '../insat/compute';
import { MatrixReportModel, StationColumnGroup } from './types';
import { isValidStationId } from '../parser/csd-parser';

/**
 * Format a Date object into official CWC date range format:
 * e.g. "15-Oct-2026 00:00"
 */
export function formatCwcDateShort(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = months[d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  const hr = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day}-${mon}-${yr} ${hr}:${min}`;
}

/**
 * Format a Date object into ISO-like telemetry timestamp:
 * e.g. "2026-10-15 00:00:00"
 */
export function formatTelemetryTimestamp(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hr = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const sec = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hr}:${min}:${sec}`;
}

/**
 * Fast hour key calculation avoiding temporary Date object allocations:
 * e.g. "2026-10-15 00:00:00"
 */
function getHourBucketKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hr = d.getUTCHours();
  return `${y}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day} ${hr < 10 ? '0' + hr : hr}:00:00`;
}

/**
 * Round date down to the nearest hour (UTC)
 */
function floorToHour(d: Date): Date {
  const res = new Date(d);
  res.setUTCMinutes(0, 0, 0);
  return res;
}

/**
 * Resolves calibrated engineering value according to official TDMA INSAT specifications:
 * - AirTemp (s00): (Abs(x) - 400) / 10 (resolution 0.1)
 * - Battery (c1): x / 10 (resolution 0.1)
 * - Humidity (s07): Abs(x) / 10 (resolution 1)
 * - Pressure (s06): (x / (x + 0.0000001)) * ((x / 10.23) + 925) (resolution 0.1, 0 if x=0)
 * - RainDaily (c3): x (resolution 1)
 * - Rainfall (c2): x / 2 (resolution 0.5)
 * - Evaporation (s11): Abs(x) (resolution 1)
 * - SolarRad (s14): x (resolution 1)
 * - WindDir (s05): Abs(x) (resolution 1)
 * - WindSpeed (s04): Abs(x) / 10 (resolution 0.1)
 * - WaterLevel (s08 & s09 / s16): (x1 + x2) + MSL (resolution 0.001)
 * - ReportingTime: formatted timestamp
 * - GPSstatus: Lock / Unlock
 */
export function resolveCalibratedSensorValue(
  sensorName: string,
  r: CsdRecord,
  engValues: Record<string, any> = {},
  msl: number = 0
): string | number {
  // 1. Fast O(1) direct check in precomputed engValues
  if (engValues && engValues[sensorName]?.isValid && engValues[sensorName].value !== null) {
    return engValues[sensorName].value;
  }

  const norm = sensorName.toLowerCase().replace(/[\s\-_()]+/g, '');

  // 1b. Partial key match in precomputed engValues (only if direct key was not exact)
  if (engValues) {
    for (const key in engValues) {
      const ev = engValues[key];
      if (ev?.isValid && ev.value !== null) {
        const kNorm = key.toLowerCase().replace(/[\s\-_()]+/g, '');
        if (kNorm === norm || kNorm.includes(norm) || norm.includes(kNorm)) {
          return ev.value;
        }
      }
    }
  }

  // Fast O(1) raw value retrieval preferring sensorMap
  const getRaw = (key: string): number | null => {
    const lower = key.toLowerCase();
    const fromMap = r.sensorMap?.[key] || r.sensorMap?.[lower];
    if (fromMap && fromMap.length > 0 && fromMap[0] !== null) return fromMap[0];
    if (r.sensors) {
      for (let i = 0; i < r.sensors.length; i++) {
        if (r.sensors[i].key.toLowerCase() === lower && r.sensors[i].value !== null) {
          return r.sensors[i].value;
        }
      }
    }
    return null;
  };

  // 2. Specific TDMA specifications channel matching
  if (norm.includes('airtemp') || norm.includes('s00')) {
    const x = getRaw('s00');
    if (x !== null) return Number(((Math.abs(x) - 400) / 10).toFixed(1));
  } else if (norm.includes('battery') || norm.includes('c1')) {
    if (r.c1 !== null) return Number((r.c1 / 10).toFixed(1));
    const x = getRaw('c1') ?? getRaw('s17');
    if (x !== null) return Number((x / 10).toFixed(1));
  } else if (norm.includes('humidity') || norm.includes('s07')) {
    const x = getRaw('s07');
    if (x !== null) return Math.round(Math.abs(x) / 10);
  } else if (norm.includes('pressure') || norm.includes('s06')) {
    const x = getRaw('s06');
    if (x !== null) {
      if (x === 0) return 0;
      return Number(((x / 10.23) + 925).toFixed(1));
    }
  } else if (norm.includes('raindaily') || norm.includes('c3')) {
    if (r.c3 !== null) return r.c3;
    const x = getRaw('c3');
    if (x !== null) return x;
  } else if (norm.includes('rainfall') || norm.includes('c2')) {
    if (r.c2 !== null) return Number((r.c2 / 2).toFixed(1));
    const x = getRaw('c2');
    if (x !== null) return Number((x / 2).toFixed(1));
  } else if (norm.includes('evaporation') || norm.includes('s11')) {
    const x = getRaw('s11');
    if (x !== null) return Math.round(Math.abs(x));
  } else if (norm.includes('solarrad') || norm.includes('s14')) {
    const x = getRaw('s14');
    if (x !== null) return Math.round(x);
  } else if (norm.includes('winddir') || norm.includes('s05')) {
    const x = getRaw('s05');
    if (x !== null) return Math.round(Math.abs(x));
  } else if (norm.includes('windspeed') || norm.includes('s04')) {
    const x = getRaw('s04');
    if (x !== null) return Number((Math.abs(x) / 10).toFixed(1));
  } else if (norm.includes('snow') || norm.includes('s10')) {
    const x = getRaw('s10');
    if (x !== null) return Math.round(x);
  } else if (norm.includes('waterlevel') || norm.includes('water') || norm.includes('s08') || norm.includes('s16')) {
    const s08 = getRaw('s08');
    const s09 = getRaw('s09');
    if (s08 !== null && s08 > 0) {
      let dec = 0;
      if (s09 !== null) {
        dec = s09 >= 100 ? s09 / 1000 : s09 >= 1 ? s09 / 100 : s09;
      }
      return Number(((s08 + dec) + msl).toFixed(3));
    } else if (r.s16 !== null && r.s16 > 0) {
      return Number((r.s16 + msl).toFixed(3));
    } else if (s08 !== null && s08 === 0) {
      return Number((0 + msl).toFixed(3));
    }
  } else if (norm.includes('reportingtime')) {
    return formatTelemetryTimestamp(r.timestamp);
  } else if (norm.includes('gps') || norm.includes('status')) {
    return r.status === 'L' ? 'Lock' : r.status === 'U' ? 'Unlock' : r.status || 'Lock';
  }

  return '---';
}

/**
 * Build MatrixReportModel from CSD records and INSAT sensor configuration.
 */
export function buildMatrixReportFromRecords(
  records: CsdRecord[],
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0,
  filterStations?: string[],
  dateStart?: Date | null,
  dateEnd?: Date | null
): MatrixReportModel {
  // 1. Filter records if requested with fast O(1) Set lookup without string allocations
  let filtered = records;
  if (filterStations && filterStations.length > 0) {
    const stationSet = new Set<string>();
    for (let i = 0; i < filterStations.length; i++) {
      const s = filterStations[i];
      stationSet.add(s);
      stationSet.add(s.toUpperCase());
      stationSet.add(s.toLowerCase());
    }
    const matching: CsdRecord[] = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (stationSet.has(r.stationId) || (r.stationName && stationSet.has(r.stationName))) {
        matching.push(r);
      }
    }
    filtered = matching;
  }
  if (dateStart) {
    filtered = filtered.filter((r) => r.timestamp >= dateStart);
  }
  if (dateEnd) {
    filtered = filtered.filter((r) => r.timestamp <= dateEnd);
  }

  // 2. Discover date range
  let minDate: Date | null = dateStart || null;
  let maxDate: Date | null = dateEnd || null;
  for (const r of filtered) {
    if (!minDate || r.timestamp < minDate) minDate = r.timestamp;
    if (!maxDate || r.timestamp > maxDate) maxDate = r.timestamp;
  }

  const startStr = minDate ? formatCwcDateShort(minDate) : 'Start';
  const endStr = maxDate ? formatCwcDateShort(maxDate) : 'End';
  const periodText = `${startStr} To ${endStr}`;
  const title = `Telemetry Data Received at Central Receiving Station during \r\n${periodText}`;

  // 3. Discover unique stations and their sensors
  const enabledSensors = insatSensors && insatSensors.length > 0
    ? insatSensors.filter((s) => s.enabled)
    : [
        { sensorName: 'Rainfall (INSAT)', unit: 'mm', rightDigit: 1 },
        { sensorName: 'RainDaily (INSAT)', unit: 'mm', rightDigit: 0 },
        { sensorName: 'WaterLevel (INSAT)', unit: 'mts.', rightDigit: 3 },
        { sensorName: 'Battery (INSAT)', unit: 'Volt', rightDigit: 1 },
        { sensorName: 'ReportingTime (INSAT)', unit: '', rightDigit: 0 },
        { sensorName: 'GPSstatus', unit: '', rightDigit: 0 },
      ];

  // Group stations preserving order of appearance, strictly filtering out noise tokens
  const stationMap = new Map<string, { stationName: string; stationId: string; wimsCode?: string }>();
  for (const r of filtered) {
    const stId = String(r.stationId || (r as any).station_id || '').trim();
    if (!isValidStationId(stId)) continue;
    const key = stId.toUpperCase();
    if (!stationMap.has(key)) {
      stationMap.set(key, {
        stationId: stId,
        stationName: r.stationName || (r as any).station_name || stId,
        wimsCode: r.stationMetadata?.district || '',
      });
    }
  }

  // 4. Build column groups
  const stationGroups: StationColumnGroup[] = [];
  let currentColIndex = 1; // Col 0 is Date and Time (IST)

  stationMap.forEach((st) => {
    const sensorsForStation = enabledSensors.map((s, idx) => ({
      name: s.sensorName,
      unit: s.unit || '',
      key: s.sensorName,
      colIndex: currentColIndex + idx,
      resolution: s.rightDigit,
    }));

    stationGroups.push({
      stationName: st.stationName,
      stationId: st.stationId,
      wimsCode: st.wimsCode,
      startColIndex: currentColIndex,
      colSpan: sensorsForStation.length,
      sensors: sensorsForStation,
    });

    currentColIndex += sensorsForStation.length;
  });

  const totalColumns = currentColIndex;

  // 5. Build timeline (hourly buckets between minDate and maxDate)
  const timestamps: string[] = [];
  const timeBuckets = new Map<string, CsdRecord[]>();

  if (minDate && maxDate) {
    const diffHours = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60);
    // Continuous hourly timeline up to 5+ years (50,000 hours) takes < 2ms in JS
    if (diffHours >= 0 && diffHours <= 50000) {
      const curr = floorToHour(minDate);
      const end = floorToHour(maxDate);

      while (curr <= end) {
        const tsStr = formatTelemetryTimestamp(curr);
        timestamps.push(tsStr);
        timeBuckets.set(tsStr, []);
        curr.setUTCHours(curr.getUTCHours() + 1);
      }
    }
  }

  const seenTimestamps = new Set<string>(timestamps);

  // Map each record to its hourly bucket using O(1) set check
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i];
    const hourTs = getHourBucketKey(r.timestamp);
    const bucket = timeBuckets.get(hourTs);
    if (bucket) {
      bucket.push(r);
    } else {
      timeBuckets.set(hourTs, [r]);
      if (!seenTimestamps.has(hourTs)) {
        seenTimestamps.add(hourTs);
        timestamps.push(hourTs);
      }
    }
  }

  // Ensure timestamps are sorted chronologically
  timestamps.sort();

  // 6. Build 2D Grid
  const grid = new Map<string, (string | number | null)[]>();

  // Map for fast O(1) station lookup
  const stationGroupMap = new Map<string, StationColumnGroup>();
  for (const group of stationGroups) {
    stationGroupMap.set(group.stationId.toUpperCase(), group);
  }

  for (const ts of timestamps) {
    const rowVals = new Array(totalColumns).fill('---');
    rowVals[0] = ts; // Col 0 is Date

    const bucketRecords = timeBuckets.get(ts) || [];
    for (const r of bucketRecords) {
      const stId = String(r.stationId || (r as any).station_id || 'UNKNOWN').toUpperCase();
      const group = stationGroupMap.get(stId);
      if (!group) continue;

      const engValues = insatSensors
        ? computeRecordEngineeringValues(insatSensors, r, insatMSL)
        : {};

      for (const sensor of group.sensors) {
        rowVals[sensor.colIndex] = resolveCalibratedSensorValue(sensor.name, r, engValues, insatMSL);
      }
    }

    grid.set(ts, rowVals);
  }

  return {
    title,
    periodText,
    startDate: minDate,
    endDate: maxDate,
    totalColumns,
    dateColumnHeader: 'Date and Time (IST)',
    stationGroups,
    timestamps,
    grid,
  };
}
