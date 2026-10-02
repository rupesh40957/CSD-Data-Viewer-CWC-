import { AppStore } from '../use-app-store';
import { CSDFile, CSDRecord, RecordStatus, RecordQuality, StationSummary } from '@/types/csd';

const EMPTY_RECORDS: CSDRecord[] = [];
const EMPTY_STATIONS: StationSummary[] = [];

// Internal memoization cache for selectFilteredRecords
let lastFile: CSDFile | null = null;
let lastSelectedStations: string[] = [];
let lastStartDate: number | null = null;
let lastEndDate: number | null = null;
let lastQualityFilter: 'all' | RecordQuality = 'all';
let lastStatusFilter: RecordStatus[] = [];
let lastRecordTypeFilter: string[] = [];
let lastSearchQuery = '';
let cachedFilteredRecords: CSDRecord[] = EMPTY_RECORDS;

/**
 * Highly optimized, referentially stable selector for filtered records.
 * Uses exact reference checking and module-level caching so that React's
 * getServerSnapshot and useSyncExternalStore will never hit infinite loops.
 */
export function selectFilteredRecords(state: AppStore): CSDRecord[] {
  if (!state.file) {
    return EMPTY_RECORDS;
  }

  const {
    file,
    selectedStations,
    dateRange,
    qualityFilter,
    statusFilter,
    recordTypeFilter,
    searchQuery,
  } = state;

  const startMs = dateRange.start ? dateRange.start.getTime() : null;
  const endMs = dateRange.end ? dateRange.end.getTime() : null;

  // Check equality of input criteria
  const stationsUnchanged =
    selectedStations === lastSelectedStations ||
    (selectedStations.length === 0 && lastSelectedStations.length === 0);

  const statusUnchanged =
    statusFilter === lastStatusFilter ||
    (statusFilter.length === lastStatusFilter.length &&
      statusFilter.every((s, i) => s === lastStatusFilter[i]));

  const recordTypeUnchanged =
    recordTypeFilter === lastRecordTypeFilter ||
    (recordTypeFilter.length === 0 && lastRecordTypeFilter.length === 0) ||
    (recordTypeFilter.length === lastRecordTypeFilter.length &&
      recordTypeFilter.every((t, i) => t === lastRecordTypeFilter[i]));

  if (
    file === lastFile &&
    stationsUnchanged &&
    startMs === lastStartDate &&
    endMs === lastEndDate &&
    qualityFilter === lastQualityFilter &&
    statusUnchanged &&
    recordTypeUnchanged &&
    searchQuery === lastSearchQuery
  ) {
    return cachedFilteredRecords;
  }

  // Update cached dependencies
  lastFile = file;
  lastSelectedStations = selectedStations;
  lastStartDate = startMs;
  lastEndDate = endMs;
  lastQualityFilter = qualityFilter;
  lastStatusFilter = statusFilter;
  lastRecordTypeFilter = recordTypeFilter;
  lastSearchQuery = searchQuery;

  const hasStationFilter = selectedStations.length > 0;
  const hasDateStart = startMs !== null;
  const hasDateEnd = endMs !== null;
  const hasQualityFilter = qualityFilter !== 'all';
  const hasStatusFilter = statusFilter.length < 3;
  const hasRecordTypeFilter = recordTypeFilter.length > 0;
  const hasSearch = searchQuery.trim() !== '';

  // Fast path: if no filters active, return existing file.records array directly
  if (
    !hasStationFilter &&
    !hasDateStart &&
    !hasDateEnd &&
    !hasQualityFilter &&
    !hasStatusFilter &&
    !hasRecordTypeFilter &&
    !hasSearch
  ) {
    cachedFilteredRecords = file.records;
    return cachedFilteredRecords;
  }

  const q = searchQuery.toLowerCase().trim();

  cachedFilteredRecords = file.records.filter((r) => {
    // 1. Station filter
    if (hasStationFilter && !selectedStations.includes(r.stationId)) {
      return false;
    }

    // 2. Date range filter
    if (hasDateStart || hasDateEnd) {
      const time = r.timestamp.getTime();
      if (hasDateStart && time < (startMs as number)) return false;
      if (hasDateEnd && time > (endMs as number)) return false;
    }

    // 3. Quality filter
    if (hasQualityFilter && r.quality !== qualityFilter) {
      return false;
    }

    // 4. Status filter
    if (hasStatusFilter && !statusFilter.includes(r.status)) {
      return false;
    }

    // 5. Record type / H filter
    if (hasRecordTypeFilter) {
      const matchesType =
        (r.h && recordTypeFilter.includes(r.h)) ||
        (r.recordType && recordTypeFilter.includes(r.recordType));
      if (!matchesType) return false;
    }

    // 6. Free text search (matches Station Name, Station ID, Timestamp, State, District, River, H-code, Signal, Raw Line)
    if (hasSearch) {
      const match =
        r.stationId.toLowerCase().includes(q) ||
        (r.stationName && r.stationName.toLowerCase().includes(q)) ||
        (r.stationMetadata?.stateName && r.stationMetadata.stateName.toLowerCase().includes(q)) ||
        (r.stationMetadata?.district && r.stationMetadata.district.toLowerCase().includes(q)) ||
        (r.stationMetadata?.riverName && r.stationMetadata.riverName.toLowerCase().includes(q)) ||
        r.timestampRaw.toLowerCase().includes(q) ||
        r.signal.raw.toLowerCase().includes(q) ||
        (r.h && r.h.toLowerCase().includes(q)) ||
        (r.rawLine && r.rawLine.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  return cachedFilteredRecords;
}

// Internal cache for selectPaginatedRecords
let lastPaginatedSource: CSDRecord[] | null = null;
let lastPage = 1;
let lastPageSize = 50;
let cachedPaginatedResult: {
  records: CSDRecord[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
} = {
  records: EMPTY_RECORDS,
  totalCount: 0,
  totalPages: 1,
  currentPage: 1,
  pageSize: 50,
};

/**
 * Memoized selector for table pagination.
 */
export function selectPaginatedRecords(state: AppStore) {
  const filtered = selectFilteredRecords(state);
  const { tablePage, tablePageSize } = state;

  if (
    filtered === lastPaginatedSource &&
    tablePage === lastPage &&
    tablePageSize === lastPageSize
  ) {
    return cachedPaginatedResult;
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / tablePageSize));
  const currentPage = Math.min(Math.max(1, tablePage), totalPages);

  const start = (currentPage - 1) * tablePageSize;
  const pageRecords = filtered.slice(start, start + tablePageSize);

  lastPaginatedSource = filtered;
  lastPage = tablePage;
  lastPageSize = tablePageSize;

  cachedPaginatedResult = {
    records: pageRecords,
    totalCount,
    totalPages,
    currentPage,
    pageSize: tablePageSize,
  };

  return cachedPaginatedResult;
}

/**
 * Memoized selector to find the active selected record by ID.
 */
export function selectSelectedRecord(state: AppStore): CSDRecord | null {
  if (!state.file || !state.selectedRecordId) return null;
  return state.file.records.find((r) => r.id === state.selectedRecordId) || null;
}

/**
 * Memoized selector for the station list.
 */
export function selectStationList(state: AppStore): StationSummary[] {
  return state.file?.stations || EMPTY_STATIONS;
}
