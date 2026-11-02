/**
 * Professional Excel (.xlsx) Exporter using ExcelJS
 * Implements full styling: multi-level headers, navy title, station grouping merges,
 * thin/medium borders, zebra striping, freeze panes, auto-fit widths, and print layout.
 */

import ExcelJS from 'exceljs';
import { MatrixReportModel } from './types';
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

/**
 * Generate a styled ExcelJS Workbook from a MatrixReportModel.
 */
export function createMatrixExcelWorkbook(model: MatrixReportModel): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Central Water Commission (CWC)';
  wb.lastModifiedBy = 'CWC Telemetry System';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('Sheet1', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: false,
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      printTitlesRow: '1:6', // Repeat rows 1-6 on every printed page
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

  const totalCols = model.totalColumns;

  // -------------------------------------------------------------
  // Row 1: Report Title & Period (Merged A1 to End)
  // Matches official CWC template: Pure White background, thick top/bottom borders,
  // Line 1: Bold Black, Line 2: Bold Deep Blue (#002060)
  // -------------------------------------------------------------
  const row1 = ws.getRow(1);
  row1.height = 48;

  // Merge A1:End first
  if (totalCols > 1) {
    ws.mergeCells(1, 1, 1, totalCols);
  }

  // Format all merged cells in Row 1 with white fill and thick borders
  for (let c = 1; c <= totalCols; c++) {
    const cell = row1.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } },
      bottom: { style: 'thick', color: { argb: 'FF000000' } },
      left: c === 1 ? { style: 'thick', color: { argb: 'FF000000' } } : undefined,
      right: c === totalCols ? { style: 'thick', color: { argb: 'FF000000' } } : undefined,
    };
  }

  // Cell A1 contains richText with 2 lines:
  // Line 1: Bold Black title
  // Line 2: Bold Royal Blue date range (#002060)
  const cellA1 = row1.getCell(1);
  cellA1.value = {
    richText: [
      {
        text: 'Telemetry Data Received at Central Receiving Station during\r\n',
        font: {
          name: FONT_FAMILY,
          size: 14,
          bold: true,
          color: { argb: 'FF000000' }, // Bold Black
        },
      },
      {
        text: model.periodText,
        font: {
          name: FONT_FAMILY,
          size: 13,
          bold: true,
          color: { argb: 'FF002060' }, // Bold Royal Blue (matches official template)
        },
      },
    ],
  };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // -------------------------------------------------------------
  // Row 2: Station Names & Date Header
  // -------------------------------------------------------------
  const row2 = ws.getRow(2);
  row2.height = 38;

  // Cell A2: "Date and Time (IST)" (Merged A2:A3)
  const cellA2 = row2.getCell(1);
  cellA2.value = model.dateColumnHeader;
  cellA2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_STATION_BG } };
  cellA2.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: COLOR_STATION_TXT } };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cellA2.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  // Station Group Headers in Row 2
  for (const group of model.stationGroups) {
    const startCol = group.startColIndex + 1; // 1-based in ExcelJS
    const endCol = startCol + group.colSpan - 1;

    for (let c = startCol; c <= endCol; c++) {
      const cell = row2.getCell(c);
      cell.value = group.stationName;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_STATION_BG } };
      cell.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: COLOR_STATION_TXT } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        left: c === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: c === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    }

    // Merge station columns in Row 2
    if (endCol > startCol) {
      ws.mergeCells(2, startCol, 2, endCol);
    }
  }

  // -------------------------------------------------------------
  // Row 3: Sensor Parameter Names
  // -------------------------------------------------------------
  const row3 = ws.getRow(3);
  row3.height = 30;

  // Cell A3 is merged with A2
  const cellA3 = row3.getCell(1);
  cellA3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_STATION_BG } };
  cellA3.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };
  ws.mergeCells(2, 1, 3, 1); // Merge A2:A3

  for (const group of model.stationGroups) {
    const startCol = group.startColIndex + 1;
    const endCol = startCol + group.colSpan - 1;

    group.sensors.forEach((s, idx) => {
      const colNum = startCol + idx;
      const cell = row3.getCell(colNum);
      cell.value = s.name;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SENSOR_BG } };
      cell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: COLOR_SENSOR_TXT } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        left: colNum === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: colNum === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    });
  }

  // -------------------------------------------------------------
  // Row 4: WIMS Station Code
  // -------------------------------------------------------------
  const row4 = ws.getRow(4);
  row4.height = 18;
  const cellA4 = row4.getCell(1);
  cellA4.value = 'WIMS Station Code';
  cellA4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WIMS_BG } };
  cellA4.font = { name: FONT_FAMILY, size: 9, italic: true, bold: true, color: { argb: 'FF475569' } };
  cellA4.alignment = { horizontal: 'left', vertical: 'middle' };
  cellA4.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  for (const group of model.stationGroups) {
    const startCol = group.startColIndex + 1;
    const endCol = startCol + group.colSpan - 1;

    for (let c = startCol; c <= endCol; c++) {
      const cell = row4.getCell(c);
      cell.value = group.wimsCode || '';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WIMS_BG } };
      cell.font = { name: FONT_FAMILY, size: 8, color: { argb: 'FF64748B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        left: c === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: c === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    }
  }

  // -------------------------------------------------------------
  // Row 5: Datalogger ID
  // -------------------------------------------------------------
  const row5 = ws.getRow(5);
  row5.height = 18;
  const cellA5 = row5.getCell(1);
  cellA5.value = 'Datalogger ID';
  cellA5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ID_BG } };
  cellA5.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: 'FF334155' } };
  cellA5.alignment = { horizontal: 'left', vertical: 'middle' };
  cellA5.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  for (const group of model.stationGroups) {
    const startCol = group.startColIndex + 1;
    const endCol = startCol + group.colSpan - 1;

    for (let c = startCol; c <= endCol; c++) {
      const cell = row5.getCell(c);
      cell.value = group.stationId;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ID_BG } };
      cell.font = { name: 'Consolas, monospace', size: 9, bold: true, color: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        left: c === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: c === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    }
  }

  // -------------------------------------------------------------
  // Row 6: Sensor Unit
  // -------------------------------------------------------------
  const row6 = ws.getRow(6);
  row6.height = 18;
  const cellA6 = row6.getCell(1);
  cellA6.value = 'Sensor Unit   ';
  cellA6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_UNIT_BG } };
  cellA6.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FF475569' } };
  cellA6.alignment = { horizontal: 'left', vertical: 'middle' };
  cellA6.border = {
    top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
    bottom: { style: 'double', color: { argb: COLOR_BORDER_HEADER } },
    left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
  };

  for (const group of model.stationGroups) {
    const startCol = group.startColIndex + 1;
    const endCol = startCol + group.colSpan - 1;

    group.sensors.forEach((s, idx) => {
      const colNum = startCol + idx;
      const cell = row6.getCell(colNum);
      cell.value = s.unit || '';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_UNIT_BG } };
      cell.font = { name: FONT_FAMILY, size: 8, color: { argb: 'FF64748B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDER_THIN } },
        bottom: { style: 'double', color: { argb: COLOR_BORDER_HEADER } },
        left: colNum === startCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
        right: colNum === endCol ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };
    });
  }

  // -------------------------------------------------------------
  // Rows 7+: Telemetry Data Rows
  // -------------------------------------------------------------
  let currentExcelRow = 7;

  // Pre-calculate boundary columns for fast styling
  const boundaryColSet = new Set<number>();
  for (const group of model.stationGroups) {
    boundaryColSet.add(group.startColIndex + group.colSpan);
  }

  model.timestamps.forEach((ts, rowIdx) => {
    const row = ws.getRow(currentExcelRow);
    row.height = 16.5;
    const isOdd = rowIdx % 2 === 1;
    const rowBgColor = isOdd ? COLOR_ZEBRA_ODD : COLOR_ZEBRA_EVEN;

    const rowData = model.grid.get(ts) || [ts];

    // Col 1: Timestamp
    const dateCell = row.getCell(1);
    dateCell.value = ts;
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
    dateCell.font = { name: 'Consolas, monospace', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.border = {
      top: THIN_BORDER,
      bottom: THIN_BORDER,
      left: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
      right: { style: 'medium', color: { argb: COLOR_BORDER_SEP } },
    };

    // Columns 2..N
    for (let c = 2; c <= totalCols; c++) {
      const cell = row.getCell(c);
      const rawVal = rowData[c - 1];
      const isBoundary = boundaryColSet.has(c);

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
      cell.border = {
        top: THIN_BORDER,
        bottom: THIN_BORDER,
        left: THIN_BORDER,
        right: isBoundary ? { style: 'medium', color: { argb: COLOR_BORDER_SEP } } : THIN_BORDER,
      };

      if (rawVal === undefined || rawVal === null || rawVal === '---') {
        cell.value = '---';
        cell.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FF94A3B8' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (typeof rawVal === 'number') {
        cell.value = rawVal;
        cell.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FF0F172A' } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = Number.isInteger(rawVal) ? '#,##0' : '#,##0.00';
      } else {
        const strVal = String(rawVal);
        cell.value = strVal;
        cell.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FF0F172A' } };

        if (strVal.includes('Lock') || strVal.includes('Unlock')) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (strVal.includes('Unlock')) {
            cell.font = { name: FONT_FAMILY, size: 9, bold: true, color: { argb: 'FFD97706' } }; // Amber
          }
        } else if (strVal.startsWith('~') || strVal.startsWith('?') || strVal.startsWith('§')) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (strVal.startsWith('?')) {
            cell.font = { name: FONT_FAMILY, size: 9, color: { argb: 'FFDC2626' } }; // Red
          }
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
    }

    currentExcelRow++;
  });

  // -------------------------------------------------------------
  // Auto-fit Column Widths (with min/max limits)
  // -------------------------------------------------------------
  ws.getColumn(1).width = 20; // Date column

  for (let c = 2; c <= totalCols; c++) {
    // Find sensor name in Row 3
    const sensorName = String(row3.getCell(c).value || '');
    const unitName = String(row6.getCell(c).value || '');
    const headerLen = Math.max(sensorName.length, unitName.length);

    // Default between 11 and 24
    let colWidth = Math.max(11, Math.min(24, headerLen + 3));
    if (sensorName.toLowerCase().includes('reportingtime')) {
      colWidth = 22;
    }
    ws.getColumn(c).width = colWidth;
  }

  return wb;
}

/**
 * Generate a styled ExcelJS Workbook for Flattened Tabular Records.
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

  const ws = wb.addWorksheet('Records Export', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: false,
    },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const flatData = formatRecordsForExport(records, sections, insatSensors, insatMSL);
  if (flatData.length === 0) return wb;

  const colKeys = Object.keys(flatData[0]);

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

  // Data Rows
  flatData.forEach((rowObj, rIdx) => {
    const row = ws.getRow(rIdx + 2);
    row.height = 18;
    const isOdd = rIdx % 2 === 1;
    const rowBgColor = isOdd ? COLOR_ZEBRA_ODD : COLOR_ZEBRA_EVEN;

    colKeys.forEach((key, cIdx) => {
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
    });
  });

  // Column Widths
  colKeys.forEach((key, idx) => {
    const len = key.length;
    ws.getColumn(idx + 1).width = Math.max(12, Math.min(32, len + 4));
  });

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

