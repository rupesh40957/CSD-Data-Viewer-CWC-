/**
 * Constants and byte-level protocol framing markers for .csd file parsing.
 */

// Byte framing markers
export const CSD_PREFIX_BYTE = 0xBB; // 187 decimal, '»' in windows-1252 / ISO-8859-1
export const CSD_DELIMITER_BYTE = 0xB8; // 184 decimal, '¸' in windows-1252 / ISO-8859-1

// Character equivalents
export const CSD_PREFIX_CHAR = String.fromCharCode(CSD_PREFIX_BYTE);
export const CSD_DELIMITER_CHAR = String.fromCharCode(CSD_DELIMITER_BYTE);

// Corrupted / missing telemetry marker
export const CSD_CORRUPT_MARKER = '$$';

// Expected field count in standard full CSD records
export const CSD_EXPECTED_FIELD_COUNT = 21;

// Minimum fields needed for a record to be considered syntactically viable
export const CSD_MIN_FIELDS_COUNT = 4;

// Standard field position indices (0-indexed, after prefix removal)
export const CSD_FIELD_INDEX = {
  ID: 0,
  TIMESTAMP: 1,
  OFFSET: 2,
  RECORD_TYPE: 3,
  C1: 4,
  C2: 5,
  C3: 6,
  H: 7,
  SENSOR_START: 8,
} as const;

// Regular expression to match sensor tokens like "s00:475", "s10:-02", "s16:00.000", "s02:$$"
export const SENSOR_TOKEN_REGEX = /^(s\d+):(.*)$/;

// Regular expression to match config tokens like "c1:123", "c2:00", "c3:135"
export const CONFIG_TOKEN_REGEX = /^(c[1-3]):(.*)$/;

// Regular expression to match H token like "H:0256", "H:1007", "H:$$"
export const H_TOKEN_REGEX = /^H:(.*)$/i;

// Regular expression to match timestamp: DD/MM/YYYY HH:mm:ss.mmm
export const TIMESTAMP_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/;
