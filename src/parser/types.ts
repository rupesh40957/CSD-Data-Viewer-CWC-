/**
 * CSD Telemetry Parser — Strong TypeScript Data Contracts
 * 
 * Defines the conceptual model for parsing .csd environmental/hydrometeorological
 * logger files completely on the client-side.
 */

/**
 * Individual sensor reading representing a single key-value telemetry reading.
 * Preserves original raw representation without unit conversions or calibration transforms.
 */
export interface SensorValue {
  /** Sensor identifier key, e.g. "s00", "s01", ... "s17" */
  key: string;
  /** Parsed numeric value (integer or float), or null if missing / corrupted ($$) */
  value: number | null;
  /** Exact raw string token value from file (e.g. "475", "-02", "00.000", "$$") */
  rawValue: string | null;
}

/**
 * Parsed individual record from a CSD file.
 */
export interface ParsedCSDRecord {
  /** Record ID / Station ID (e.g. "738B66FA") */
  id: string;

  /** Parsed JavaScript Date object preserving exact milliseconds, or null if unparseable */
  timestamp: Date | null;

  /** Original raw timestamp string with exact millisecond precision (e.g. "29/09/2026 00:01:26.573") */
  rawTimestamp: string;

  /** Offset / time-related interval field (e.g. "05:00", "00:00") */
  offset: string;

  /** Record type / carrier status flag (e.g. "L" = Locked, "U" = Unlocked, "$" = Error) */
  recordType: string;

  /** Channel/Config 1 numeric value, or null if corrupted ($$) or missing */
  c1: number | null;

  /** Channel/Config 2 numeric value, or null if corrupted ($$) or missing */
  c2: number | null;

  /** Channel/Config 3 numeric value, or null if corrupted ($$) or missing */
  c3: number | null;

  /** H header identifier code (e.g. "0256", "1007", or null if missing/corrupt) */
  h: string | null;

  /**
   * Ordered list of all sensor readings in this record.
   * Tolerates and preserves duplicate keys (e.g. records containing multiple "s00" entries).
   */
  sensors: SensorValue[];

  /** Trailing data quality / status information (e.g. "Good" | "Bad") */
  quality: string;

  /** Trailing signal burst/status telemetry (e.g. "08P47NG!CA89") */
  signal: string;

  /** Any unrecognized or extra fields not fitting standard protocol tokens */
  unknownFields: {
    raw: string;
    index: number;
  }[];

  /** Complete list of individual unparsed field string tokens after delimiter split */
  rawFields: string[];

  /** Original raw record line string exactly as read from file */
  rawLine: string;

  /** Line number in source file (1-indexed) */
  lineNumber: number;

  /** Any parsing warnings, corrupt marker notices ($$), or format deviations */
  parseWarnings: string[];

  /** True if record parsed successfully without critical structural failure */
  isValid: boolean;
}

/**
 * Diagnostic error or warning captured during CSD parsing.
 */
export interface CSDParseError {
  /** 1-indexed line number in source file */
  line: number;
  /** Descriptive explanation of parse issue */
  message: string;
  /** Severity level */
  severity: 'warning' | 'error';
  /** Original raw record snippet where failure occurred */
  rawRecord?: string;
}

/**
 * Complete parsed CSD file container.
 */
export interface ParsedCSDFile {
  /** Source file name */
  fileName: string;

  /** Source file size in bytes */
  fileSize: number;

  /** Total records parsed (including both valid and invalid) */
  recordCount: number;

  /** Number of valid records without structural failure */
  validRecordCount: number;

  /** Number of malformed or invalid records */
  invalidRecordCount: number;

  /** Earliest chronological record timestamp */
  startTime: Date | null;

  /** Latest chronological record timestamp */
  endTime: Date | null;

  /** Unique field keys detected across the entire file (e.g. ["id", "timestamp", "c1", "s00", ...]) */
  fieldsDetected: string[];

  /** Sequential ordered list of all parsed records */
  records: ParsedCSDRecord[];

  /** List of parsing errors and structural anomalies detected */
  errors: CSDParseError[];

  /** Additional file-level metadata and protocol diagnostics */
  metadata: {
    delimiter: string;
    delimiterHex: string;
    prefixHex: string;
    encoding: string;
    uniqueStations: string[];
    sensorKeysDetected: string[];
    hValuesDetected: string[];
    goodRecordCount: number;
    badRecordCount: number;
    corruptMarkerRecordCount: number;
    [key: string]: unknown;
  };
}

/**
 * Options configurable for CSD parsing.
 */
export interface CSDParseOptions {
  /** Fallback encoding if auto-detect fails (default: 'windows-1252') */
  encoding?: string;
  /** Whether to collect full rawLine string on each record (default: true) */
  includeRawLine?: boolean;
  /** Maximum number of records to parse (default: Infinity) */
  maxRecords?: number;
}
