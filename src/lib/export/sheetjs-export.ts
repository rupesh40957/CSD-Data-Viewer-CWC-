/**
 * High-Performance SheetJS (.xlsx) Tabular Exporter
 * Optimized for massive datasets (50,000 to 500,000+ records)
 * Prevents V8 heap exhaustion and browser "Out of Memory" crashes by using
 * lightweight array-of-arrays streaming directly into binary XLSX buffers.
 */

import * as XLSX from 'xlsx';
import { CsdRecord } from '@/types/csd';
import { ExportSections, DEFAULT_EXPORT_SECTIONS } from '../utils/export';
import { InsatSensorConfig } from '../insat/types';
import { computeRecordEngineeringValues } from '../insat/compute';
import { formatCsdTimestamp } from '../parser/timestamp-parser';
import { createStreamingCsvBlob, downloadCsvWithBom } from './csv-export';
import { ExportProgressController } from './progress-controller';

export async function exportFlatRecordsSheetJs(
  records: CsdRecord[],
  filename: string,
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0,
  onProgress?: ((pct: number, stage: string) => void) | ExportProgressController
): Promise<void> {
  const controller = onProgress instanceof ExportProgressController ? onProgress : null;
  const onProgressCallback = typeof onProgress === 'function' ? onProgress : null;

  // If records exceed 50,000 (e.g. multi-week or multi-year archives),
  // V8 in-browser heap cannot construct a single contiguous 300MB XLSX zip without RangeError.
  // We stream directly into a high-speed UTF-8 CSV (which opens natively in Microsoft Excel).
  if (records.length > 50000) {
    if (controller) {
      controller.update('FORMATTING', 0, records.length, `Streaming ${records.length.toLocaleString()} records via CSV...`);
    } else if (onProgressCallback) {
      onProgressCallback(45, `Exporting all ${records.length.toLocaleString()} records via high-speed streaming engine...`);
    }
    const csvBlob = await createStreamingCsvBlob(records, sections, insatSensors, insatMSL, onProgress);
    const csvFilename = filename.replace(/\.xlsx$/i, '.csv');
    if (controller) {
      controller.update('PREPARING_DOWNLOAD', records.length, records.length, 'Downloading full archive file...');
    } else if (onProgressCallback) {
      onProgressCallback(95, 'Downloading full archive file...');
    }
    downloadCsvWithBom(csvBlob, csvFilename);
    return;
  }

  if (controller) {
    controller.update('BUILDING_STRUCTURE', 1, 10, 'Preparing column headers for Excel...');
  } else if (onProgressCallback) {
    onProgressCallback(40, 'Preparing column headers for Excel...');
  }
  await new Promise((r) => setTimeout(r, 0));

  // 1. Build column headers
  const headers: string[] = [];
  if (sections.stationInfo) {
    headers.push('Line', 'Station Name', 'Station ID');
  }
  if (sections.timestamp) {
    headers.push('Date/Time (IST)', 'Time Offset');
  }
  if (sections.statusQuality) {
    headers.push('Status', 'Quality', 'Corrupt Flag');
  }
  if (sections.configValues) {
    headers.push('c1 (Battery Raw)', 'c2 (Rainfall Raw)', 'c3 (RainDaily Raw)', 'H Code');
  }
  const enabledInsat =
    sections.insatEngineering && insatSensors ? insatSensors.filter((s) => s.enabled) : [];
  for (const s of enabledInsat) {
    headers.push(`${s.sensorName} (${s.unit})`);
  }
  if (sections.rawSensors) {
    headers.push('s16 (Composite)', 's17');
  }
  if (sections.signalInfo) {
    headers.push('Signal Power', 'Signal Type', 'Signal Code');
  }

  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: 'CWC Telemetry Data Export',
    Author: 'Central Water Commission (CWC)',
    CreatedDate: new Date(),
  };

  const CHUNK_SIZE = 5000;
  const rows: (string | number | null)[][] = [headers];
  const total = records.length;

  for (let i = 0; i < total; i++) {
    const r = records[i];
    const row: (string | number | null)[] = [];

    if (sections.stationInfo) {
      row.push(r.lineNumber, r.stationName || 'Unknown', r.stationId);
    }
    if (sections.timestamp) {
      row.push(formatCsdTimestamp(r.timestamp), r.timeOffset);
    }
    if (sections.statusQuality) {
      row.push(
        r.status === 'L' ? 'Locked' : r.status === 'U' ? 'Unlocked' : r.status,
        r.quality,
        r.hasCorruptMarkers ? 'YES' : 'NO'
      );
    }
    if (sections.configValues) {
      row.push(r.c1, r.c2, r.c3, r.h);
    }
    if (enabledInsat.length > 0) {
      const eng = computeRecordEngineeringValues(enabledInsat, r, insatMSL);
      for (const s of enabledInsat) {
        const ev = eng[s.sensorName];
        row.push(ev?.isValid ? ev.value : null);
      }
    }
    if (sections.rawSensors) {
      row.push(r.s16, r.s17);
    }
    if (sections.signalInfo) {
      row.push(r.signal.power, r.signal.signalType, r.signal.raw);
    }

    rows.push(row);

    if (i % CHUNK_SIZE === 0 || i === total - 1) {
      if (controller) {
        controller.checkAborted();
        controller.update('FORMATTING', i + 1, total, `Formatting records: ${i + 1} / ${total}`);
      } else if (onProgressCallback) {
        const pct = 50 + Math.round(((i + 1) / total) * 35);
        onProgressCallback(pct, `Formatting records: ${i + 1} / ${total}`);
      }
      await new Promise((res) => setTimeout(res, 0));
    }
  }

  if (controller) {
    controller.update('GENERATING_FILE', total, total, 'Writing Excel binary buffer...');
  } else if (onProgressCallback) {
    onProgressCallback(88, 'Writing Excel binary buffer...');
  }
  await new Promise((res) => setTimeout(res, 0));

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const colWidths = headers.map((h) => ({ wch: Math.max(12, h.length + 3) }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Records');

  if (controller) {
    controller.update('PREPARING_DOWNLOAD', total, total, 'Preparing file download...');
  } else if (onProgressCallback) {
    onProgressCallback(95, 'Preparing file download...');
  }
  await new Promise((res) => setTimeout(res, 0));

  try {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  } catch (err) {
    console.warn('SheetJS in-memory XLSX serialization limit exceeded, falling back to streaming CSV:', err);
    if (controller) {
      controller.update('GENERATING_FILE', 85, 100, 'Switching to streaming engine for complete archive export...');
    } else if (onProgressCallback) {
      onProgressCallback(85, 'Switching to streaming engine for complete archive export...');
    }
    const csvBlob = await createStreamingCsvBlob(records, sections, insatSensors, insatMSL, onProgress);
    const csvFilename = filename.replace(/\.xlsx$/i, '.csv');
    if (controller) {
      controller.update('PREPARING_DOWNLOAD', 100, 100, 'Downloading archive CSV file...');
    } else if (onProgressCallback) {
      onProgressCallback(98, 'Downloading archive CSV file...');
    }
    downloadCsvWithBom(csvBlob, csvFilename);
  }
}

