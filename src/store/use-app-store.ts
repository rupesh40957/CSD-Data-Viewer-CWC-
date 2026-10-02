import { create } from 'zustand';
import {
  CSDFile,
  CSDRecord,
  RecordQuality,
  RecordStatus,
  ChartConfig,
  VisualizationType,
  ParseError,
} from '@/types/csd';
import {
  StationMaster,
  StationMasterSummary,
} from '@/types/station-master';
import {
  parseCsdContent,
  decodeCsdBuffer,
  enrichCsdFileWithStations,
} from '@/lib/parser/csd-parser';
import {
  parseStationMasterWorkbook,
} from '@/lib/parser/station-master-parser';
import defaultStationMasterList from '@/data/default-station-master.json';

// Initialize synchronous in-memory Station Master Map with bundled 1,054 stations
const initialStationMasterMap = new Map<string, StationMaster>();
(defaultStationMasterList as unknown as StationMaster[]).forEach((st) => {
  if (st.stationId) {
    initialStationMasterMap.set(st.stationId.trim().toUpperCase(), st);
  }
});

export interface AppStore {
  // 1. File state & parsing telemetry
  file: CSDFile | null;
  isLoading: boolean;
  parseProgress: string;
  parseErrors: ParseError[];
  error: string | null;

  // Station Master Data (Excel)
  stationMasterMap: Map<string, StationMaster>;
  stationMasterList: StationMaster[];
  stationMasterSummary: StationMasterSummary | null;
  isStationMasterLoading: boolean;
  stationMasterError: string | null;

  // Station Information Details Panel & Unmapped Modal
  selectedStationIdForDetails: string | null;
  isStationDetailsOpen: boolean;
  isUnmappedModalOpen: boolean;

  // 2. Selected record
  selectedRecordId: string | null;

  // 3. Sensor selection
  selectedSensors: string[];
  selectedSensorKey: string; // Backward compatibility

  // 4. Date range filter
  dateRange: {
    start: Date | null;
    end: Date | null;
  };

  // 5. Search query & record type filters
  searchQuery: string;
  recordTypeFilter: string[];
  selectedH: string[]; // Backward compatibility

  // 6. Station & status filters
  selectedStations: string[];
  qualityFilter: 'all' | RecordQuality;
  statusFilter: RecordStatus[];

  // 7. Table pagination
  tablePage: number;
  tablePageSize: number;

  // 8. Visualization & Chart configuration
  activeVisualization: VisualizationType;
  chartConfig: ChartConfig;

  // 9. Sensor Metadata Mapping (custom labels & units)
  sensorMetadata: Record<string, { customLabel: string; unit: string }>;

  // 10. Navigation section & Modals
  activeSection: 'overview' | 'records' | 'sensors' | 'charts' | 'quality';
  isSettingsOpen: boolean;
  isImportModalOpen: boolean;

  // 11. UI Theme
  theme: 'dark' | 'light';

  // Actions
  setFile: (file: CSDFile) => void;
  setIsLoading: (loading: boolean, progress?: string) => void;
  setError: (err: string | null) => void;
  clearFile: () => void;

  // Modal actions
  setIsImportModalOpen: (open: boolean) => void;

  // Station Master Actions
  loadStationMaster: (url?: string) => Promise<void>;
  parseStationMasterBuffer: (buffer: ArrayBuffer, filename?: string) => void;
  setSelectedStationIdForDetails: (id: string | null) => void;
  setIsStationDetailsOpen: (open: boolean) => void;
  setIsUnmappedModalOpen: (open: boolean) => void;

  setSelectedRecordId: (id: string | null) => void;

  setSelectedSensors: (sensors: string[]) => void;
  toggleSensor: (sensorKey: string) => void;
  setSelectedSensorKey: (sensor: string) => void;

  updateSensorMetadata: (key: string, meta: { customLabel: string; unit: string }) => void;
  resetSensorMetadata: () => void;

  setActiveSection: (section: 'overview' | 'records' | 'sensors' | 'charts' | 'quality') => void;
  setIsSettingsOpen: (open: boolean) => void;

  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  clearDateRange: () => void;

  setSearchQuery: (query: string) => void;
  setStatusFilter: (statuses: RecordStatus[]) => void;
  toggleStatusFilter: (status: RecordStatus) => void;
  setRecordTypeFilter: (types: string[]) => void;
  toggleRecordTypeFilter: (type: string) => void;
  setQualityFilter: (quality: 'all' | RecordQuality) => void;

