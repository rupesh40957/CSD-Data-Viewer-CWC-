import {
  RECORD_PREFIX_CHAR,
  FIELD_DELIMITER_CHAR,
  EXPECTED_FIELD_COUNT,
  FIELD_POSITIONS,
  CORRUPT_VALUE_MARKER,
} from './constants';
import { parseCsdTimestamp } from './timestamp-parser';
import {
  parsePrefixedNumber,
  parseHField,
  parseSensorReading,
  parseS16Field,
  parseSignalInfo,
  parseStatus,
  parseQuality,
} from './field-parser';
import {
  CSDFile,
  CSDRecord,
  CsdFile,
  CsdRecord,
  FileStats,
  ParseError,
  StationSummary,
  SensorReading,
  FileParsingSummary,
  DataQualitySummary,
} from '@/types/csd';
import { StationMaster } from '@/types/station-master';

/**
 * Decode ArrayBuffer into string using windows-1252 to preserve framing bytes (0xBB, 0xB8)
 */
export function decodeCsdBuffer(buffer: ArrayBuffer): string {
  try {
    const decoder = new TextDecoder('windows-1252');
    return decoder.decode(buffer);
  } catch {
    // Fallback to latin1 / iso-8859-1 if windows-1252 is unavailable
    const decoder = new TextDecoder('iso-8859-1');
    return decoder.decode(buffer);
  }
}

/**
 * Main parser function: takes ArrayBuffer or decoded text and produces structured CSDFile.
 * Optionally accepts stationLookup Map to enrich records with Station Master metadata on parse.
 */
