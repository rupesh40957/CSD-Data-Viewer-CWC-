/**
 * CSD Telemetry Parser Core Engine
 * 
 * Standalone, browser-safe, zero-dependency parser for .csd environmental
 * and hydrometeorological logger files.
 * 
 * Complies with strict protocol framing:
 * - Start-of-record prefix byte: 0xBB ('»')
 * - Field delimiter byte: 0xB8 ('¸')
 * - Preserves exact timestamp precision
 * - Tolerates missing fields ($$), repeated fields, unknown tokens, and malformed frames
 * - Never converts units or applies calibrations
 */

import {
  CSD_PREFIX_CHAR,
  CSD_DELIMITER_CHAR,
  CSD_CORRUPT_MARKER,
  CSD_EXPECTED_FIELD_COUNT,
  CSD_MIN_FIELDS_COUNT,
  CSD_FIELD_INDEX,
  SENSOR_TOKEN_REGEX,
  CONFIG_TOKEN_REGEX,
  H_TOKEN_REGEX,
  TIMESTAMP_REGEX,
} from './constants';
import {
  ParsedCSDFile,
  ParsedCSDRecord,
  SensorValue,
  CSDParseError,
  CSDParseOptions,
} from './types';

/**
 * Safely decodes an ArrayBuffer or Uint8Array using Windows-1252 to preserve framing characters (0xBB, 0xB8).
 */
export function decodeCSDBuffer(buffer: ArrayBuffer | Uint8Array, encoding: string = 'windows-1252'): string {
  try {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(buffer);
  } catch {
    // Fallback to ISO-8859-1 (Latin-1) which maps 1-to-1 with byte values 0x00-0xFF
    const decoder = new TextDecoder('iso-8859-1');
    return decoder.decode(buffer);
  }
}

/**
 * Parse timestamp in format: DD/MM/YYYY HH:mm:ss.mmm
 * Preserves exact millisecond precision.
 */
