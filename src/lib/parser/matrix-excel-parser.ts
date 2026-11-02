/**
 * Parser for CWC Multi-Station Telemetry Reports (.xlsx and .csv)
 * e.g., "UYD NEW DELHI 15-OCT TO 31-OCT.xlsx"
 *
 * Converts multi-level matrix sheets into normalized CSDFile and MatrixReportModel
 */

import * as XLSX from 'xlsx';
import { CSDFile, CSDRecord, FileParsingSummary, DataQualitySummary, FileStats, StationSummary } from '@/types/csd';
import { MatrixReportModel, StationColumnGroup } from '../export/types';
import { StationMaster } from '@/types/station-master';

export interface MatrixParseResult {
  file: CSDFile;
  matrixModel: MatrixReportModel;
}

/**
 * Checks if a 2D sheet matrix represents a CWC Multi-Station Telemetry Report.
 */
export function isCwcMatrixReport(rawRows: unknown[][]): boolean {
  if (!rawRows || rawRows.length < 7) return false;

  const row0 = String(rawRows[0]?.[0] || '');
  const row1Col0 = String(rawRows[1]?.[0] || '');
  const row3Col0 = String(rawRows[3]?.[0] || '');
  const row4Col0 = String(rawRows[4]?.[0] || '');
  const row5Col0 = String(rawRows[5]?.[0] || '');

  const hasTelemetryTitle = /telemetry\s+data\s+received/i.test(row0);
  const hasDateHeader = /date\s+and\s+time/i.test(row1Col0);
  const hasWimsOrDatalogger =
    /wims/i.test(row3Col0) ||
    /datalogger/i.test(row4Col0) ||
    /sensor\s*unit/i.test(row5Col0);

  return hasTelemetryTitle || (hasDateHeader && hasWimsOrDatalogger);
}

/**
 * Parse an Excel or CSV ArrayBuffer of a CWC Multi-Station Telemetry Report.
 */
