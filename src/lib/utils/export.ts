import * as XLSX from 'xlsx';
import { CsdRecord } from '@/types/csd';
import { formatCsdTimestamp } from '../parser/timestamp-parser';

/**
 * Convert CSD records to a flat tabular structure suitable for CSV or Excel export
 */
export function formatRecordsForExport(records: CsdRecord[]) {
  return records.map((r) => {
    const row: Record<string, string | number | null> = {
      'Line': r.lineNumber,
      'Station ID': r.stationId,
      'Date/Time (IST)': formatCsdTimestamp(r.timestamp),
      'Time Offset': r.timeOffset,
      'Status': r.status,
      'Quality': r.quality,
      'c1': r.c1,
      'c2': r.c2,
      'c3': r.c3,
      'H Code': r.h,
      's16 (Value)': r.s16,
      's17': r.s17,
      'Signal Power': r.signal.power,
      'Signal Type': r.signal.signalType,
      'Signal Code': r.signal.raw,
      'Corrupt Flag': r.hasCorruptMarkers ? 'YES' : 'NO',
    };

    // Flatten sensor readings: sensor_0, sensor_1, etc.
    r.sensors.forEach((s, idx) => {
      row[`Sensor_${idx + 1} (${s.key})`] = s.value;
    });

    return row;
  });
}

/**
 * Export records as Excel (.xlsx) file download
 */
export function exportToExcel(records: CsdRecord[], filename: string = 'csd_export.xlsx') {
  const data = formatRecordsForExport(records);
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Report');
  XLSX.writeFile(workbook, filename);
}

/**
 * Export records as CSV file download
 */
export function exportToCsv(records: CsdRecord[], filename: string = 'csd_export.csv') {
  const data = formatRecordsForExport(records);
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
