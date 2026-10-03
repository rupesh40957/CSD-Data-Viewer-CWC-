import * as XLSX from 'xlsx';
import { CsdRecord } from '@/types/csd';
import { formatCsdTimestamp } from '../parser/timestamp-parser';
import { InsatSensorConfig } from '../insat/types';
import { computeRecordEngineeringValues } from '../insat/compute';

/**
 * Export section flags — controls which columns appear in the export.
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
 * Convert CSD records to a flat tabular structure suitable for CSV or Excel export.
 * Uses section flags to control which columns are included.
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
      row['Status'] = r.status;
      row['Quality'] = r.quality;
      row['Corrupt Flag'] = r.hasCorruptMarkers ? 'YES' : 'NO';
    }

    // Config Values
    if (sections.configValues) {
      row['c1'] = r.c1;
      row['c2'] = r.c2;
      row['c3'] = r.c3;
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
 * Export records as Excel (.xlsx) file download
 */
export function exportToExcel(
  records: CsdRecord[],
  filename: string = 'csd_export.xlsx',
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0
) {
  const data = formatRecordsForExport(records, sections, insatSensors, insatMSL);
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 12),
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Report');
  XLSX.writeFile(workbook, filename);
}

/**
 * Export records as CSV file download
 */
export function exportToCsv(
  records: CsdRecord[],
  filename: string = 'csd_export.csv',
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0
) {
  const data = formatRecordsForExport(records, sections, insatSensors, insatMSL);
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