export function parseCSDTimestamp(rawTimestamp: string): { date: Date | null; isValid: boolean } {
  if (!rawTimestamp || typeof rawTimestamp !== 'string') {
    return { date: null, isValid: false };
  }

  const trimmed = rawTimestamp.trim();
  const match = trimmed.match(TIMESTAMP_REGEX);

  if (!match) {
    const fallback = new Date(trimmed);
    const isValid = !isNaN(fallback.getTime());
    return { date: isValid ? fallback : null, isValid };
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JavaScript Date month is 0-indexed
  const year = parseInt(match[3], 10);
  const hours = parseInt(match[4], 10);
  const minutes = parseInt(match[5], 10);
  const seconds = parseInt(match[6], 10);
  const millis = match[7] ? parseInt(match[7].padEnd(3, '0').slice(0, 3), 10) : 0;

  const date = new Date(year, month, day, hours, minutes, seconds, millis);
  const isValid = !isNaN(date.getTime());

  return { date: isValid ? date : null, isValid };
}

/**
 * Parse a numeric token string without modifying its engineering meaning.
 * Returns null if token represents missing/corrupted data ($$) or unparseable.
 */
export function parseRawNumeric(valStr: string): { value: number | null; isCorrupt: boolean } {
  const trimmed = (valStr || '').trim();

  if (trimmed === CSD_CORRUPT_MARKER || trimmed.includes('$') || trimmed === '') {
    return { value: null, isCorrupt: true };
  }

  const num = Number(trimmed);
  if (isNaN(num)) {
    return { value: null, isCorrupt: false };
  }

  return { value: num, isCorrupt: false };
}

/**
 * Parse an individual CSD record line.
 */
export function parseCSDRecord(
  rawLine: string,
  lineNumber: number,
  delimiter: string
): { record: ParsedCSDRecord; error?: CSDParseError } {
  const warnings: string[] = [];
  let workingLine = rawLine;

  // 1. Detect and strip record prefix byte 0xBB (or '»')
  if (workingLine.charCodeAt(0) === 0xBB || workingLine.startsWith(CSD_PREFIX_CHAR)) {
    workingLine = workingLine.slice(1);
  }

  // 2. Split line by detected field delimiter
  const rawFields = workingLine.split(delimiter);

  // Structural sanity check
  if (rawFields.length < CSD_MIN_FIELDS_COUNT) {
    const malformedRecord: ParsedCSDRecord = {
      id: rawFields[0]?.trim() || `UNKNOWN_${lineNumber}`,
      timestamp: null,
      rawTimestamp: rawFields[1]?.trim() || '',
      offset: rawFields[2]?.trim() || '',
      recordType: rawFields[3]?.trim() || '',
      c1: null,
      c2: null,
      c3: null,
      h: null,
      sensors: [],
      quality: 'Bad',
      signal: '',
      unknownFields: [],
      rawFields,
      rawLine,
      lineNumber,
      parseWarnings: [`Malformed record: only ${rawFields.length} fields found (minimum ${CSD_MIN_FIELDS_COUNT})`],
      isValid: false,
    };

    return {
      record: malformedRecord,
      error: {
        line: lineNumber,
        message: `Line ${lineNumber} has insufficient fields: ${rawFields.length}`,
        severity: 'error',
        rawRecord: rawLine,
      },
    };
  }

  if (rawFields.length !== CSD_EXPECTED_FIELD_COUNT) {
    warnings.push(`Irregular field count: found ${rawFields.length}, expected ${CSD_EXPECTED_FIELD_COUNT}`);
  }

  // Standard positional fields
  const id = rawFields[CSD_FIELD_INDEX.ID]?.trim() || '';
  const rawTimestamp = rawFields[CSD_FIELD_INDEX.TIMESTAMP]?.trim() || '';
  const offset = rawFields[CSD_FIELD_INDEX.OFFSET]?.trim() || '';
  const recordType = rawFields[CSD_FIELD_INDEX.RECORD_TYPE]?.trim() || '';

  const { date: timestamp, isValid: isTimeValid } = parseCSDTimestamp(rawTimestamp);
  if (!isTimeValid) {
    warnings.push(`Unrecognized timestamp format: "${rawTimestamp}"`);
  }

  let c1: number | null = null;
  let c2: number | null = null;
  let c3: number | null = null;
  let h: string | null = null;
  let signal = '';
  let quality = '';

  const sensors: SensorValue[] = [];
  const unknownFields: { raw: string; index: number }[] = [];

  // Parse remaining fields dynamically
  // In standard 21-field records:
  // indices 4, 5, 6 are c1, c2, c3
  // index 7 is H
  // index 8 to length - 3 are sensors
  // index length - 2 is signal
  // index length - 1 is quality
  const lastIndex = rawFields.length - 1;
  const penultimateIndex = rawFields.length - 2;

  // Trailing quality check
  const lastToken = rawFields[lastIndex]?.trim() || '';
  if (lastToken.toLowerCase() === 'good' || lastToken.toLowerCase() === 'bad') {
    quality = lastToken;
  } else {
    // If last token doesn't match Good/Bad, retain it as unknown or raw quality
    quality = lastToken;
    warnings.push(`Unconventional trailing quality token: "${lastToken}"`);
  }

  // Trailing signal check
  const penultToken = rawFields[penultimateIndex]?.trim() || '';
  if (penultToken.includes('P') && (penultToken.includes('NG') || penultToken.includes('NN'))) {
    signal = penultToken;
  } else if (rawFields.length > CSD_MIN_FIELDS_COUNT) {
    signal = penultToken;
  }

  // Iterate over payload fields (between recordType at index 3 and signal/quality at tail)
  const payloadEndIndex = Math.max(CSD_FIELD_INDEX.RECORD_TYPE + 1, penultimateIndex);

  for (let idx = CSD_FIELD_INDEX.RECORD_TYPE + 1; idx < payloadEndIndex; idx++) {
    const token = rawFields[idx]?.trim() || '';

    if (token.includes(CSD_CORRUPT_MARKER)) {
      warnings.push(`Field at position ${idx} contains corrupt marker ($$): "${token}"`);
    }

    // Match c1, c2, c3
    const configMatch = token.match(CONFIG_TOKEN_REGEX);
    if (configMatch) {
      const key = configMatch[1];
      const valStr = configMatch[2];
      const parsedNum = parseRawNumeric(valStr);

      if (key === 'c1') c1 = parsedNum.value;
      else if (key === 'c2') c2 = parsedNum.value;
      else if (key === 'c3') c3 = parsedNum.value;
      continue;
    }

    // Match H
    const hMatch = token.match(H_TOKEN_REGEX);
    if (hMatch) {
      const valStr = hMatch[1].trim();
      h = valStr === CSD_CORRUPT_MARKER || valStr.includes('$') ? null : valStr;
      continue;
    }

    // Match Sensor token s00 - s17
    const sensorMatch = token.match(SENSOR_TOKEN_REGEX);
    if (sensorMatch) {
      const key = sensorMatch[1];
      const valStr = sensorMatch[2];
      const parsedNum = parseRawNumeric(valStr);

      sensors.push({
        key,
        value: parsedNum.value,
        rawValue: valStr,
      });
      continue;
    }

    // Unknown field preserved
    unknownFields.push({
      raw: token,
      index: idx,
    });
    warnings.push(`Unknown or unkeyed field at index ${idx}: "${token}"`);
  }

  const isValid = isTimeValid && id.length > 0;

  const record: ParsedCSDRecord = {
    id,
    timestamp,
    rawTimestamp,
    offset,
    recordType,
    c1,
    c2,
    c3,
    h,
    sensors,
    quality,
    signal,
    unknownFields,
    rawFields,
    rawLine,
    lineNumber,
    parseWarnings: warnings,
    isValid,
  };

  return { record };
}

/**
 * Parse an entire CSD content string into structured ParsedCSDFile.
 */
export function parseCSDString(
  content: string,
  options?: CSDParseOptions,
  fileName: string = 'unknown.csd',
  fileSize: number = 0
): ParsedCSDFile {
  const records: ParsedCSDRecord[] = [];
  const errors: CSDParseError[] = [];

  // Determine line endings (CRLF or LF or CR)
  const lines = content.split(/\r\n|\n|\r/);

  // Auto-detect delimiter: check for 0xB8 first, then fallback to comma
  let detectedDelimiter = CSD_DELIMITER_CHAR;
  let sampleLine = '';
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (lines[i].trim().length > 0) {
      sampleLine = lines[i];
      break;
    }
  }

  if (sampleLine.includes(CSD_DELIMITER_CHAR)) {
    detectedDelimiter = CSD_DELIMITER_CHAR;
  } else if (sampleLine.includes(',')) {
    detectedDelimiter = ',';
  } else if (sampleLine.includes('\t')) {
    detectedDelimiter = '\t';
  }

  const fieldsDetectedSet = new Set<string>();
  const stationSet = new Set<string>();
  const sensorKeysSet = new Set<string>();
  const hValuesSet = new Set<string>();

  fieldsDetectedSet.add('id');
  fieldsDetectedSet.add('timestamp');
  fieldsDetectedSet.add('offset');
  fieldsDetectedSet.add('recordType');

  let validCount = 0;
  let invalidCount = 0;
  let goodCount = 0;
  let badCount = 0;
  let corruptMarkerCount = 0;

  let minTime: Date | null = null;
  let maxTime: Date | null = null;

  const maxRecords = options?.maxRecords ?? Infinity;

  for (let i = 0; i < lines.length && records.length < maxRecords; i++) {
    const rawLine = lines[i];
    // Skip empty lines
    if (!rawLine || rawLine.trim() === '') continue;

    const lineNumber = i + 1;
    const { record, error } = parseCSDRecord(rawLine, lineNumber, detectedDelimiter);

    records.push(record);

    if (error) {
      errors.push(error);
    }

    if (record.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    if (record.id) {
      stationSet.add(record.id);
    }

    if (record.c1 !== null) fieldsDetectedSet.add('c1');
    if (record.c2 !== null) fieldsDetectedSet.add('c2');
    if (record.c3 !== null) fieldsDetectedSet.add('c3');
    if (record.h !== null) {
      fieldsDetectedSet.add('H');
      hValuesSet.add(record.h);
    }

    if (record.signal) fieldsDetectedSet.add('signal');
    if (record.quality) {
      fieldsDetectedSet.add('quality');
      if (record.quality.toLowerCase() === 'good') goodCount++;
      else badCount++;
    }

    // Check corrupt markers
    if (rawLine.includes(CSD_CORRUPT_MARKER)) {
      corruptMarkerCount++;
    }

    // Collect sensor keys
    for (const s of record.sensors) {
      fieldsDetectedSet.add(s.key);
      sensorKeysSet.add(s.key);
    }

    // Track chronological timestamps
    if (record.timestamp) {
      if (!minTime || record.timestamp < minTime) minTime = record.timestamp;
      if (!maxTime || record.timestamp > maxTime) maxTime = record.timestamp;
    }
  }

  const delimiterHex =
    '0x' + (detectedDelimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));

  return {
    fileName,
    fileSize: fileSize || content.length,
    recordCount: records.length,
    validRecordCount: validCount,
    invalidRecordCount: invalidCount,
    startTime: minTime,
    endTime: maxTime,
    fieldsDetected: Array.from(fieldsDetectedSet).sort(),
    records,
    errors,
    metadata: {
      delimiter: detectedDelimiter,
      delimiterHex,
      prefixHex: '0xBB',
      encoding: options?.encoding || 'windows-1252',
      uniqueStations: Array.from(stationSet).sort(),
      sensorKeysDetected: Array.from(sensorKeysSet).sort(),
      hValuesDetected: Array.from(hValuesSet).sort(),
      goodRecordCount: goodCount,
      badRecordCount: badCount,
      corruptMarkerRecordCount: corruptMarkerCount,
    },
  };
}

/**
 * Parse an ArrayBuffer or Uint8Array directly into ParsedCSDFile.
 */
export function parseCSDBuffer(
  buffer: ArrayBuffer | Uint8Array,
  options?: CSDParseOptions,
  fileName: string = 'unknown.csd'
): ParsedCSDFile {
  const encoding = options?.encoding || 'windows-1252';
  const decoded = decodeCSDBuffer(buffer, encoding);
  const byteLength = buffer instanceof Uint8Array ? buffer.byteLength : buffer.byteLength;
  return parseCSDString(decoded, options, fileName, byteLength);
}

/**
 * Browser-safe asynchronous file reader that accepts a File or Blob from <input type="file"> or drag-and-drop.
 * Never uploads data to any server; reads entirely within local client memory.
 */
export async function parseCSDFile(
  file: File | Blob,
  options?: CSDParseOptions
): Promise<ParsedCSDFile> {
  const fileName = file instanceof File ? file.name : 'uploaded.csd';
  const fileSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error('FileReader returned empty buffer');
        }
        const parsed = parseCSDBuffer(buffer, options, fileName);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown read error'}`));
    };

    reader.readAsArrayBuffer(file);
  });
}
