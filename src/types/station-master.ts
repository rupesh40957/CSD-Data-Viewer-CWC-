export interface StationMaster {
  stationId: string;            // Normalized uppercase station ID (e.g. "7D800868")
  stationName: string;          // Human-readable station name (e.g. "Gandhi Sagar Dam")
  stateName?: string;           // State Name from Excel
  organizationName?: string;    // Organization Name from Excel
  divisionOffice?: string;      // Division Office from Excel
  district?: string;            // District from Excel
  riverName?: string;           // River Name from Excel
  rawStationId?: string;        // Original raw string from "Sation ID" column
  excelRowNumber?: number;      // 1-indexed row number in the source Excel file
}

export interface StationMasterDuplicate {
  stationId: string;
  rows: number[];
  records: StationMaster[];
}

export interface StationMasterSummary {
  workbookName: string;
  sheetName: string;
  totalRows: number;
  uniqueStationIds: number;
  duplicateCount: number;
  duplicates: StationMasterDuplicate[];
  headerColumns: string[];
  stationIdColumnName: string;   // e.g. "Sation ID"
  stationNameColumnName: string; // e.g. "Station_Name"
  loadTimeMs: number;
}

export interface UnmappedStationSummary {
  stationId: string;
  recordCount: number;
  firstTimestamp: Date;
  lastTimestamp: Date;
  activeSensors: string[];
}

export interface StationMappingMetrics {
  totalCsdStations: number;
  mappedStations: number;
  unmappedStations: number;
  mappedPercentage: number;
  totalCsdRecords: number;
  mappedRecords: number;
  unmappedRecords: number;
  mappedRecordsPercentage: number;
}