  toggleStation: (stationId: string) => void;
  selectStationBatch: (stationIds: string[], select: boolean) => void;
  selectSingleStation: (stationId: string) => void;
  selectAllStations: () => void;
  clearStationSelection: () => void;
  stationViewMode: 'hierarchy' | 'flat';
  setStationViewMode: (mode: 'hierarchy' | 'flat') => void;
  sidebarPosition: 'left' | 'right';
  setSidebarPosition: (position: 'left' | 'right') => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  resetFilters: () => void;

  setTablePage: (page: number) => void;
  setTablePageSize: (size: number) => void;

  setActiveVisualization: (viz: VisualizationType) => void;
  setChartConfig: (config: Partial<ChartConfig>) => void;
  setStationFocus: (stationId: string | 'ALL') => void;
  setTimeWindow: (window: 'all' | '1h' | '6h' | '12h' | '24h') => void;
  setSampleLimit: (limit: number) => void;

  toggleTheme: () => void;

  loadDemoFile: () => Promise<void>;
  parseFileBuffer: (buffer: ArrayBuffer, filename: string, size: number) => void;
}

const DEFAULT_CHART_CONFIG: ChartConfig = {
  activeVisualization: 'line',
  selectedSensors: ['s16'],
  stationFocus: 'ALL',
  timeWindow: 'all',
  sampleLimit: 300,
  aggregationMode: 'sampled',
  showAnomalies: true,
};

