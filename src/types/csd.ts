import { StationMaster } from './station-master';

export type RecordStatus = 'L' | 'U' | '$';
export type RecordQuality = 'Good' | 'Bad';

/**
 * 3. SensorField: Represents an individual parsed sensor reading token
 */
export interface SensorField {
  key: string;            // e.g. "s00", "s01", ... "s17"
  label: string;          // Human-readable sensor label, e.g. "Sensor 00", "Composite Float s16"
  value: number | null;   // null if "$$" or invalid number
  raw: string;            // raw token string, e.g. "s00:475" or "s02:$$"
  index: number;          // position index in sensor list (0-10)
  unit?: string;          // Engineering unit if mapped (e.g. "m", "V", "dB")
  isCorrupted: boolean;   // true if contains '$$' or corrupted indicator
}

/**
 * Backward compatibility alias for SensorReading
 */
export type SensorReading = SensorField;

/**
 * Signal carrier and RF transmission metadata
 */
export interface SignalInfo {
  raw: string;            // e.g. "08P47NG!CA89"
  prefix: number;         // e.g. 8
  power: number;          // e.g. 47 (dB / signal strength)
  signalType: 'NG' | 'NN' | string; // NG (Normal Good), NN (Normal Bad / Noise)
  suffix: string;         // e.g. "CA89"
}

/**
 * 2. CSDRecord: Normalized single telemetry frame from a CSD stream
 */
export interface CSDRecord {
  id: string;             // unique record identifier (e.g. "rec-1-738B66FA")
  lineNumber: number;     // 1-indexed line position in source file
  stationId: string;      // 8-character hex station id (e.g. "738B66FA")
  stationName: string | null; // Mapped station name from Excel master (e.g. "Gandhi Sagar Dam") or null if unmapped
  stationMetadata?: StationMaster; // Rich station master info (State, District, River, Division)
  timestamp: Date;        // Parsed timestamp
  timestampRaw: string;   // Original timestamp text (e.g. "29/09/2026 00:01:26.573")
  timeOffset: string;     // Transmission offset or zone (e.g. "05:00")
  status: RecordStatus;   // "L" (Locked), "U" (Unlocked), "$" (Corrupted/Error)
  recordType?: string | null; // Derived or explicit record type / H code
  c1: number | null;      // Channel / Config 1
  c2: number | null;      // Channel / Config 2
  c3: number | null;      // Channel / Config 3
  h: string | null;       // Command / H identifier code (e.g. "0256", "1007")
  sensors: SensorField[]; // Array preserving raw sequence and repeated keys
  sensorMap: Record<string, (number | null)[]>; // Fast key lookup map
  s16: number | null;     // Specialized composite float reading (e.g. 00.813)
  s17: number | null;     // Auxiliary reading / battery
  signal: SignalInfo;     // RF signal telemetry
  quality: RecordQuality; // Overall data quality classification ('Good' | 'Bad')
  hasCorruptMarkers: boolean; // Flagged true if '$$' appears in any field
  errors: string[];       // Parsing anomalies or validation flags
  rawLine?: string;       // Original unparsed line for telemetry debugging
}

/**
 * Backward compatibility alias for CsdRecord
 */
export type CsdRecord = CSDRecord;

/**
 * Station-level aggregation metadata
 */
export interface StationSummary {
  stationId: string;
  stationName: string | null;
  stationMetadata?: StationMaster;
  isMapped: boolean;
  totalRecords: number;
  goodRecords: number;
  badRecords: number;
  lockedCount: number;
  unlockedCount: number;
  corruptCount: number;
  firstSeen: Date;
  lastSeen: Date;
  activeSensors: string[];
}

/**
 * 7. FileParsingSummary: Comprehensive metadata about the parsing execution
 */
export interface FileParsingSummary {
  filename: string;
  fileSizeBytes: number;
  totalLines: number;
  validRecords: number;
  malformedRecords: number;
  parseTimeMs: number;
  lineEnding: 'CRLF' | 'LF' | 'MIXED';
  fieldDelimiter: string;
  recordPrefix: string;
  detectedEncoding: string;
}

/**
 * 8. DataQualitySummary: Aggregate health metrics across all parsed records
 */
export interface DataQualitySummary {
  totalRecords: number;
  goodRecords: number;
  badRecords: number;
  goodPercentage: number;
  badPercentage: number;
  lockedCount: number;
  unlockedCount: number;
  corruptStatusCount: number;
  recordsWithCorruptMarkers: number;
  stationBreakdown: Record<string, { total: number; good: number; bad: number; goodPercentage: number }>;
}

/**
 * FileStats (retains legacy stats compatibility)
 */
export interface FileStats {
  filename: string;
  fileSize: number;
  totalRecords: number;
  goodRecords: number;
  badRecords: number;
  corruptedFieldsRecords: number;
  uniqueStations: number;
  startTime: Date | null;
  endTime: Date | null;
  statusBreakdown: Record<RecordStatus, number>;
  qualityBreakdown: Record<RecordQuality, number>;
  topStations: { stationId: string; count: number }[];
  hValues: { code: string; count: number }[];
}

export interface ParseError {
  line: number;
  message: string;
  severity: 'warning' | 'error';
  raw?: string;
}

/**
 * 1. CSDFile: Top-level normalized data model for a parsed .csd file
 */
export interface CSDFile {
  filename: string;
  fileSize: number;
  parseDate: Date;
  records: CSDRecord[];
  stations: StationSummary[];
  parsingSummary: FileParsingSummary;
  qualitySummary: DataQualitySummary;
  stats: FileStats; // Retained for backward-compatibility with existing views
  errors: ParseError[];
}

/**
 * Backward compatibility alias for CsdFile
 */
export type CsdFile = CSDFile;

/**
 * 4. SensorSeries: Time-series collection for a specific sensor, ready for high-performance charting
 */
export interface SensorDataPoint {
  timestamp: Date;
  timestampRaw: string;
  timeLabel: string;
  value: number | null;
  recordId: string;
  stationId: string;
  quality: RecordQuality;
  isCorrupted: boolean;
}

export interface SensorSeriesStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
  count: number;
  nullCount: number;
}

export interface SensorSeries {
  sensorKey: string;
  label: string;
  unit?: string;
  stationId?: string;
  dataPoints: SensorDataPoint[];
  stats: SensorSeriesStats;
}

/**
 * 5. DataFilter: Comprehensive criteria for filtering normalized telemetry records
 */
export interface DataFilter {
  selectedStations: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  quality: 'all' | RecordQuality;
  status: RecordStatus[];
  recordType: string[]; // e.g. "H:0256", "H:1007", or "all"
  searchQuery: string;
  selectedSensors: string[];
}

/**
 * 6. ChartConfig: Configuration parameters for visualization views
 */
export type VisualizationType = 'line' | 'bar' | 'scatter' | 'histogram' | 'multiaxis';

export interface ChartConfig {
  activeVisualization: VisualizationType;
  selectedSensors: string[];
  stationFocus: string | 'ALL';
  timeWindow: 'all' | '1h' | '6h' | '12h' | '24h';
  sampleLimit: number; // Downsampling target (e.g. 200 - 500) to keep DOM / SVG responsive
  aggregationMode: 'raw' | 'sampled' | 'averaged';
  showAnomalies: boolean;
}