export function parseCwcMatrixWorkbook(
  buffer: ArrayBuffer,
  filename: string,
  fileSizeBytes: number,
  stationMasterMap?: Map<string, StationMaster>
): MatrixParseResult {
  const startTime = Date.now();

  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = wb.SheetNames[0] || 'Sheet1';
  const worksheet = wb.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook ${filename}`);
  }

  // Read raw 2D array of all cells
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', raw: false });

  if (rawRows.length < 7) {
    throw new Error('File does not have enough rows to be a CWC Telemetry Report (minimum 7 rows required).');
  }

  // Row 1: Title & Period
  const title = String(rawRows[0]?.[0] || '').trim();
  const periodMatch = title.match(/during\s*[\r\n]*\s*([\d\w\-:\s]+To[\d\w\-:\s]+)/i);
  const periodText = periodMatch ? periodMatch[1].trim() : 'Reporting Period';

  // Row 2: Station Names
  const row1 = (rawRows[1] || []).map((v) => String(v || '').trim());
  const dateColName = row1[0] || 'Date and Time (IST)';

  // Row 3: Sensor Parameter Names
  const row2 = (rawRows[2] || []).map((v) => String(v || '').trim());

  // Row 4: WIMS Station Code
  const row3 = (rawRows[3] || []).map((v) => String(v || '').trim());

  // Row 5: Datalogger ID (Station Hex IDs)
  const row4 = (rawRows[4] || []).map((v) => String(v || '').trim());

  // Row 6: Sensor Unit
  const row5 = (rawRows[5] || []).map((v) => String(v || '').trim());

  const totalCols = Math.max(row1.length, row2.length, row4.length);

  // Group columns into StationColumnGroups
  const stationGroups: StationColumnGroup[] = [];
  let currentStation = '';
  let startCol = 1;
  let sensorsInGroup: StationColumnGroup['sensors'] = [];
  let currentStationId = '';
  let currentWimsCode = '';

  for (let c = 1; c < totalCols; c++) {
    const stName = row1[c] || currentStation;
    const sName = row2[c] || `Sensor ${c}`;
    const wims = row3[c] || '';
    const stId = row4[c] || '';
    const unit = row5[c] || '';

    if (stName !== currentStation && currentStation !== '') {
      // Save completed station group
      stationGroups.push({
        stationName: currentStation,
        stationId: currentStationId || currentStation,
        wimsCode: currentWimsCode,
        startColIndex: startCol,
        colSpan: sensorsInGroup.length,
        sensors: sensorsInGroup,
      });

      // Start new group
      currentStation = stName;
      startCol = c;
      currentStationId = stId;
      currentWimsCode = wims;
      sensorsInGroup = [
        {
          name: sName,
          unit,
          key: sName,
          colIndex: c,
        },
      ];
    } else {
      if (!currentStation) {
        currentStation = stName;
        startCol = c;
        currentStationId = stId;
        currentWimsCode = wims;
      }
      if (stId && !currentStationId) currentStationId = stId;
      if (wims && !currentWimsCode) currentWimsCode = wims;

      sensorsInGroup.push({
        name: sName,
        unit,
        key: sName,
        colIndex: c,
      });
    }
  }

  // Push last group
  if (currentStation && sensorsInGroup.length > 0) {
    stationGroups.push({
      stationName: currentStation,
      stationId: currentStationId || currentStation,
      wimsCode: currentWimsCode,
      startColIndex: startCol,
      colSpan: sensorsInGroup.length,
      sensors: sensorsInGroup,
    });
  }

  // Parse data rows (Row 7+)
  const timestamps: string[] = [];
  const grid = new Map<string, (string | number | null)[]>();
  const records: CSDRecord[] = [];
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let recordIdCounter = 1;

  for (let r = 6; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawDateVal = row[0];
    if (rawDateVal === undefined || rawDateVal === null || String(rawDateVal).trim() === '') {
      continue;
    }

    const cellAddr = XLSX.utils.encode_cell({ r, c: 0 });
    const cellObj = worksheet[cellAddr];

    let parsedDate: Date = new Date();
    let tsString = '';

    if (cellObj && cellObj.t === 'n') {
      try {
        tsString = XLSX.SSF.format('yyyy-mm-dd hh:mm:ss', cellObj.v);
        const d = XLSX.SSF.parse_date_code(cellObj.v);
        parsedDate = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H, d.M, Math.floor(d.S)));
      } catch {
        tsString = String(rawDateVal).trim();
        parsedDate = new Date(tsString);
      }
    } else if (rawDateVal instanceof Date) {
      parsedDate = rawDateVal;
      tsString = rawDateVal.toISOString().replace('T', ' ').substring(0, 19);
    } else {
      const s = String(rawDateVal).trim();
      tsString = s;
      parsedDate = new Date(s.replace(' ', 'T'));
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }
    }

    if (!minDate || parsedDate < minDate) minDate = parsedDate;
    if (!maxDate || parsedDate > maxDate) maxDate = parsedDate;

    timestamps.push(tsString);

    // Save grid row
    const gridRow: (string | number | null)[] = [tsString];
    for (let c = 1; c < totalCols; c++) {
      const val = row[c];
      gridRow.push(val !== undefined && val !== null && String(val).trim() !== '' ? val : '---');
    }
    grid.set(tsString, gridRow);

    // Convert each station's reading at this hour into a normalized CSDRecord
    for (const group of stationGroups) {
      let hasData = false;
      let status: 'L' | 'U' | '$' = 'L';
      let rainfallVal: number | null = null;
      let rainDailyVal: number | null = null;
      let waterLevelVal: number | null = null;
      let batteryVal: number | null = null;
      let hasCorrupt = false;

      const sensorList: CSDRecord['sensors'] = [];

      for (const sensor of group.sensors) {
        const rawVal = row[sensor.colIndex];
        const valStr = String(rawVal ?? '').trim();

        if (valStr && valStr !== '---') {
          hasData = true;
        }

        if (valStr.includes('Unlock')) status = 'U';
        if (valStr.includes('?')) hasCorrupt = true;

        // Clean numeric value
        const cleanNumStr = valStr.replace(/^[~?§«»\s]+/, '').trim();
        const num = cleanNumStr !== '' && !isNaN(Number(cleanNumStr)) ? Number(cleanNumStr) : null;

        sensorList.push({
          key: sensor.name,
          label: sensor.name,
          value: num,
          raw: valStr,
          index: sensorList.length,
          unit: sensor.unit,
          isCorrupted: valStr.includes('?'),
        });

        const sNameLower = sensor.name.toLowerCase();
        if (sNameLower.includes('rainfall') && !sNameLower.includes('daily')) {
          rainfallVal = num;
        } else if (sNameLower.includes('raindaily')) {
          rainDailyVal = num;
        } else if (sNameLower.includes('waterlevel')) {
          waterLevelVal = num;
        } else if (sNameLower.includes('battery')) {
          batteryVal = num;
        }
      }

      // Find station master metadata
      const meta = stationMasterMap?.get(group.stationId.toUpperCase());

      const rec: CSDRecord = {
        id: `rec-${recordIdCounter++}-${group.stationId}`,
        lineNumber: r + 1,
        stationId: group.stationId,
        stationName: meta?.stationName || group.stationName,
        stationMetadata: meta,
        timestamp: parsedDate,
        timestampRaw: tsString,
        timeOffset: '05:30',
        status,
        c1: batteryVal !== null ? Math.round(batteryVal * 10) : null,
        c2: rainfallVal !== null ? Math.round(rainfallVal * 2) : null,
        c3: rainDailyVal,
        h: '1007',
        sensors: sensorList,
        sensorMap: {},
        s16: waterLevelVal,
        s17: batteryVal,
        signal: {
          raw: '08P47NG!CA89',
          prefix: 8,
          power: 47,
          signalType: 'NG',
          suffix: 'CA89',
        },
        quality: hasCorrupt ? 'Bad' : 'Good',
        hasCorruptMarkers: hasCorrupt,
        errors: [],
        rawLine: `Matrix Row ${r + 1}: ${group.stationName} (${group.stationId}) @ ${tsString}`,
      };

      records.push(rec);
    }
  }

  // Build Station Summaries
  const stations: StationSummary[] = stationGroups.map((g) => {
    const stRecords = records.filter((r) => r.stationId === g.stationId);
    const goodCount = stRecords.filter((r) => r.quality === 'Good').length;
    const badCount = stRecords.filter((r) => r.quality === 'Bad').length;
    const locked = stRecords.filter((r) => r.status === 'L').length;
    const unlocked = stRecords.filter((r) => r.status === 'U').length;
    const corrupt = stRecords.filter((r) => r.hasCorruptMarkers).length;

    const meta = stationMasterMap?.get(g.stationId.toUpperCase());

    return {
      stationId: g.stationId,
      stationName: meta?.stationName || g.stationName,
      stationMetadata: meta,
      isMapped: !!meta,
      totalRecords: stRecords.length,
      goodRecords: goodCount,
      badRecords: badCount,
      lockedCount: locked,
      unlockedCount: unlocked,
      corruptCount: corrupt,
      firstSeen: minDate || new Date(),
      lastSeen: maxDate || new Date(),
      activeSensors: g.sensors.map((s) => s.name),
    };
  });

  const totalRecords = records.length;
  const goodRecords = records.filter((r) => r.quality === 'Good').length;
  const badRecords = totalRecords - goodRecords;

  const qualitySummary: DataQualitySummary = {
    totalRecords,
    goodRecords,
    badRecords,
    goodPercentage: totalRecords > 0 ? (goodRecords / totalRecords) * 100 : 100,
    badPercentage: totalRecords > 0 ? (badRecords / totalRecords) * 100 : 0,
    lockedCount: records.filter((r) => r.status === 'L').length,
    unlockedCount: records.filter((r) => r.status === 'U').length,
    corruptStatusCount: records.filter((r) => r.status === '$').length,
    recordsWithCorruptMarkers: records.filter((r) => r.hasCorruptMarkers).length,
    stationBreakdown: {},
  };

  const parsingSummary: FileParsingSummary = {
    filename,
    fileSizeBytes,
    totalLines: rawRows.length,
    validRecords: records.length,
    malformedRecords: 0,
    parseTimeMs: Date.now() - startTime,
    lineEnding: 'CRLF',
    fieldDelimiter: ',',
    recordPrefix: 'XLSX_ROW',
    detectedEncoding: 'UTF-8 / OOXML',
  };

  const stats: FileStats = {
    filename,
    fileSize: fileSizeBytes,
    totalRecords: records.length,
    goodRecords,
    badRecords,
    corruptedFieldsRecords: qualitySummary.recordsWithCorruptMarkers,
    uniqueStations: stationGroups.length,
    startTime: minDate,
    endTime: maxDate,
    statusBreakdown: {
      L: qualitySummary.lockedCount,
      U: qualitySummary.unlockedCount,
      $: qualitySummary.corruptStatusCount,
    },
    qualityBreakdown: {
      Good: goodRecords,
      Bad: badRecords,
    },
    topStations: stations.slice(0, 10).map((s) => ({ stationId: s.stationId, count: s.totalRecords })),
    hValues: [{ code: '1007', count: records.length }],
  };

  const matrixModel: MatrixReportModel = {
    title,
    periodText,
    startDate: minDate,
    endDate: maxDate,
    totalColumns: totalCols,
    dateColumnHeader: dateColName,
    stationGroups,
    timestamps,
    grid,
  };

  const file: CSDFile = {
    filename,
    fileSize: fileSizeBytes,
    parseDate: new Date(),
    records,
    stations,
    parsingSummary,
    qualitySummary,
    stats,
    errors: [],
  };

  // Attach matrixModel to file object for seamless re-export
  (file as any).matrixModel = matrixModel;

  return { file, matrixModel };
}