export function parseCsdContent(
  content: string,
  filename: string,
  fileSize: number,
  stationLookup?: Map<string, StationMaster>
): CSDFile {
  const parseStartTime = performance.now();
  const lines = content.split(/\r?\n/);
  const records: CsdRecord[] = [];
  const errors: ParseError[] = [];
  const stationMap: Map<string, CsdRecord[]> = new Map();

  let goodCount = 0;
  let badCount = 0;
  let corruptFieldRecordsCount = 0;
  const statusCounts = { L: 0, U: 0, $: 0 };
  const hCounts: Map<string, number> = new Map();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line || line.trim() === '') continue;

    const lineNumber = i + 1;
    const rawLine = line;

    // 1. Strip leading prefix byte 0xBB (or char code 187)
    if (line.charCodeAt(0) === 0xBB || line.startsWith(RECORD_PREFIX_CHAR)) {
      line = line.substring(1);
    }

    // 2. Split by delimiter byte 0xB8 (or char code 184)
    // Also support fallback to comma if user converted it
    let fields = line.split(FIELD_DELIMITER_CHAR);
    if (fields.length < EXPECTED_FIELD_COUNT && line.includes(',')) {
      fields = line.split(',');
    }

    if (fields.length < EXPECTED_FIELD_COUNT) {
      errors.push({
        line: lineNumber,
        message: `Incomplete record: found ${fields.length} fields, expected ${EXPECTED_FIELD_COUNT}`,
        severity: 'warning',
        raw: rawLine.slice(0, 100),
      });
      if (fields.length < 5) continue; // Skip completely malformed garbage lines
    }

    const stationId = (fields[FIELD_POSITIONS.STATION_ID] || '').trim();
    const timestampRaw = (fields[FIELD_POSITIONS.TIMESTAMP] || '').trim();
    const timeOffset = (fields[FIELD_POSITIONS.TIME_OFFSET] || '').trim();
    const statusRaw = fields[FIELD_POSITIONS.STATUS] || '';
    const status = parseStatus(statusRaw);

    const c1 = parsePrefixedNumber(fields[FIELD_POSITIONS.C1] || '', 'c1');
    const c2 = parsePrefixedNumber(fields[FIELD_POSITIONS.C2] || '', 'c2');
    const c3 = parsePrefixedNumber(fields[FIELD_POSITIONS.C3] || '', 'c3');
    const h = parseHField(fields[FIELD_POSITIONS.H] || '');

    // Sensor readings: fields at indices 8 through 18
    const sensors: SensorReading[] = [];
    const sensorMap: Record<string, (number | null)[]> = {};
    let hasCorruptMarker = rawLine.includes(CORRUPT_VALUE_MARKER);

    const sensorEndIndex = Math.min(fields.length - 2, FIELD_POSITIONS.SENSOR_END + 1);
    for (let sIdx = FIELD_POSITIONS.SENSOR_START; sIdx < sensorEndIndex; sIdx++) {
      const fieldToken = fields[sIdx] || '';
      const reading = parseSensorReading(fieldToken, sIdx - FIELD_POSITIONS.SENSOR_START);
      sensors.push(reading);

      if (!sensorMap[reading.key]) {
        sensorMap[reading.key] = [];
      }
      sensorMap[reading.key].push(reading.value);
    }

    // Look for s16 and s17 specifically
    let s16: number | null = null;
    let s17: number | null = null;

    for (let sIdx = FIELD_POSITIONS.SENSOR_START; sIdx < fields.length - 2; sIdx++) {
      const token = (fields[sIdx] || '').trim();
      if (token.startsWith('s16:')) {
        s16 = parseS16Field(token);
      } else if (token.startsWith('s17:')) {
        s17 = parsePrefixedNumber(token, 's17');
      }
    }

    const signalRaw = fields[fields.length - 2] || '';
    const signal = parseSignalInfo(signalRaw);

    const qualityRaw = fields[fields.length - 1] || '';
    const quality = parseQuality(qualityRaw);

    const { date: timestamp, isValid: isTimeValid } = parseCsdTimestamp(timestampRaw);
    const recordErrors: string[] = [];

    if (!isTimeValid) {
      recordErrors.push('Invalid timestamp format');
    }
    if (hasCorruptMarker) {
      recordErrors.push('Contains corrupted $$ marker fields');
    }
    if (status === '$') {
      recordErrors.push('Status flagged as corrupted ($)');
    }

    const normId = stationId.trim().toUpperCase();
    const stationMeta = stationLookup ? stationLookup.get(normId) : undefined;
    const stationName = stationMeta ? stationMeta.stationName : null;

    const record: CsdRecord = {
      id: `rec-${lineNumber}-${stationId}`,
      lineNumber,
      stationId,
      stationName,
      stationMetadata: stationMeta,
      timestamp,
      timestampRaw,
      timeOffset,
      status,
      c1,
      c2,
      c3,
      h,
      sensors,
      sensorMap,
      s16,
      s17,
      signal,
      quality,
      hasCorruptMarkers: hasCorruptMarker,
      errors: recordErrors,
      rawLine,
    };

    records.push(record);

    // Grouping by station
    if (!stationMap.has(stationId)) {
      stationMap.set(stationId, []);
    }
    stationMap.get(stationId)!.push(record);

    // Stats aggregation
    if (quality === 'Good') goodCount++;
    else badCount++;

    if (hasCorruptMarker) corruptFieldRecordsCount++;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (h) {
      hCounts.set(h, (hCounts.get(h) || 0) + 1);
    }
  }

  // Build station summaries
  const stations: StationSummary[] = Array.from(stationMap.entries()).map(([stationId, stRecords]) => {
    let stGood = 0;
    let stBad = 0;
    let stLocked = 0;
    let stUnlocked = 0;
    let stCorrupt = 0;
    const sensorSet = new Set<string>();

    for (const r of stRecords) {
      if (r.quality === 'Good') stGood++;
      else stBad++;

      if (r.status === 'L') stLocked++;
      else if (r.status === 'U') stUnlocked++;
      else stCorrupt++;

      r.sensors.forEach((s) => sensorSet.add(s.key));
    }

    // Sort records by timestamp
    const sorted = [...stRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstSeen = sorted[0]?.timestamp || new Date(0);
    const lastSeen = sorted[sorted.length - 1]?.timestamp || new Date(0);

    const normId = stationId.trim().toUpperCase();
    const stationMeta = stationLookup ? stationLookup.get(normId) : undefined;
    const stationName = stationMeta ? stationMeta.stationName : null;

    return {
      stationId,
      stationName,
      stationMetadata: stationMeta,
      isMapped: !!stationMeta,
      totalRecords: stRecords.length,
      goodRecords: stGood,
      badRecords: stBad,
      lockedCount: stLocked,
      unlockedCount: stUnlocked,
      corruptCount: stCorrupt,
      firstSeen,
      lastSeen,
      activeSensors: Array.from(sensorSet).sort(),
    };
  });

  // Sort stations descending by total records
  stations.sort((a, b) => b.totalRecords - a.totalRecords);

  const topStations = stations.slice(0, 10).map((s) => ({
    stationId: s.stationId,
    count: s.totalRecords,
  }));

  const hValues = Array.from(hCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  const startTime = records.length > 0 ? records[0].timestamp : null;
  const endTime = records.length > 0 ? records[records.length - 1].timestamp : null;

  const stats: FileStats = {
    filename,
    fileSize,
    totalRecords: records.length,
    goodRecords: goodCount,
    badRecords: badCount,
    corruptedFieldsRecords: corruptFieldRecordsCount,
    uniqueStations: stations.length,
    startTime,
    endTime,
    statusBreakdown: statusCounts,
    qualityBreakdown: { Good: goodCount, Bad: badCount },
    topStations,
    hValues,
  };

  const lineEnding = content.includes('\r\n')
    ? content.replace(/\r\n/g, '').includes('\n')
      ? 'MIXED'
      : 'CRLF'
    : 'LF';

  const nonBlankLines = lines.filter((l) => l.trim().length > 0).length;
  const parsingSummary: FileParsingSummary = {
    filename,
    fileSizeBytes: fileSize,
    totalLines: lines.length,
    validRecords: records.length,
    malformedRecords: Math.max(0, nonBlankLines - records.length),
    parseTimeMs: Math.max(1, Math.round(performance.now() - parseStartTime)),
    lineEnding,
    fieldDelimiter: FIELD_DELIMITER_CHAR,
    recordPrefix: RECORD_PREFIX_CHAR,
    detectedEncoding: 'windows-1252',
  };

  const stationBreakdown: Record<
    string,
    { total: number; good: number; bad: number; goodPercentage: number }
  > = {};
  for (const st of stations) {
    stationBreakdown[st.stationId] = {
      total: st.totalRecords,
      good: st.goodRecords,
      bad: st.badRecords,
      goodPercentage:
        st.totalRecords > 0 ? Number(((st.goodRecords / st.totalRecords) * 100).toFixed(1)) : 0,
    };
  }

  const qualitySummary: DataQualitySummary = {
    totalRecords: records.length,
    goodRecords: goodCount,
    badRecords: badCount,
    goodPercentage: records.length > 0 ? Number(((goodCount / records.length) * 100).toFixed(1)) : 0,
    badPercentage: records.length > 0 ? Number(((badCount / records.length) * 100).toFixed(1)) : 0,
    lockedCount: statusCounts.L,
    unlockedCount: statusCounts.U,
    corruptStatusCount: statusCounts.$,
    recordsWithCorruptMarkers: corruptFieldRecordsCount,
    stationBreakdown,
  };

  return {
    filename,
    fileSize,
    parseDate: new Date(),
    records,
    stations,
    parsingSummary,
    qualitySummary,
    stats,
    errors,
  };
}

/**
 * Enriches an existing CSDFile immutably with Station Master metadata.
 * Called when the Excel Station Master is loaded or updated after the CSD file.
 */
export function enrichCsdFileWithStations(
  file: CSDFile,
  stationLookup: Map<string, StationMaster>
): CSDFile {
  const records = file.records.map((r) => {
    const norm = r.stationId.trim().toUpperCase();
    const meta = stationLookup.get(norm);
    return {
      ...r,
      stationName: meta ? meta.stationName : null,
      stationMetadata: meta,
    };
  });

  const stations = file.stations.map((st) => {
    const norm = st.stationId.trim().toUpperCase();
    const meta = stationLookup.get(norm);
    return {
      ...st,
      stationName: meta ? meta.stationName : null,
      stationMetadata: meta,
      isMapped: !!meta,
    };
  });

  return {
    ...file,
    records,
    stations,
  };
}
