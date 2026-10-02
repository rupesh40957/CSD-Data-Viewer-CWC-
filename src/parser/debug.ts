/**
 * CSD Telemetry Parser — Development Preview & Debug Utility
 * 
 * Provides human-readable diagnostics and structural inspection of parsed CSD records.
 */

import { ParsedCSDFile, ParsedCSDRecord } from './types';

/**
 * Format a single parsed record for display/debugging.
 */
export function formatRecordDebug(record: ParsedCSDRecord): string {
  const lines: string[] = [
    `────────────────────────────────────────────────────────────────────────`,
    `Record #${record.lineNumber} | ID: ${record.id} | Valid: ${record.isValid ? 'YES' : 'NO'}`,
    `  Timestamp  : ${record.rawTimestamp} (${record.timestamp?.toISOString() || 'INVALID'})`,
    `  Offset     : ${record.offset}`,
    `  Type/Status: ${record.recordType}`,
    `  Configs    : c1=${record.c1 ?? '$$'}, c2=${record.c2 ?? '$$'}, c3=${record.c3 ?? '$$'}, H=${record.h ?? '$$'}`,
    `  Quality    : ${record.quality} | Signal: ${record.signal}`,
  ];

  if (record.sensors.length > 0) {
    const sensorList = record.sensors
      .map((s) => `${s.key}:${s.value !== null ? s.value : '$$'}`)
      .join(', ');
    lines.push(`  Sensors (${record.sensors.length}): ${sensorList}`);
  }

  if (record.unknownFields.length > 0) {
    const unknowns = record.unknownFields
      .map((u) => `[idx ${u.index}: "${u.raw}"]`)
      .join(', ');
    lines.push(`  Unknowns   : ${unknowns}`);
  }

  if (record.parseWarnings.length > 0) {
    lines.push(`  Warnings   : ${record.parseWarnings.join('; ')}`);
  }

  lines.push(`  Raw Line   : ${record.rawLine}`);
  return lines.join('\n');
}

/**
 * Generates a full summary report of a parsed CSD file.
 */
export function generateCSDSummary(file: ParsedCSDFile): string {
  const { metadata } = file;

  const lines: string[] = [
    `========================================================================`,
    `                  CSD TELEMETRY FILE INSPECTION REPORT                  `,
    `========================================================================`,
    `File Name          : ${file.fileName}`,
    `File Size          : ${file.fileSize.toLocaleString()} bytes (${(file.fileSize / 1024).toFixed(1)} KB)`,
    `Total Records      : ${file.recordCount.toLocaleString()}`,
    `Valid Records      : ${file.validRecordCount.toLocaleString()}`,
    `Invalid Records    : ${file.invalidRecordCount.toLocaleString()}`,
    `Time Window        : ${file.startTime?.toISOString()} -> ${file.endTime?.toISOString()}`,
    `Delimiter Detected : ${metadata.delimiterHex} ('${metadata.delimiter}')`,
    `Prefix Detected    : ${metadata.prefixHex}`,
    `Encoding Used      : ${metadata.encoding}`,
    `Unique Stations    : ${metadata.uniqueStations.length}`,
    `Good Quality Frames: ${metadata.goodRecordCount.toLocaleString()} (${((metadata.goodRecordCount / (file.recordCount || 1)) * 100).toFixed(1)}%)`,
    `Bad Quality Frames : ${metadata.badRecordCount.toLocaleString()} (${((metadata.badRecordCount / (file.recordCount || 1)) * 100).toFixed(1)}%)`,
    `Frames with $$     : ${metadata.corruptMarkerRecordCount.toLocaleString()}`,
    `Fields Detected    : ${file.fieldsDetected.join(', ')}`,
    `Sensors Detected   : ${metadata.sensorKeysDetected.join(', ')}`,
    `H-Codes Detected   : ${metadata.hValuesDetected.join(', ')}`,
    `========================================================================`,
  ];

  if (file.records.length > 0) {
    lines.push(`\n>>> FIRST RECORD (Line 1):`);
    lines.push(formatRecordDebug(file.records[0]));

    lines.push(`\n>>> LAST RECORD (Line ${file.records.length}):`);
    lines.push(formatRecordDebug(file.records[file.records.length - 1]));

    // Find first record with corrupt markers ($$)
    const firstBad = file.records.find((r) => r.quality.toLowerCase() === 'bad');
    if (firstBad) {
      lines.push(`\n>>> SAMPLE BAD/FLAGGED RECORD (Line ${firstBad.lineNumber}):`);
      lines.push(formatRecordDebug(firstBad));
    }
  }

  if (file.errors.length > 0) {
    lines.push(`\n>>> PARSE ERRORS / ANOMALIES (${file.errors.length}):`);
    file.errors.slice(0, 5).forEach((e) => {
      lines.push(`  [Line ${e.line}] [${e.severity.toUpperCase()}]: ${e.message}`);
    });
    if (file.errors.length > 5) {
      lines.push(`  ... and ${file.errors.length - 5} more errors`);
    }
  }

  lines.push(`========================================================================`);
  return lines.join('\n');
}

/**
 * Print debug summary directly to console.
 */
export function printCSDSummary(file: ParsedCSDFile): void {
  console.log(generateCSDSummary(file));
}
