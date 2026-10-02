/**
 * Binary byte framing constants for .csd environmental logger files
 */

// Start-of-record prefix byte: 0xBB (187 dec, '»' in latin1 / Windows-1252)
export const RECORD_PREFIX_BYTE = 0xBB;
export const RECORD_PREFIX_CHAR = String.fromCharCode(RECORD_PREFIX_BYTE);

// Field delimiter byte: 0xB8 (184 dec, '¸' cedilla in latin1 / Windows-1252)
export const FIELD_DELIMITER_BYTE = 0xB8;
export const FIELD_DELIMITER_CHAR = String.fromCharCode(FIELD_DELIMITER_BYTE);

// Fixed number of fields per standard CSD record
export const EXPECTED_FIELD_COUNT = 21;

// Corrupt / missing field marker in CSD protocol
export const CORRUPT_VALUE_MARKER = '$$';

// Field positions (0-indexed) after stripping 0xBB prefix
export const FIELD_POSITIONS = {
  STATION_ID: 0,
  TIMESTAMP: 1,
  TIME_OFFSET: 2,
  STATUS: 3,
  C1: 4,
  C2: 5,
  C3: 6,
  H: 7,
  // Sensor fields span index 8 to 18 (11 fields total)
  SENSOR_START: 8,
  SENSOR_END: 18,
  // Specific known sensor positions (often at 17 and 18)
  S17: 17,
  S16_COMPOSITE: 18,
  SIGNAL: 19,
  QUALITY: 20,
} as const;