export const useAppStore = create<AppStore>((set, get) => ({
  file: null,
  isLoading: false,
  parseProgress: '',
  parseErrors: [],
  error: null,

  // Station Master state (preloaded with 1,054 stations)
  stationMasterMap: initialStationMasterMap,
  stationMasterList: defaultStationMasterList as unknown as StationMaster[],
  stationMasterSummary: {
    workbookName: 'Telemetryu-sites-details-all-station.xlsx',
    sheetName: 'Sheet1',
    totalRows: (defaultStationMasterList as unknown as StationMaster[]).length,
    uniqueStationIds: initialStationMasterMap.size,
    duplicateCount: 0,
    duplicates: [],
    headerColumns: ['S No', 'Station_Name', 'Sation ID', 'State Name', 'Organization Name', 'Division Office', 'District', 'River Name'],
    stationIdColumnName: 'Sation ID',
    stationNameColumnName: 'Station_Name',
    loadTimeMs: 0,
  },
  isStationMasterLoading: false,
  stationMasterError: null,

  selectedStationIdForDetails: null,
  isStationDetailsOpen: false,
  isUnmappedModalOpen: false,

  selectedRecordId: null,

  selectedSensors: ['s16'],
  selectedSensorKey: 's16',

  dateRange: {
    start: null,
    end: null,
  },

  searchQuery: '',
  recordTypeFilter: [],
  selectedH: [],

  selectedStations: [],
  qualityFilter: 'all',
  statusFilter: ['L', 'U', '$'],

  tablePage: 1,
  tablePageSize: 50,

  activeVisualization: 'line',
  chartConfig: DEFAULT_CHART_CONFIG,

  sensorMetadata: {},
  activeSection: 'overview',
  isSettingsOpen: false,
  isImportModalOpen: false,

  theme: 'dark',
  stationViewMode: 'hierarchy',
  sidebarPosition: 'left',
  sidebarWidth: 320,
  isSidebarCollapsed: false,

  setIsImportModalOpen: (isImportModalOpen) => set({ isImportModalOpen }),
  setStationViewMode: (stationViewMode) => set({ stationViewMode }),
  setSidebarPosition: (sidebarPosition) => set({ sidebarPosition }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setIsSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

  loadStationMaster: async (url = '/data/Telemetryu-sites-details-all-station.xlsx') => {
    try {
      set({ isStationMasterLoading: true, stationMasterError: null });
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load station master XLSX (${res.status} ${res.statusText})`);
      }
      const buffer = await res.arrayBuffer();
      get().parseStationMasterBuffer(
        buffer,
        url.split('/').pop() || 'Telemetryu sites details all station.xlsx'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Station master data could not be loaded.';
      set({
        stationMasterError: 'Station master data could not be loaded: ' + msg,
        isStationMasterLoading: false,
      });
    }
  },

  parseStationMasterBuffer: (buffer: ArrayBuffer, filename = 'Telemetryu sites details all station.xlsx') => {
    try {
      set({ isStationMasterLoading: true, stationMasterError: null });
      const { stations, lookupMap, summary } = parseStationMasterWorkbook(buffer, filename);
      set({
        stationMasterMap: lookupMap,
        stationMasterList: stations,
        stationMasterSummary: summary,
        isStationMasterLoading: false,
        stationMasterError: null,
      });

      // If a CSD file is already loaded, re-enrich it immediately
      const currentFile = get().file;
      if (currentFile) {
        const enriched = enrichCsdFileWithStations(currentFile, lookupMap);
        set({ file: enriched });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse station master Excel file';
      set({
        stationMasterError: 'Station master data could not be loaded: ' + msg,
        isStationMasterLoading: false,
      });
    }
  },

  setSelectedStationIdForDetails: (selectedStationIdForDetails) =>
    set({ selectedStationIdForDetails, isStationDetailsOpen: !!selectedStationIdForDetails }),

  setIsStationDetailsOpen: (isStationDetailsOpen) => set({ isStationDetailsOpen }),

  setIsUnmappedModalOpen: (isUnmappedModalOpen) => set({ isUnmappedModalOpen }),

  setFile: (file) =>
    set({
      file,
      isLoading: false,
      parseProgress: '',
      parseErrors: file.errors,
      error: null,
      selectedStations: [],
      selectedRecordId: null,
      tablePage: 1,
      chartConfig: {
        ...DEFAULT_CHART_CONFIG,
        selectedSensors: ['s16'],
      },
    }),

  setIsLoading: (loading, progress = '') =>
    set({ isLoading: loading, parseProgress: progress }),

  setError: (error) => set({ error, isLoading: false, parseProgress: '' }),

  clearFile: () =>
    set({
      file: null,
      selectedStations: [],
      selectedRecordId: null,
      parseErrors: [],
      error: null,
      tablePage: 1,
    }),

  setSelectedRecordId: (selectedRecordId) => set({ selectedRecordId }),

  setSelectedSensors: (selectedSensors) =>
    set((state) => ({
      selectedSensors,
      selectedSensorKey: selectedSensors[0] || 's16',
      chartConfig: {
        ...state.chartConfig,
        selectedSensors,
      },
    })),

  toggleSensor: (sensorKey) =>
    set((state) => {
      const exists = state.selectedSensors.includes(sensorKey);
      let next: string[];
      if (exists) {
        next = state.selectedSensors.filter((s) => s !== sensorKey);
        if (next.length === 0) next = [sensorKey]; // Keep at least one
      } else {
        next = [...state.selectedSensors, sensorKey];
      }
      return {
        selectedSensors: next,
        selectedSensorKey: next[0],
        chartConfig: { ...state.chartConfig, selectedSensors: next },
      };
    }),

  setSelectedSensorKey: (sensor) =>
    set((state) => ({
      selectedSensorKey: sensor,
      selectedSensors: [sensor],
      chartConfig: { ...state.chartConfig, selectedSensors: [sensor] },
    })),

  updateSensorMetadata: (key, meta) =>
    set((state) => ({
      sensorMetadata: {
        ...state.sensorMetadata,
        [key]: meta,
      },
    })),

  resetSensorMetadata: () => set({ sensorMetadata: {} }),

  setActiveSection: (activeSection) => set({ activeSection }),

  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  setDateRange: (dateRange) => set({ dateRange, tablePage: 1 }),

  clearDateRange: () => set({ dateRange: { start: null, end: null }, tablePage: 1 }),

  setSearchQuery: (searchQuery) => set({ searchQuery, tablePage: 1 }),

  setStatusFilter: (statusFilter) => set({ statusFilter, tablePage: 1 }),

  toggleStatusFilter: (status) =>
    set((state) => {
      const exists = state.statusFilter.includes(status);
      const next = exists
        ? state.statusFilter.filter((s) => s !== status)
        : [...state.statusFilter, status];
      return {
        statusFilter: next.length === 0 ? ['L', 'U', '$'] : next,
        tablePage: 1,
      };
    }),

  setRecordTypeFilter: (recordTypeFilter) =>
    set({ recordTypeFilter, selectedH: recordTypeFilter, tablePage: 1 }),

  toggleRecordTypeFilter: (type) =>
    set((state) => {
      const exists = state.recordTypeFilter.includes(type);
      const next = exists
        ? state.recordTypeFilter.filter((t) => t !== type)
        : [...state.recordTypeFilter, type];
      return { recordTypeFilter: next, selectedH: next, tablePage: 1 };
    }),

  setQualityFilter: (qualityFilter) => set({ qualityFilter, tablePage: 1 }),

  toggleStation: (stationId) =>
    set((state) => {
      const exists = state.selectedStations.includes(stationId);
      const next = exists
        ? state.selectedStations.filter((s) => s !== stationId)
        : [...state.selectedStations, stationId];
      return { selectedStations: next, tablePage: 1 };
    }),

  selectStationBatch: (stationIds, select) =>
    set((state) => {
      const allIds = state.file ? state.file.stations.map((s) => s.stationId) : [];
      let currentSet: Set<string>;
      if (state.selectedStations.length === 0) {
        currentSet = new Set(allIds);
      } else {
        currentSet = new Set(state.selectedStations);
      }

      if (select) {
        stationIds.forEach((id) => currentSet.add(id));
      } else {
        stationIds.forEach((id) => currentSet.delete(id));
      }

      const next = Array.from(currentSet);
      return {
        selectedStations: next.length === allIds.length ? [] : next,
        tablePage: 1,
      };
    }),

  selectSingleStation: (stationId) =>
    set((state) => ({
      selectedStations: [stationId],
      chartConfig: { ...state.chartConfig, stationFocus: stationId },
      tablePage: 1,
    })),

  selectAllStations: () =>
    set((state) => ({
      selectedStations: state.file ? state.file.stations.map((s) => s.stationId) : [],
      tablePage: 1,
    })),

  clearStationSelection: () => set({ selectedStations: [], tablePage: 1 }),

  resetFilters: () =>
    set({
      selectedStations: [],
      qualityFilter: 'all',
      statusFilter: ['L', 'U', '$'],
      searchQuery: '',
      recordTypeFilter: [],
      selectedH: [],
      dateRange: { start: null, end: null },
      tablePage: 1,
    }),

  setTablePage: (tablePage) => set({ tablePage }),

  setTablePageSize: (tablePageSize) => set({ tablePageSize, tablePage: 1 }),

  setActiveVisualization: (activeVisualization) =>
    set((state) => ({
      activeVisualization,
      chartConfig: { ...state.chartConfig, activeVisualization },
    })),

  setChartConfig: (partial) =>
    set((state) => {
      const next = { ...state.chartConfig, ...partial };
      return {
        chartConfig: next,
        activeVisualization: next.activeVisualization,
        selectedSensors: next.selectedSensors,
      };
    }),

  setStationFocus: (stationFocus) =>
    set((state) => ({
      chartConfig: { ...state.chartConfig, stationFocus },
    })),

  setTimeWindow: (timeWindow) =>
    set((state) => ({
      chartConfig: { ...state.chartConfig, timeWindow },
    })),

  setSampleLimit: (sampleLimit) =>
    set((state) => ({
      chartConfig: { ...state.chartConfig, sampleLimit },
    })),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem('csd_theme', next);
        } catch {}
      }
      return { theme: next };
    }),

  parseFileBuffer: (buffer: ArrayBuffer, filename: string, size: number) => {
    try {
      set({ isLoading: true, parseProgress: 'Decoding Windows-1252 binary stream...' });
      const decoded = decodeCsdBuffer(buffer);
      set({ parseProgress: 'Parsing 21-field records & sensor telemetry...' });
      const parsed = parseCsdContent(decoded, filename, size, get().stationMasterMap);
      get().setFile(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse .csd file';
      set({ error: msg, isLoading: false, parseProgress: '' });
    }
  },

  loadDemoFile: async () => {
    try {
      set({ isLoading: true, parseProgress: 'Loading telemetry dataset...' });
      const res = await fetch('/demo/20260929.csd');
      if (!res.ok) throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);

      const buffer = await res.arrayBuffer();
      get().parseFileBuffer(buffer, '20260929.csd', buffer.byteLength);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load telemetry dataset';
      set({ error: msg, isLoading: false, parseProgress: '' });
    }
  },
}));

// Re-export all memoized selectors for seamless imports from use-app-store
export * from './selectors';
