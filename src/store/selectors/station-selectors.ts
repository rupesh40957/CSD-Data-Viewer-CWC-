import { AppStore } from '../use-app-store';
import {
  StationMaster,
  UnmappedStationSummary,
  StationMappingMetrics,
} from '@/types/station-master';
import { StationSummary } from '@/types/csd';

const EMPTY_UNMAPPED: UnmappedStationSummary[] = [];

const DEFAULT_METRICS: StationMappingMetrics = {
  totalCsdStations: 0,
  mappedStations: 0,
  unmappedStations: 0,
  mappedPercentage: 0,
  totalCsdRecords: 0,
  mappedRecords: 0,
  unmappedRecords: 0,
  mappedRecordsPercentage: 0,
};

let lastStationsRef: StationSummary[] | null = null;
let lastLookupRef: Map<string, StationMaster> | null = null;
let cachedUnmapped: UnmappedStationSummary[] = EMPTY_UNMAPPED;

let lastMetricsStationsRef: StationSummary[] | null = null;
let lastMetricsLookupRef: Map<string, StationMaster> | null = null;
let cachedMetrics: StationMappingMetrics = DEFAULT_METRICS;

const EMPTY_DETAILS: { summary: StationSummary | null; master: StationMaster | null } = {
  summary: null,
  master: null,
};
let lastDetailsStationId: string | null = null;
let lastDetailsStationsRef: StationSummary[] | null = null;
let lastDetailsMasterMapRef: Map<string, StationMaster> | null = null;
let cachedDetails = EMPTY_DETAILS;

/**
 * Selector that returns all unmapped stations present in the CSD file,
 * sorted descending by record count.
 */
export function selectUnmappedStations(state: AppStore): UnmappedStationSummary[] {
  const file = state.file;
  if (!file || file.stations.length === 0) return EMPTY_UNMAPPED;

  if (file.stations === lastStationsRef && state.stationMasterMap === lastLookupRef) {
    return cachedUnmapped;
  }

  const unmapped: UnmappedStationSummary[] = [];

  for (const st of file.stations) {
    if (!st.stationName && !st.isMapped) {
      unmapped.push({
        stationId: st.stationId,
        recordCount: st.totalRecords,
        firstTimestamp: st.firstSeen,
        lastTimestamp: st.lastSeen,
        activeSensors: st.activeSensors,
      });
    }
  }

  // Sort descending by record count
  unmapped.sort((a, b) => b.recordCount - a.recordCount);

  lastStationsRef = file.stations;
  lastLookupRef = state.stationMasterMap;
  cachedUnmapped = unmapped;

  return cachedUnmapped;
}

/**
 * Selector that computes aggregate mapping metrics across stations and records.
 */
export function selectStationMappingMetrics(state: AppStore): StationMappingMetrics {
  const file = state.file;
  if (!file || file.stations.length === 0) return DEFAULT_METRICS;

  if (file.stations === lastMetricsStationsRef && state.stationMasterMap === lastMetricsLookupRef) {
    return cachedMetrics;
  }

  let mappedStations = 0;
  let unmappedStations = 0;
  let mappedRecords = 0;
  let unmappedRecords = 0;

  for (const st of file.stations) {
    if (st.isMapped || st.stationName) {
      mappedStations++;
      mappedRecords += st.totalRecords;
    } else {
      unmappedStations++;
      unmappedRecords += st.totalRecords;
    }
  }

  const totalCsdStations = file.stations.length;
  const totalCsdRecords = file.records.length;

  const mappedPercentage =
    totalCsdStations > 0 ? Number(((mappedStations / totalCsdStations) * 100).toFixed(1)) : 0;

  const mappedRecordsPercentage =
    totalCsdRecords > 0 ? Number(((mappedRecords / totalCsdRecords) * 100).toFixed(1)) : 0;

  lastMetricsStationsRef = file.stations;
  lastMetricsLookupRef = state.stationMasterMap;
  cachedMetrics = {
    totalCsdStations,
    mappedStations,
    unmappedStations,
    mappedPercentage,
    totalCsdRecords,
    mappedRecords,
    unmappedRecords,
    mappedRecordsPercentage,
  };

  return cachedMetrics;
}

/**
 * Selector to retrieve the StationMaster metadata for the currently inspected station.
 * Strictly memoized with stable references to prevent getServerSnapshot loop.
 */
export function selectSelectedStationDetails(state: AppStore): {
  summary: StationSummary | null;
  master: StationMaster | null;
} {
  const stationId = state.selectedStationIdForDetails;
  if (!stationId || !state.file) {
    return EMPTY_DETAILS;
  }

  if (
    stationId === lastDetailsStationId &&
    state.file.stations === lastDetailsStationsRef &&
    state.stationMasterMap === lastDetailsMasterMapRef
  ) {
    return cachedDetails;
  }

  const normalized = stationId.trim().toUpperCase();
  const summary =
    state.file.stations.find(
      (s) => s.stationId.trim().toUpperCase() === normalized
    ) || null;

  const master = state.stationMasterMap.get(normalized) || null;

  lastDetailsStationId = stationId;
  lastDetailsStationsRef = state.file.stations;
  lastDetailsMasterMapRef = state.stationMasterMap;
  cachedDetails = { summary, master };

  return cachedDetails;
}
