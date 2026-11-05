/**
 * Professional Excel (.xlsx) Exporter using ExcelJS
 * Implements full styling: multi-level headers, navy title, station grouping merges,
 * thin/medium borders, zebra striping, freeze panes, auto-fit widths, multi-worksheet splitting,
 * and chunked streaming generation to eliminate memory spikes.
 */

import ExcelJS from 'exceljs';
import { MatrixReportModel, StationColumnGroup } from './types';
import { CsdRecord } from '@/types/csd';
import { ExportSections, formatRecordsForExport, DEFAULT_EXPORT_SECTIONS } from '../utils/export';
import { InsatSensorConfig } from '../insat/types';

// Color Palette Constants
const COLOR_TITLE_BG = 'FF0F2744';      // Dark Navy Blue
const COLOR_TITLE_TXT = 'FFFFFFFF';     // White
const COLOR_STATION_BG = 'FF1E3A5F';    // Deep Slate Navy
const COLOR_STATION_TXT = 'FFFFFFFF';   // White
const COLOR_SENSOR_BG = 'FFE2E8F0';     // Soft Slate
const COLOR_SENSOR_TXT = 'FF0F172A';    // Dark Navy
const COLOR_WIMS_BG = 'FFF8FAFC';       // Off-white Slate
const COLOR_ID_BG = 'FFF1F5F9';         // Light Slate
const COLOR_UNIT_BG = 'FFF8FAFC';       // Off-white Slate
const COLOR_ZEBRA_ODD = 'FFF8FAFC';     // Very soft blue-grey
const COLOR_ZEBRA_EVEN = 'FFFFFFFF';    // Pure white
const COLOR_BORDER_THIN = 'FFCBD5E1';   // Subtle Grey border
const COLOR_BORDER_SEP = 'FF64748B';    // Station divider border
const COLOR_BORDER_HEADER = 'FF475569'; // Header bottom border

const FONT_FAMILY = 'Arial';
const MAX_ROWS_PER_SHEET = 500000; // Safety threshold below Excel's 1,048,576 limit

const THIN_BORDER: ExcelJS.Border = {
  style: 'thin',
  color: { argb: COLOR_BORDER_THIN },
};

const CELL_BORDER_DEFAULT: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

// Cached style and font references to eliminate millions of object allocations during export
const CELL_BORDER_NORMAL: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};
const CELL_BORDER_BOUNDARY: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
};
const FILL_ZEBRA_ODD: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_ODD } };
const FILL_ZEBRA_EVEN: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_EVEN } };
const FONT_DATA_DEFAULT: Partial<ExcelJS.Font> = { name: FONT_FAMILY, size: 9, color: { argb: 'FF0F172A' } };
const FONT_EMPTY_DEFAULT: Partial<ExcelJS.Font> = { name: FONT_FAMILY, size: 9, color: { argb: 'FF94A3B8' } };
const FONT_TIME: Partial<ExcelJS.Font> = { name: 'Consolas, monospace', size: 9, bold: true, color: { argb: 'FF0F172A' } };

/**
 * Configure standard CWC header rows 1-6 for a Matrix worksheet.
 */
