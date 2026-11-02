/**
 * Central Export Utility for CWC Data Viewer
 * Orchestrates professional Excel (.xlsx) and CSV (.csv) exports
 */

import { CsdRecord } from '@/types/csd';
import { formatCsdTimestamp } from '../parser/timestamp-parser';
import { InsatSensorConfig } from '../insat/types';
import { computeRecordEngineeringValues } from '../insat/compute';
import { MatrixReportModel, ExportReportMode } from '../export/types';
import { buildMatrixReportFromRecords, formatCwcDateShort } from '../export/matrix-builder';
export { buildMatrixReportFromRecords, formatCwcDateShort, formatTelemetryTimestamp, resolveCalibratedSensorValue } from '../export/matrix-builder';
import {
  createMatrixExcelWorkbook,
  createFlatExcelWorkbook,
  downloadExcelWorkbook,
} from '../export/exceljs-export';
import {
  generateMatrixCsv,
  generateFlattenedMatrixCsv,
  generateFlatRecordsCsv,
  downloadCsvWithBom,
} from '../export/csv-export';

export * from '../export/types';

/**
 * Export section flags — controls which columns appear in flat export.
 */
export interface ExportSections {
  stationInfo: boolean;    // Line, Station ID, Station Name
  timestamp: boolean;      // Date/Time (IST), Offset
  statusQuality: boolean;  // Status, Quality, Corrupt Flag
  configValues: boolean;   // c1, c2, c3, H Code
  insatEngineering: boolean; // All computed INSAT engineering values
  rawSensors: boolean;     // s00–s15, s16, s17
  signalInfo: boolean;     // Signal Power, Type, Code
}

/** Default export sections */
export const DEFAULT_EXPORT_SECTIONS: ExportSections = {
  stationInfo: true,
  timestamp: true,
  statusQuality: true,
  configValues: true,
  insatEngineering: true,
  rawSensors: false,
  signalInfo: false,
};

/**
 * Generate a clean, meaningful filename for telemetry downloads
 * e.g. "UYD_NEW_DELHI_15-OCT_TO_31-OCT.xlsx"
 */
export function generateExportFilename(
  originalFilename: string,
  startDate?: Date | null,
  endDate?: Date | null,
  ext: 'xlsx' | 'csv' = 'xlsx',
  suffix?: string
): string {
  let base = originalFilename
    .replace(/\.(csd|xlsx|csv|txt)$/i, '')
    .trim()
    .replace(/\s+/g, '_');

  if (startDate && endDate && !base.includes('OCT') && !base.includes('TO')) {
    const sStr = formatCwcDateShort(startDate).replace(/[\s:]+/g, '_').toUpperCase();
    const eStr = formatCwcDateShort(endDate).replace(/[\s:]+/g, '_').toUpperCase();
    base = `${base}_${sStr}_TO_${eStr}`;
  }

  if (suffix) {
    base = `${base}_${suffix}`;
  }

  return `${base}.${ext}`;
}

/**
 * Convert CSD records to a flat tabular structure suitable for CSV or Excel export.
 */
export function formatRecordsForExport(
  records: CsdRecord[],
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0
) {
  const enabledInsatSensors = insatSensors?.filter((s) => s.enabled) || [];

  return records.map((r) => {
    const row: Record<string, string | number | null> = {};

    // Station Information
    if (sections.stationInfo) {
      row['Line'] = r.lineNumber;
      row['Station Name'] = r.stationName || 'Unknown';
      row['Station ID'] = r.stationId;
    }

    // Timestamp
    if (sections.timestamp) {
      row['Date/Time (IST)'] = formatCsdTimestamp(r.timestamp);
      row['Time Offset'] = r.timeOffset;
    }

    // Status & Quality
    if (sections.statusQuality) {
      row['Status'] = r.status === 'L' ? 'Locked' : r.status === 'U' ? 'Unlocked' : r.status;
      row['Quality'] = r.quality;
      row['Corrupt Flag'] = r.hasCorruptMarkers ? 'YES' : 'NO';
    }

    // Config Values
    if (sections.configValues) {
      row['c1 (Battery Raw)'] = r.c1;
      row['c2 (Rainfall Raw)'] = r.c2;
      row['c3 (RainDaily Raw)'] = r.c3;
      row['H Code'] = r.h;
    }

    // INSAT Engineering Values
    if (sections.insatEngineering && enabledInsatSensors.length > 0) {
      const engValues = computeRecordEngineeringValues(enabledInsatSensors, r, insatMSL);
      for (const sensor of enabledInsatSensors) {
        const ev = engValues[sensor.sensorName];
        const colName = `${sensor.sensorName} (${sensor.unit})`;
        row[colName] = ev?.isValid ? ev.value : null;
      }
    }

    // Raw Sensors
    if (sections.rawSensors) {
      row['s16 (Composite)'] = r.s16;
      row['s17'] = r.s17;
      r.sensors.forEach((s) => {
        row[`${s.key}`] = s.value;
      });
    }

    // Signal Info
    if (sections.signalInfo) {
      row['Signal Power'] = r.signal.power;
      row['Signal Type'] = r.signal.signalType;
      row['Signal Code'] = r.signal.raw;
    }

    return row;
  });
}

/**
 * Export records as professional Excel (.xlsx) file download
 */
export async function exportToExcel(
  records: CsdRecord[],
  filename: string = 'telemetry_export.xlsx',
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0,
  mode: ExportReportMode = 'matrix',
  existingMatrixModel?: MatrixReportModel | null,
  dateStart?: Date | null,
  dateEnd?: Date | null,
  filterStations?: string[]
): Promise<void> {
  let workbook;

  if (mode === 'matrix') {
    // If active station/date filters are present, rebuild matrix dynamically to reflect filtered scope
    const hasActiveFilters = Boolean((filterStations && filterStations.length > 0) || dateStart || dateEnd);
    const model =
      !hasActiveFilters && existingMatrixModel
        ? existingMatrixModel
        : buildMatrixReportFromRecords(records, insatSensors, insatMSL, filterStations, dateStart, dateEnd);
    workbook = createMatrixExcelWorkbook(model);
  } else {
    // Flat Mode
    workbook = createFlatExcelWorkbook(records, sections, insatSensors, insatMSL);
  }

  await downloadExcelWorkbook(workbook, filename);
}

/**
 * Export records as CSV (.csv) file download with UTF-8 BOM
 */
export function exportToCsv(
  records: CsdRecord[],
  filename: string = 'telemetry_export.csv',
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0,
  mode: ExportReportMode = 'matrix',
  flattenedHeaders: boolean = false,
  existingMatrixModel?: MatrixReportModel | null,
  dateStart?: Date | null,
  dateEnd?: Date | null,
  filterStations?: string[]
): void {
  let csvContent = '';

  if (mode === 'matrix') {
    const hasActiveFilters = Boolean((filterStations && filterStations.length > 0) || dateStart || dateEnd);
    const model =
      !hasActiveFilters && existingMatrixModel
        ? existingMatrixModel
        : buildMatrixReportFromRecords(records, insatSensors, insatMSL, filterStations, dateStart, dateEnd);
    if (flattenedHeaders) {
      csvContent = generateFlattenedMatrixCsv(model);
    } else {
      csvContent = generateMatrixCsv(model);
    }
  } else {
    csvContent = generateFlatRecordsCsv(records, sections, insatSensors, insatMSL);
  }

  downloadCsvWithBom(csvContent, filename);
}
