/**
 * Professional CSV Exporter
 * Implements:
 * - Matrix CSV (preserves exact CWC multi-level headers and station hierarchy)
 * - Flattened CSV (readable "Station - Sensor (Unit)" column names)
 * - UTF-8 BOM for Microsoft Excel compatibility
 * - Proper RFC 4180 escaping (quotes, commas, newlines)
 * - Chunked / streaming generation for huge multi-year archives to prevent string overflow and memory crashes
 */

import { MatrixReportModel } from './types';
import { CsdRecord } from '@/types/csd';
import { ExportSections, formatRecordsForExport, DEFAULT_EXPORT_SECTIONS } from '../utils/export';
import { InsatSensorConfig } from '../insat/types';

/**
 * Escapes a cell value according to RFC 4180.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CWC Multi-Station Matrix CSV (matches UYD NEW DELHI 15-OCT TO 31-OCT structure)
 */
export function generateMatrixCsv(model: MatrixReportModel): string {
  const lines: string[] = [];
  const totalCols = model.totalColumns;

  // Row 1: Title & Dynamic Period (Single header in Column A, followed by empty cells)
  const titleText = `Telemetry Data Received at Central Receiving Station during\n${model.periodText}`;
  const row1Cells = new Array(totalCols).fill('');
  row1Cells[0] = escapeCsvCell(titleText);
  lines.push(row1Cells.join(','));

  // Row 2: Station Names
  const row2Cells = new Array(totalCols).fill('');
  row2Cells[0] = escapeCsvCell(model.dateColumnHeader);
  for (const group of model.stationGroups) {
    for (let c = 0; c < group.colSpan; c++) {
      row2Cells[group.startColIndex + c] = escapeCsvCell(group.stationName);
    }
  }
  lines.push(row2Cells.join(','));

  // Row 3: Sensor Parameter Names
  const row3Cells = new Array(totalCols).fill('');
  for (const group of model.stationGroups) {
    group.sensors.forEach((s) => {
      row3Cells[s.colIndex] = escapeCsvCell(s.name);
    });
  }
  lines.push(row3Cells.join(','));

  // Row 4: WIMS Station Code
  const row4Cells = new Array(totalCols).fill('');
  row4Cells[0] = escapeCsvCell('WIMS Station Code');
  for (const group of model.stationGroups) {
    for (let c = 0; c < group.colSpan; c++) {
      row4Cells[group.startColIndex + c] = escapeCsvCell(group.wimsCode || '');
    }
  }
  lines.push(row4Cells.join(','));

  // Row 5: Datalogger ID
  const row5Cells = new Array(totalCols).fill('');
  row5Cells[0] = escapeCsvCell('Datalogger ID');
  for (const group of model.stationGroups) {
    for (let c = 0; c < group.colSpan; c++) {
      row5Cells[group.startColIndex + c] = escapeCsvCell(group.stationId);
    }
  }
  lines.push(row5Cells.join(','));

  // Row 6: Sensor Unit
  const row6Cells = new Array(totalCols).fill('');
  row6Cells[0] = escapeCsvCell('Sensor Unit   ');
  for (const group of model.stationGroups) {
    group.sensors.forEach((s) => {
      row6Cells[s.colIndex] = escapeCsvCell(s.unit || '');
    });
  }
  lines.push(row6Cells.join(','));

  // Rows 7+: Telemetry Data Rows
  for (const ts of model.timestamps) {
    const rowVals = model.grid.get(ts) || [ts];
    const cells = new Array(totalCols).fill('');
    cells[0] = escapeCsvCell(ts);

    for (let c = 1; c < totalCols; c++) {
      const v = rowVals[c];
      cells[c] = escapeCsvCell(v !== undefined && v !== null ? v : '---');
    }
    lines.push(cells.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Generate CWC Multi-Station Matrix CSV directly as a streaming Blob with UTF-8 BOM.
 * Prevents V8 single-string memory exhaustion on multi-year archives.
 */
export async function generateMatrixCsvBlob(
  model: MatrixReportModel,
  onProgress?: (pct: number, stage: string) => void
): Promise<Blob> {
  const chunks: string[] = ['\uFEFF'];
  const totalCols = model.totalColumns;

  // Header rows 1 to 6
  const row1Cells = new Array(totalCols).fill('');
  row1Cells[0] = escapeCsvCell(`Telemetry Data Received at Central Receiving Station during\n${model.periodText}`);

  const row2Cells = new Array(totalCols).fill('');
  row2Cells[0] = escapeCsvCell(model.dateColumnHeader);
  for (const group of model.stationGroups) {
    for (let c = 0; c < group.colSpan; c++) {
      row2Cells[group.startColIndex + c] = escapeCsvCell(group.stationName);
    }
  }

  const row3Cells = new Array(totalCols).fill('');
  for (const group of model.stationGroups) {
    group.sensors.forEach((s) => {
      row3Cells[s.colIndex] = escapeCsvCell(s.name);
    });
  }

  const row4Cells = new Array(totalCols).fill('');
  row4Cells[0] = escapeCsvCell('WIMS Station Code');
  for (const group of model.stationGroups) {
    for (let c = 0; c < group.colSpan; c++) {
      row4Cells[group.startColIndex + c] = escapeCsvCell(group.wimsCode || '');
    }
  }

  const row5Cells = new Array(totalCols).fill('');
  row5Cells[0] = escapeCsvCell('Datalogger ID');
  for (const group of model.stationGroups) {
    for (let c = 0; c < group.colSpan; c++) {
      row5Cells[group.startColIndex + c] = escapeCsvCell(group.stationId);
    }
  }

  const row6Cells = new Array(totalCols).fill('');
  row6Cells[0] = escapeCsvCell('Sensor Unit   ');
  for (const group of model.stationGroups) {
    group.sensors.forEach((s) => {
      row6Cells[s.colIndex] = escapeCsvCell(s.unit || '');
    });
  }

  chunks.push(
    [
      row1Cells.join(','),
      row2Cells.join(','),
      row3Cells.join(','),
      row4Cells.join(','),
      row5Cells.join(','),
      row6Cells.join(','),
    ].join('\r\n') + '\r\n'
  );

  // Stream data rows in batches of 500
  const BATCH_SIZE = 500;
  let batchBuffer: string[] = [];
  const totalRows = model.timestamps.length;

  for (let i = 0; i < totalRows; i++) {
    const ts = model.timestamps[i];
    const rowVals = model.grid.get(ts) || [ts];
    const cells = new Array(totalCols);
    cells[0] = escapeCsvCell(ts);
    for (let c = 1; c < totalCols; c++) {
      const v = rowVals[c];
      cells[c] = escapeCsvCell(v !== undefined && v !== null ? v : '---');
    }
    batchBuffer.push(cells.join(','));

    if (batchBuffer.length >= BATCH_SIZE || i === totalRows - 1) {
      chunks.push(batchBuffer.join('\r\n') + '\r\n');
      batchBuffer = [];
      if (onProgress && totalRows > 1000) {
        onProgress(Math.round(((i + 1) / totalRows) * 100), `Writing CSV rows: ${i + 1} / ${totalRows}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  return new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generate Flattened CSV from MatrixReportModel with readable "Station - Sensor (Unit)" column names.
 */
export function generateFlattenedMatrixCsv(model: MatrixReportModel): string {
  const lines: string[] = [];
  const headerCols: string[] = [model.dateColumnHeader];

  for (const group of model.stationGroups) {
    for (const sensor of group.sensors) {
      const unitStr = sensor.unit ? ` (${sensor.unit})` : '';
      headerCols.push(escapeCsvCell(`${group.stationName} - ${sensor.name}${unitStr}`));
    }
  }
  lines.push(headerCols.join(','));

  for (const ts of model.timestamps) {
    const rowVals = model.grid.get(ts) || [ts];
    const cells = [escapeCsvCell(ts)];
    for (let c = 1; c < model.totalColumns; c++) {
      const v = rowVals[c];
      cells.push(escapeCsvCell(v !== undefined && v !== null ? v : '---'));
    }
    lines.push(cells.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Generate Flattened Matrix CSV directly as a streaming Blob with UTF-8 BOM.
 */
export async function generateFlattenedMatrixCsvBlob(
  model: MatrixReportModel,
  onProgress?: (pct: number, stage: string) => void
): Promise<Blob> {
  const chunks: string[] = ['\uFEFF'];
  const headerCols: string[] = [model.dateColumnHeader];

  for (const group of model.stationGroups) {
    for (const sensor of group.sensors) {
      const unitStr = sensor.unit ? ` (${sensor.unit})` : '';
      headerCols.push(escapeCsvCell(`${group.stationName} - ${sensor.name}${unitStr}`));
    }
  }
  chunks.push(headerCols.join(',') + '\r\n');

  const BATCH_SIZE = 500;
  let batchBuffer: string[] = [];
  const totalRows = model.timestamps.length;

  for (let i = 0; i < totalRows; i++) {
    const ts = model.timestamps[i];
    const rowVals = model.grid.get(ts) || [ts];
    const cells = [escapeCsvCell(ts)];
    for (let c = 1; c < model.totalColumns; c++) {
      const v = rowVals[c];
      cells.push(escapeCsvCell(v !== undefined && v !== null ? v : '---'));
    }
    batchBuffer.push(cells.join(','));

    if (batchBuffer.length >= BATCH_SIZE || i === totalRows - 1) {
      chunks.push(batchBuffer.join('\r\n') + '\r\n');
      batchBuffer = [];
      if (onProgress && totalRows > 1000) {
        onProgress(Math.round(((i + 1) / totalRows) * 100), `Writing CSV rows: ${i + 1} / ${totalRows}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  return new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generate Flattened CSV from CsdRecord[] (granular line-by-line frames)
 */
export function generateFlatRecordsCsv(
  records: CsdRecord[],
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0
): string {
  const data = formatRecordsForExport(records, sections, insatSensors, insatMSL);
  if (data.length === 0) return '';

  const colKeys = Object.keys(data[0]);
  const lines: string[] = [];

  // Header
  lines.push(colKeys.map(escapeCsvCell).join(','));

  // Data
  for (const r of data) {
    const cells = colKeys.map((k) => escapeCsvCell(r[k]));
    lines.push(cells.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Stream/chunked generator creating a UTF-8 Blob directly from large record sets
 * to avoid V8 single-string length limits and high memory pressure.
 */
export async function createStreamingCsvBlob(
  records: CsdRecord[],
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0,
  onProgress?: (progressPct: number, stage: string) => void
): Promise<Blob> {
  const chunks: string[] = ['\uFEFF']; // UTF-8 BOM
  const data = formatRecordsForExport(records, sections, insatSensors, insatMSL);

  if (data.length === 0) {
    return new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
  }

  const colKeys = Object.keys(data[0]);
  chunks.push(colKeys.map((k) => escapeCsvCell(k)).join(',') + '\r\n');

  const total = data.length;
  const CHUNK_SIZE = 5000;
  let batchBuffer: string[] = [];

  for (let i = 0; i < total; i++) {
    const rowObj = data[i];
    const cells = colKeys.map((k) => {
      const v = rowObj[k];
      return escapeCsvCell(v !== undefined && v !== null ? v : '---');
    });
    batchBuffer.push(cells.join(','));

    if (batchBuffer.length >= CHUNK_SIZE || i === total - 1) {
      chunks.push(batchBuffer.join('\r\n') + '\r\n');
      batchBuffer = [];

      if (onProgress) {
        const pct = Math.round(((i + 1) / total) * 100);
        onProgress(pct, `Formatting CSV: ${i + 1} / ${total} records`);
      }
      // Yield to let UI render progress
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
}

/**
 * Trigger CSV download in browser with UTF-8 BOM encoding.
 * Accepts string or Blob.
 */
export function downloadCsvWithBom(contentOrBlob: string | Blob, filename: string): void {
  let blob: Blob;
  if (typeof contentOrBlob === 'string') {
    blob = new Blob(['\uFEFF' + contentOrBlob], { type: 'text/csv;charset=utf-8;' });
  } else {
    blob = contentOrBlob;
  }

  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