function setupMatrixHeaders(
  ws: ExcelJS.Worksheet,
  model: MatrixReportModel,
  stationGroups: StationColumnGroup[],
  totalCols: number,
  sheetIndex: number,
  totalSheets: number
): void {
  const safeCols = Math.min(totalCols, 16384);

  // Row 1: Report Title & Period
  const row1 = ws.getRow(1);
  row1.height = 48;

  if (safeCols > 1) {
    ws.mergeCells(1, 1, 1, safeCols);
  }

  for (let c = 1; c <= safeCols; c++) {
    const cell = row1.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      left: c === 1 ? { style: 'thick', color: { argb: 'FF000000' } } : undefined,
      right: c === safeCols ? { style: 'thick', color: { argb: 'FF000000' } } : undefined,
    };
  }

  const partSuffix = totalSheets > 1 ? ` (Part ${sheetIndex + 1} of ${totalSheets})` : '';
  const cellA1 = row1.getCell(1);
  cellA1.value = {
    richText: [
      {
        text: `Telemetry Data Received at Central Receiving Station during${partSuffix}\r\n`,
        font: {
          name: FONT_FAMILY,
          size: 14,
          bold: true,
          color: { argb: 'FF000000' },
        },
      },
      {
        text: model.periodText,
        font: {
          name: FONT_FAMILY,
          size: 13,
          bold: true,
          color: { argb: 'FF002060' }, // Royal Blue
        },
      },
    ],
  };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Row 2: Station Names
  const row2 = ws.getRow(2);
  row2.height = 24;
  const cellA2 = row2.getCell(1);
  cellA2.value = model.dateColumnHeader;
  cellA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_STATION_BG } };
  cellA2.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_STATION_TXT } };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA2.border = {
    top: { style: 'thick', color: { argb: 'FF000000' } },
    bottom: THIN_BORDER,
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  // Row 3: Sensor Parameter Names
  const row3 = ws.getRow(3);
  row3.height = 22;
  const cellA3 = row3.getCell(1);
  cellA3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_STATION_BG } };
  cellA3.border = {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };
  ws.mergeCells(2, 1, 3, 1); // Merge A2:A3 for Date and Time (IST)

  // Row 4: WIMS Station Code
  const row4 = ws.getRow(4);
  row4.height = 18;
  const cellA4 = row4.getCell(1);
  cellA4.value = 'WIMS Station Code';
  cellA4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WIMS_BG } };
  cellA4.font = { name: FONT_FAMILY, size: 8, bold: true, color: { argb: 'FF475569' } };
  cellA4.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA4.border = {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  // Row 5: Datalogger ID
  const row5 = ws.getRow(5);
  row5.height = 18;
  const cellA5 = row5.getCell(1);
  cellA5.value = 'Datalogger ID';
  cellA5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ID_BG } };
  cellA5.font = { name: FONT_FAMILY, size: 8, bold: true, color: { argb: 'FF475569' } };
  cellA5.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA5.border = {
    top: THIN_BORDER,
    bottom: THIN_BORDER,
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  // Row 6: Sensor Unit
  const row6 = ws.getRow(6);
  row6.height = 18;
  const cellA6 = row6.getCell(1);
  cellA6.value = 'Sensor Unit   ';
  cellA6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_UNIT_BG } };
  cellA6.font = { name: FONT_FAMILY, size: 8, italic: true, color: { argb: 'FF64748B' } };
  cellA6.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA6.border = {
    top: THIN_BORDER,
    bottom: { style: 'double', color: { argb: COLOR_BORDER_HEADER } },
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  let curCol = 2;
  for (const group of stationGroups) {
    const startCol = curCol;
    const endCol = Math.min(startCol + group.colSpan - 1, 16384);
    if (startCol > 16384) break;

    // Row 2: Station Name
    for (let c = startCol; c <= endCol; c++) {
      const cell = row2.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_STATION_BG } };
      cell.border = {
        top: { style: 'thick', color: { argb: 'FF000000' } },
        bottom: THIN_BORDER,
        left: c === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: c === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    }
    if (endCol > startCol) {
      ws.mergeCells(2, startCol, 2, endCol);
    }
    const stCell = row2.getCell(startCol);
    stCell.value = group.stationName;
    stCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_STATION_TXT } };
    stCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Sensor Names & Row 6: Sensor Units
    group.sensors.forEach((s: { name: string; unit?: string }, idx: number) => {
      const colNum = startCol + idx;
      if (colNum > 16384) return;
      const cell3 = row3.getCell(colNum);
      cell3.value = s.name;
      cell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SENSOR_BG } };
      cell3.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_SENSOR_TXT } };
      cell3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell3.border = {
        top: THIN_BORDER,
        bottom: THIN_BORDER,
        left: colNum === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: colNum === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };

      const cell6 = row6.getCell(colNum);
      cell6.value = s.unit || '';
      cell6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_UNIT_BG } };
      cell6.font = { name: FONT_FAMILY, size: 8, color: { argb: 'FF64748B' } };
      cell6.alignment = { horizontal: 'center', vertical: 'middle' };
      cell6.border = {
        top: THIN_BORDER,
        bottom: { style: 'double', color: { argb: COLOR_BORDER_HEADER } },
        left: colNum === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: colNum === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    });

    // Row 4: WIMS Code
    for (let c = startCol; c <= endCol; c++) {
      const cell = row4.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WIMS_BG } };
      cell.border = {
        top: THIN_BORDER,
        bottom: THIN_BORDER,
        left: c === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: c === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    }
    if (endCol > startCol) {
      ws.mergeCells(4, startCol, 4, endCol);
    }
    const wimsCell = row4.getCell(startCol);
    wimsCell.value = group.wimsCode || '';
    wimsCell.font = { name: FONT_FAMILY, size: 8, color: { argb: 'FF475569' } };
    wimsCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 5: Datalogger ID
    for (let c = startCol; c <= endCol; c++) {
      const cell = row5.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ID_BG } };
      cell.border = {
        top: THIN_BORDER,
        bottom: THIN_BORDER,
        left: c === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: c === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    }
    if (endCol > startCol) {
      ws.mergeCells(5, startCol, 5, endCol);
    }
    const idCell = row5.getCell(startCol);
    idCell.value = group.stationId;
    idCell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: 'FF0F172A' } };
    idCell.alignment = { horizontal: 'center', vertical: 'middle' };

    curCol += group.colSpan;
  }

  // Auto-fit Column Widths
  ws.getColumn(1).width = 20;
  for (let c = 2; c <= safeCols; c++) {
    const sensorName = String(row3.getCell(c).value || '');
    const unitName = String(row6.getCell(c).value || '');
    const headerLen = Math.max(sensorName.length, unitName.length);
    let colWidth = Math.max(11, Math.min(24, headerLen + 3));
    if (sensorName.toLowerCase().includes('reportingtime')) {
      colWidth = 22;
    }
    ws.getColumn(c).width = colWidth;
  }
}

