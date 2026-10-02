import * as XLSX from 'xlsx';
import {
  StationMaster,
  StationMasterDuplicate,
  StationMasterSummary,
} from '@/types/station-master';

/**
 * Exact column names as provided in the source Excel file.
 * NOTE: "Sation ID" contains the exact typo from the master sheet.
 * We must NOT change this source lookup key.
 */
export const EXCEL_STATION_ID_COL = 'Sation ID';
export const EXCEL_STATION_NAME_COL = 'Station_Name';
export const EXCEL_STATE_NAME_COL = 'State Name';
export const EXCEL_ORG_NAME_COL = 'Organization Name';
export const EXCEL_DIV_OFFICE_COL = 'Division Office';
export const EXCEL_DISTRICT_COL = 'District';
export const EXCEL_RIVER_NAME_COL = 'River Name';

export interface StationMasterParseResult {
  stations: StationMaster[];
  lookupMap: Map<string, StationMaster>;
  summary: StationMasterSummary;
}

/**
 * Normalizes a Station ID according to specification:
 * - Trims whitespace
 * - Converts to uppercase
 * - Guarantees non-numeric string type
 * - Does not alter hex digits or length
 */
export function normalizeStationId(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  return String(raw).trim().toUpperCase();
}

/**
 * Browser-compatible parser for the Station Master Excel workbook (.xlsx).
 * Works purely in memory with ArrayBuffer, never sending data to any backend.
 */
export function parseStationMasterWorkbook(
  buffer: ArrayBuffer | Uint8Array,
  workbookName = 'Telemetryu sites details all station.xlsx'
): StationMasterParseResult {
  const startTime = performance.now();

  // Read workbook using SheetJS with array buffer
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook ${workbookName}`);
  }

  // Read raw 2D array to inspect the actual header row
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
  const headerRow: string[] = (rawMatrix[0] as string[] || []).map((h) => String(h || '').trim());

  // Convert worksheet to objects
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });

  const stations: StationMaster[] = [];
  const lookupMap = new Map<string, StationMaster>();
  const duplicateTracker = new Map<string, { rows: number[]; records: StationMaster[] }>();

  // Process rows starting from row 2 (1-indexed row number, header is row 1)
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const excelRowNumber = i + 2;

    // Read the exact "Sation ID" column (with fallback to tolerant casing if needed)
    const rawStationId =
      row[EXCEL_STATION_ID_COL] ??
      row['Station ID'] ??
      row['Station_ID'] ??
      row['sation id'];

    const rawStationName =
      row[EXCEL_STATION_NAME_COL] ??
      row['Station Name'] ??
      row['station_name'];

    const normalizedId = normalizeStationId(rawStationId);

    // Skip empty rows without valid station ID
    if (!normalizedId) {
      continue;
    }

    const stationName =
      rawStationName !== undefined && rawStationName !== null
        ? String(rawStationName).trim()
        : '';

    const stateName =
      row[EXCEL_STATE_NAME_COL] !== undefined && row[EXCEL_STATE_NAME_COL] !== null
        ? String(row[EXCEL_STATE_NAME_COL]).trim()
        : undefined;

    const organizationName =
      row[EXCEL_ORG_NAME_COL] !== undefined && row[EXCEL_ORG_NAME_COL] !== null
        ? String(row[EXCEL_ORG_NAME_COL]).trim()
        : undefined;

    const divisionOffice =
      row[EXCEL_DIV_OFFICE_COL] !== undefined && row[EXCEL_DIV_OFFICE_COL] !== null
        ? String(row[EXCEL_DIV_OFFICE_COL]).trim()
        : undefined;

    const district =
      row[EXCEL_DISTRICT_COL] !== undefined && row[EXCEL_DISTRICT_COL] !== null
        ? String(row[EXCEL_DISTRICT_COL]).trim()
        : undefined;

    const riverName =
      row[EXCEL_RIVER_NAME_COL] !== undefined && row[EXCEL_RIVER_NAME_COL] !== null
        ? String(row[EXCEL_RIVER_NAME_COL]).trim()
        : undefined;

    const masterRecord: StationMaster = {
      stationId: normalizedId,
      stationName,
      stateName,
      organizationName,
      divisionOffice,
      district,
      riverName,
      rawStationId: rawStationId ? String(rawStationId) : normalizedId,
      excelRowNumber,
    };

    stations.push(masterRecord);

    // Track duplicates
    const tracker = duplicateTracker.get(normalizedId);
    if (!tracker) {
      duplicateTracker.set(normalizedId, {
        rows: [excelRowNumber],
        records: [masterRecord],
      });
      // Set in lookup map (first occurrence)
      lookupMap.set(normalizedId, masterRecord);
    } else {
      tracker.rows.push(excelRowNumber);
      tracker.records.push(masterRecord);
      // NOTE: We do NOT silently overwrite; we keep tracker records documented
    }
  }

  // Build duplicates diagnostic list
  const duplicates: StationMasterDuplicate[] = [];
  for (const [id, data] of duplicateTracker.entries()) {
    if (data.rows.length > 1) {
      duplicates.push({
        stationId: id,
        rows: data.rows,
        records: data.records,
      });
    }
  }

  const loadTimeMs = Math.max(1, Math.round(performance.now() - startTime));

  const summary: StationMasterSummary = {
    workbookName,
    sheetName,
    totalRows: rawRows.length,
    uniqueStationIds: lookupMap.size,
    duplicateCount: duplicates.length,
    duplicates,
    headerColumns: headerRow,
    stationIdColumnName: EXCEL_STATION_ID_COL,
    stationNameColumnName: EXCEL_STATION_NAME_COL,
    loadTimeMs,
  };

  return {
    stations,
    lookupMap,
    summary,
  };
}

/**
 * Reusable O(1) lookup helper to retrieve StationMaster by Station ID.
 * Normalizes input ID before query.
 */
export function getStationById(
  lookupMap: Map<string, StationMaster> | null | undefined,
  stationId: string | null | undefined
): StationMaster | null {
  if (!lookupMap || !stationId) return null;
  const norm = normalizeStationId(stationId);
  return lookupMap.get(norm) || null;
}
