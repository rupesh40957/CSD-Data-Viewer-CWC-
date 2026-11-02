/**
 * Types and interfaces for Excel and CSV export functionality
 * Supporting both CWC Multi-Station Matrix Report and Detailed Flattened Records
 */

import { CsdRecord } from '@/types/csd';
import { InsatSensorConfig } from '../insat/types';
import { ExportSections } from '../utils/export';

export type ExportReportMode = 'matrix' | 'flat';

export interface StationColumnGroup {
  stationName: string;
  stationId: string;
  wimsCode?: string;
  startColIndex: number; // 0-based column index
  colSpan: number;
  sensors: {
    name: string;        // e.g. "Rainfall (INSAT)"
    unit: string;        // e.g. "mm"
    key: string;         // e.g. "c2" or "s00"
    colIndex: number;    // 0-based column index in sheet
    resolution?: number; // decimal resolution
  }[];
}

export interface MatrixReportModel {
  title: string;                    // e.g. "Telemetry Data Received at Central Receiving Station during\n15-Oct-2026 00:00 To 31-Oct-2026 23:00"
  periodText: string;               // e.g. "15-Oct-2026 00:00 To 31-Oct-2026 23:00"
  startDate: Date | null;
  endDate: Date | null;
  totalColumns: number;             // including Date/Time column (e.g. 120)
  dateColumnHeader: string;         // "Date and Time (IST)"
  stationGroups: StationColumnGroup[];
  timestamps: string[];             // ISO / formatted timestamps e.g. "2026-10-15 00:00:00"
  // Map of timestamp -> Map of colIndex -> cell value (string | number | null)
  grid: Map<string, (string | number | null)[]>;
}

export interface ExportProgress {
  step: string;
  percent: number;
}

export interface AdvancedExportOptions {
  mode: ExportReportMode;           // 'matrix' (CWC Standard) or 'flat'
  filename?: string;
  sections?: ExportSections;        // For flat mode
  insatSensors?: InsatSensorConfig[];
  insatMSL?: number;
  includeStyles?: boolean;          // true for .xlsx
  zebraStriping?: boolean;
  freezePanes?: boolean;
  landscapePrint?: boolean;
  onProgress?: (progress: ExportProgress) => void;
}