const MAX_STATIONS_PER_SHEET = 1500; // 1500 stations * 6 sensors = 9000 columns <= 16384

/**
 * Generate a styled ExcelJS Workbook from a MatrixReportModel.
 * Supports multi-sheet splitting for huge multi-year datasets and partitions stations horizontally
 * if total columns would exceed Excel's 16,384 column limit.
 */
export async function createMatrixExcelWorkbook(
  model: MatrixReportModel,
  onProgress?: (pct: number, stage: string) => void
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Central Water Commission (CWC)';
  wb.lastModifiedBy = 'CWC Telemetry System';
  wb.created = new Date();
  wb.modified = new Date();

  const allStationGroups = model.stationGroups;
  const stationPartitions: StationColumnGroup[][] = [];
  if (allStationGroups.length === 0) {
    stationPartitions.push([]);
  } else {
    for (let i = 0; i < allStationGroups.length; i += MAX_STATIONS_PER_SHEET) {
      stationPartitions.push(allStationGroups.slice(i, i + MAX_STATIONS_PER_SHEET));
    }
  }

  const timestamps = model.timestamps;
  const totalRows = timestamps.length;
  const rowChunksCount = Math.max(1, Math.ceil(totalRows / MAX_ROWS_PER_SHEET));
  const totalSheets = stationPartitions.length * rowChunksCount;

  let sheetCounter = 0;

  for (let pIdx = 0; pIdx < stationPartitions.length; pIdx++) {
    const partitionGroups = stationPartitions[pIdx];
    const sheetTotalCols = 1 + partitionGroups.reduce((sum, g) => sum + g.colSpan, 0);
    const safeCols = Math.min(sheetTotalCols, 16384);

    // Pre-calculate boundary column set for this partition
    const boundaryColSet = new Set<number>();
    let colTrack = 1;
    for (const g of partitionGroups) {
      colTrack += g.colSpan;
      boundaryColSet.add(colTrack);
    }

    for (let rChunk = 0; rChunk < rowChunksCount; rChunk++) {
      sheetCounter++;
      let sheetName = 'Sheet1';
      if (totalSheets > 1) {
        if (stationPartitions.length > 1 && rowChunksCount > 1) {
          sheetName = `Part_S${pIdx + 1}_R${rChunk + 1}`;
        } else if (stationPartitions.length > 1) {
          sheetName = `Part_${pIdx + 1}`;
        } else {
          sheetName = `Sheet1_Part${rChunk + 1}`;
        }
      }

      const ws = wb.addWorksheet(sheetName, {
        pageSetup: {
          orientation: 'landscape',
          paperSize: 9, // A4
          fitToPage: false,
          margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
          printTitlesRow: '1:6',
        },
        views: [
          {
            state: 'frozen',
            xSplit: 1,
            ySplit: 6,
            topLeftCell: 'B7',
            showGridLines: true,
          },
        ],
      });

      setupMatrixHeaders(ws, model, partitionGroups, safeCols, sheetCounter - 1, totalSheets);

      const startIdx = rChunk * MAX_ROWS_PER_SHEET;
      const endIdx = Math.min(totalRows, startIdx + MAX_ROWS_PER_SHEET);
      const sheetTimestamps = timestamps.slice(startIdx, endIdx);

      let currentExcelRow = 7;

      for (let rIdx = 0; rIdx < sheetTimestamps.length; rIdx++) {
        // Yield to browser event loop every 25 rows to keep UI responsive and report progress
        if (rIdx % 25 === 0) {
          if (onProgress) {
            const pct = 40 + Math.round((rIdx / sheetTimestamps.length) * 38);
            onProgress(pct, `Formatting matrix rows: ${rIdx + 1} / ${sheetTimestamps.length}`);
          }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        const ts = sheetTimestamps[rIdx];
        const row = ws.getRow(currentExcelRow);
        row.height = 16.5;
        const isOdd = rIdx % 2 === 1;
        const rowFill = isOdd ? FILL_ZEBRA_ODD : FILL_ZEBRA_EVEN;

        const rowData = model.grid.get(ts) || [ts];

        // Col 1: Timestamp
        const dateCell = row.getCell(1);
        dateCell.value = ts;
        dateCell.fill = rowFill;
        dateCell.font = FONT_TIME;
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
        dateCell.border = {
          top: THIN_BORDER,
          bottom: THIN_BORDER,
          left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
          right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
        };

        // Write columns for station groups in this partition
        let curCellCol = 2;
        for (const group of partitionGroups) {
          if (curCellCol > 16384) break;
          for (const s of group.sensors) {
            if (curCellCol > 16384) break;
            const cell = row.getCell(curCellCol);
            const rawVal = rowData[s.colIndex];
            const isBoundary = boundaryColSet.has(curCellCol);

            cell.fill = rowFill;
            cell.border = isBoundary ? CELL_BORDER_BOUNDARY : CELL_BORDER_NORMAL;

            if (rawVal === undefined || rawVal === null || rawVal === '---') {
              cell.value = '---';
              cell.font = FONT_EMPTY_DEFAULT;
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (typeof rawVal === 'number') {
              cell.value = rawVal;
              cell.font = FONT_DATA_DEFAULT;
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = Number.isInteger(rawVal) ? '#,##0' : '#,##0.00';
            } else {
              cell.value = rawVal;
              cell.font = FONT_DATA_DEFAULT;
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }

            curCellCol++;
          }
        }

        currentExcelRow++;
      }
    }
  }

  return wb;
}

/**
 * Generate a styled ExcelJS Workbook for Flattened Tabular Records.
 * Splits into multiple worksheets if rows exceed MAX_ROWS_PER_SHEET.
 */
export function createFlatExcelWorkbook(
  records: CsdRecord[],
  sections: ExportSections = DEFAULT_EXPORT_SECTIONS,
  insatSensors?: InsatSensorConfig[],
  insatMSL: number = 0
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Central Water Commission (CWC)';
  wb.created = new Date();

  const flatData = formatRecordsForExport(records, sections, insatSensors, insatMSL);
  if (flatData.length === 0) {
    wb.addWorksheet('Records Export');
    return wb;
  }

  const colKeys = Object.keys(flatData[0]);
  const totalRows = flatData.length;
  const totalSheets = Math.max(1, Math.ceil(totalRows / MAX_ROWS_PER_SHEET));

  for (let sIdx = 0; sIdx < totalSheets; sIdx++) {
    const sheetName = totalSheets === 1 ? 'Records Export' : `Records_Part${sIdx + 1}`;
    const ws = wb.addWorksheet(sheetName, {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9,
        fitToPage: false,
      },
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Header Row
    const headerRow = ws.getRow(1);
    headerRow.height = 28;

    colKeys.forEach((key, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = key;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITLE_BG } };
      cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_TITLE_TXT } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = CELL_BORDER_DEFAULT;
    });

    const startIdx = sIdx * MAX_ROWS_PER_SHEET;
    const endIdx = Math.min(totalRows, startIdx + MAX_ROWS_PER_SHEET);
    const sheetData = flatData.slice(startIdx, endIdx);

    // Data Rows
    for (let rIdx = 0; rIdx < sheetData.length; rIdx++) {
      const rowObj = sheetData[rIdx];
      const row = ws.getRow(rIdx + 2);
      row.height = 18;
      const isOdd = rIdx % 2 === 1;
      const rowBgColor = isOdd ? COLOR_ZEBRA_ODD : COLOR_ZEBRA_EVEN;

      for (let cIdx = 0; cIdx < colKeys.length; cIdx++) {
        const key = colKeys[cIdx];
        const cell = row.getCell(cIdx + 1);
        const val = rowObj[key];

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
        cell.border = CELL_BORDER_DEFAULT;

        if (val === null || val === undefined) {
          cell.value = '---';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FF94A3B8' } };
        } else if (typeof val === 'number') {
          cell.value = val;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FF0F172A' } };
          cell.numFmt = Number.isInteger(val) ? '#,##0' : '#,##0.00';
        } else {
          cell.value = String(val);
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FF0F172A' } };
        }
      }
    }

    // Column Widths
    colKeys.forEach((key, idx) => {
      const len = key.length;
      ws.getColumn(idx + 1).width = Math.max(12, Math.min(32, len + 4));
    });
  }

  return wb;
}

/**
 * Trigger Excel (.xlsx) file download in browser using ExcelJS
 */
export async function downloadExcelWorkbook(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

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
