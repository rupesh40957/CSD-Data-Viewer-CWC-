/**
 * Professional PDF / Print Exporter for CWC Telemetry Reports
 * Generates an official, print-ready document formatted for landscape PDF output
 * with exact CWC header banner, multi-level headers, and repeating headers.
 */

import { MatrixReportModel } from './types';
import { CsdRecord } from '@/types/csd';
import { ExportSections, formatRecordsForExport, DEFAULT_EXPORT_SECTIONS } from '../utils/export';
import { InsatSensorConfig } from '../insat/types';

/**
 * Escapes HTML characters
 */
function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates clean, print-ready HTML for the CWC Multi-Station Matrix Report
 */
export function generateMatrixPrintHtml(model: MatrixReportModel): string {
  // 1. Station headers
  const stationThs = model.stationGroups
    .map(
      (g) =>
        `<th class="station" colspan="${g.colSpan}">${escapeHtml(g.stationName)}</th>`
    )
    .join('');

  // 2. Sensor headers
  const sensorThs = model.stationGroups
    .flatMap((g) =>
      g.sensors.map((s) => `<th class="sensor">${escapeHtml(s.name)}</th>`)
    )
    .join('');

  // 3. WIMS Station Code headers
  const wimsThs = model.stationGroups
    .map(
      (g) =>
        `<th class="meta" colspan="${g.colSpan}">${escapeHtml(g.wimsCode || '---')}</th>`
    )
    .join('');

  // 4. Datalogger ID headers
  const idThs = model.stationGroups
    .map(
      (g) =>
        `<th class="meta id" colspan="${g.colSpan}">${escapeHtml(g.stationId)}</th>`
    )
    .join('');

  // 5. Sensor Units
  const unitThs = model.stationGroups
    .flatMap((g) =>
      g.sensors.map((s) => `<th class="unit">${escapeHtml(s.unit || '---')}</th>`)
    )
    .join('');

  // 6. Data rows
  const dataRows = model.timestamps
    .map((ts) => {
      const rowVals = model.grid.get(ts) || [ts];
      const cells: string[] = [`<td class="time">${escapeHtml(ts)}</td>`];
      for (let c = 1; c < model.totalColumns; c++) {
        const v = rowVals[c];
        const valStr = v !== undefined && v !== null ? String(v) : '---';
        const isMuted = valStr === '---' || valStr === '-40' || valStr === '0';
        cells.push(`<td class="${isMuted ? 'muted' : ''}">${escapeHtml(valStr)}</td>`);
      }
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CWC Telemetry Report - ${escapeHtml(model.periodText)}</title>
  <style>
    @page {
      size: landscape;
      margin: 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 12px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-banner {
      text-align: center;
      border: 2px solid #000000;
      padding: 10px 14px;
      margin-bottom: 12px;
      background: #ffffff;
      border-radius: 4px;
    }
    .header-title {
      font-size: 15px;
      font-weight: 800;
      color: #000000;
      letter-spacing: -0.01em;
    }
    .header-period {
      font-size: 13px;
      font-weight: 800;
      color: #002060;
      margin-top: 3px;
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5px;
      table-layout: auto;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 4px 6px;
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
    }
    th.time-header {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
      font-size: 9px;
    }
    th.station {
      background: #1e3a5f !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 9.5px;
      padding: 6px 4px;
    }
    th.sensor {
      background: #e2e8f0 !important;
      color: #0f172a !important;
      font-weight: 700;
      font-size: 8px;
    }
    th.meta {
      background: #f8fafc !important;
      color: #475569 !important;
      font-size: 8px;
      font-weight: 600;
    }
    th.meta.id {
      font-family: monospace;
      color: #0f172a;
      font-size: 8.5px;
    }
    th.unit {
      background: #f1f5f9 !important;
      color: #64748b !important;
      font-size: 8px;
      font-style: italic;
    }
    td.time {
      font-family: monospace;
      font-weight: 600;
      background: #f8fafc;
      color: #1e293b;
      text-align: left;
      padding-left: 8px;
    }
    td.muted {
      color: #94a3b8;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="header-title">Telemetry Data Received at Central Receiving Station during</div>
    <div class="header-period">${escapeHtml(model.periodText)}</div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <!-- Row 1: Station Names -->
        <tr>
          <th rowspan="4" class="time-header">${escapeHtml(model.dateColumnHeader)}</th>
          ${stationThs}
        </tr>
        <!-- Row 2: Sensors -->
        <tr>${sensorThs}</tr>
        <!-- Row 3: WIMS Code -->
        <tr>${wimsThs}</tr>
        <!-- Row 4: Datalogger ID -->
        <tr>${idThs}</tr>
        <!-- Row 5: Sensor Unit -->
        <tr>
          <th class="time-header" style="font-size: 8px;">Sensor Unit</th>
          ${unitThs}
        </tr>
      </thead>
      <tbody>
        ${dataRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Triggers PDF export via print-to-PDF in a clean child window
 */
export function exportMatrixToPdf(model: MatrixReportModel): void {
  if (typeof window === 'undefined') return;

  const html = generateMatrixPrintHtml(model);
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    // Popup blocked, fallback to printing current page
    window.print();
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for rendering then trigger print
  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

