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
import { InsatSensorConfig, InsatSensorProfile } from '@/lib/insat/types';
import { DEFAULT_INSAT_SENSORS, DEFAULT_INSAT_PROFILE } from '@/lib/insat/default-config';
import defaultStationMasterList from '@/data/default-station-master.json';
import {
  DynamicArchiveCatalog,
  ArchiveFileInfo,
  buildDynamicArchiveCatalog,
  normalizeIsoDate,
} from '@/lib/parser/date-extractor';
import {
  aggregateArchiveFiles,
  computeArchiveSpanSummary,
  mergeParsedCsdFiles,
} from '@/lib/parser/archive-aggregator';
import { workerPool } from '@/lib/parser/worker-pool';
import { selectFilteredRecords } from './selectors/records-selectors';

export interface ArchiveProcessingStatus {
  isProcessing: boolean;
  stage: string;
  processed: number;
  total: number;
  recordsParsed: number;
  failedCount: number;
  percentage: number;
  errors: Array<{ id: string; filename: string; error: string }>;
}

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
  activeMode: 'single' | 'archive';
  archiveMergedFile: CSDFile | null;
  parsedArchiveFileMap: Map<string, CSDFile>;
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

  // 12. INSAT Sensor Configuration & Engineering Values
  insatSensors: InsatSensorConfig[];
  insatMSL: number;
  showEngineeringValues: boolean;
  isInsatConfigOpen: boolean;

  // Actions
  setFile: (file: CSDFile, mode?: 'single' | 'archive') => void;
  selectArchiveAll: () => void;
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

  // INSAT Config Actions
  setInsatSensors: (sensors: InsatSensorConfig[]) => void;
  updateInsatSensor: (index: number, config: InsatSensorConfig) => void;
  toggleInsatSensor: (index: number) => void;
  resetInsatSensors: () => void;
  setInsatMSL: (msl: number) => void;
  setShowEngineeringValues: (show: boolean) => void;
  setIsInsatConfigOpen: (open: boolean) => void;

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

  archiveCatalog: DynamicArchiveCatalog | null;
  selectedArchiveDate: string | null;
  selectedArchiveFileId: string | null;
  activeArchiveRange: { from: string; to: string; count: number } | null;
  archiveDateRange: { from: string; to: string };
  isArchiveModalOpen: boolean;
  archiveProcessingStatus: ArchiveProcessingStatus | null;
  clearArchiveProcessingStatus: () => void;

  loadArchiveFolder: (files: File[], folderName?: string) => Promise<void>;
  selectArchiveDate: (dateKey: string) => void;
  selectArchiveRange: (from: string, to: string) => Promise<void>;
  setArchiveDateRange: (range: { from: string; to: string }) => void;
  loadArchiveFile: (fileInfo: ArchiveFileInfo) => Promise<void>;
  navigateArchiveDate: (direction: 'prev' | 'next') => void;
  setIsArchiveModalOpen: (open: boolean) => void;
  getRecordsForExport: (
    scope: 'all_archive' | 'filtered',
    onProgress?: (pct: number, stage: string) => void
  ) => Promise<{
    records: CSDRecord[];
    sourceFile: CSDFile;
    startDate?: Date | null;
    endDate?: Date | null;
  }>;
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
  activeMode: 'single',
  archiveMergedFile: null,
  parsedArchiveFileMap: new Map(),
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

  // INSAT Sensor Configuration defaults
  insatSensors: DEFAULT_INSAT_SENSORS,
  insatMSL: 0,
  showEngineeringValues: true,
  isInsatConfigOpen: false,
  stationViewMode: 'hierarchy',
  sidebarPosition: 'left',
  sidebarWidth: 320,
  isSidebarCollapsed: false,

  setIsImportModalOpen: (isImportModalOpen) => set({ isImportModalOpen }),

  // INSAT Config Actions
  setInsatSensors: (insatSensors) => set({ insatSensors }),
  updateInsatSensor: (index, config) =>
    set((state) => {
      const next = [...state.insatSensors];
      next[index] = config;
      return { insatSensors: next };
    }),
  toggleInsatSensor: (index) =>
    set((state) => {
      const next = [...state.insatSensors];
      next[index] = { ...next[index], enabled: !next[index].enabled };
      return { insatSensors: next };
    }),
  resetInsatSensors: () => set({ insatSensors: DEFAULT_INSAT_SENSORS, insatMSL: 0 }),
  setInsatMSL: (insatMSL) => set({ insatMSL }),
  setShowEngineeringValues: (showEngineeringValues) => set({ showEngineeringValues }),
  setIsInsatConfigOpen: (isInsatConfigOpen) => set({ isInsatConfigOpen }),
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

  setFile: (file, mode) => {
    const isSingle = mode === 'single' || (!mode && get().activeMode === 'single');
    set({
      file,
      activeMode: isSingle ? 'single' : 'archive',
      archiveCatalog: isSingle ? null : get().archiveCatalog,
      archiveMergedFile: isSingle ? null : get().archiveMergedFile,
      selectedArchiveDate: isSingle ? null : get().selectedArchiveDate,
      selectedArchiveFileId: isSingle ? null : get().selectedArchiveFileId,
      activeArchiveRange: isSingle ? null : get().activeArchiveRange,
      archiveDateRange: isSingle ? { from: '', to: '' } : get().archiveDateRange,
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
    });
  },

  setIsLoading: (loading, progress = '') =>
    set({ isLoading: loading, parseProgress: progress }),

  setError: (error) => set({ error, isLoading: false, parseProgress: '' }),

  clearFile: () => {
    try {
      workerPool.terminate();
    } catch {}
    set({
      file: null,
      activeMode: 'single',
      archiveCatalog: null,
      archiveMergedFile: null,
      parsedArchiveFileMap: new Map(),
      selectedArchiveDate: null,
      selectedArchiveFileId: null,
      activeArchiveRange: null,
      archiveDateRange: { from: '', to: '' },
      archiveProcessingStatus: null,
      selectedStations: [],
      selectedRecordId: null,
      parseErrors: [],
      error: null,
      dateRange: { start: null, end: null },
      tablePage: 1,
    });
  },

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

  parseFileBuffer: async (buffer: ArrayBuffer, filename: string, size: number) => {
    try {
      set({
        isLoading: true,
        parseProgress: 'Parsing CSD telemetry stream in background worker...',
        activeMode: 'single',
        archiveCatalog: null,
        archiveMergedFile: null,
        parsedArchiveFileMap: new Map(),
        selectedArchiveDate: null,
        selectedArchiveFileId: null,
        archiveDateRange: { from: '', to: '' },
        dateRange: { start: null, end: null },
      });

      const parsed = await workerPool.parseSingle(
        buffer,
        filename,
        size,
        get().stationMasterList
      );
      get().setFile(parsed, 'single');
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
      await get().parseFileBuffer(buffer, '20260929.csd', buffer.byteLength);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load telemetry dataset';
      set({ error: msg, isLoading: false, parseProgress: '' });
    }
  },

  // 13. Dynamic Multi-Year Telemetry Archive implementation
  archiveCatalog: null,
  selectedArchiveDate: null,
  selectedArchiveFileId: null,
  activeArchiveRange: null,
  archiveDateRange: { from: '', to: '' },
  isArchiveModalOpen: false,
  archiveProcessingStatus: null,

  clearArchiveProcessingStatus: () => set({ archiveProcessingStatus: null }),
  setIsArchiveModalOpen: (isArchiveModalOpen) => set({ isArchiveModalOpen }),
  setArchiveDateRange: (archiveDateRange) => {
    set({ archiveDateRange });
    if (archiveDateRange.from && archiveDateRange.to) {
      get().selectArchiveRange(archiveDateRange.from, archiveDateRange.to);
    }
  },

  loadArchiveFolder: async (files, folderName = 'Telemetry Archive') => {
    try {
      set({
        isLoading: true,
        parseProgress: 'Indexing multi-year archive catalog...',
        error: null,
      });

      const catalog = buildDynamicArchiveCatalog(files, folderName);
      if (catalog.totalFiles === 0) {
        set({ isLoading: false, parseProgress: '' });
        alert('No .csd or .txt telemetry files found in the chosen folder.');
        return;
      }

      const minDate = catalog.minDate || '';
      const maxDate = catalog.maxDate || '';

      // Default to Full Archive Span (Date 1 to Date Last)
      set({
        activeMode: 'archive',
        archiveCatalog: catalog,
        selectedArchiveDate: null, // "All Dates (Full Archive)" active by default
        selectedArchiveFileId: null,
        activeArchiveRange: null,
        archiveDateRange: {
          from: minDate,
          to: maxDate,
        },
        dateRange: { start: null, end: null },
        isLoading: false,
        parseProgress: '',
      });

      // Default: Load the full archive span so "1 se last tak select rahata hai"
      if (catalog.totalFiles === 1) {
        await get().loadArchiveFile(catalog.files[0]);
      } else {
        await get().selectArchiveAll();
      }
    } catch (err) {
      console.error('Failed to load multi-year archive folder:', err);
      set({
        isLoading: false,
        parseProgress: '',
        error: err instanceof Error ? err.message : 'Failed to load archive folder',
      });
    }
  },

  selectArchiveAll: async () => {
    const catalog = get().archiveCatalog;
    if (!catalog) return;

    if (get().archiveMergedFile) {
      set({
        file: get().archiveMergedFile,
        selectedArchiveDate: null,
        selectedArchiveFileId: null,
        activeArchiveRange: null,
        archiveDateRange: {
          from: catalog.minDate || '',
          to: catalog.maxDate || '',
        },
        dateRange: { start: null, end: null },
        tablePage: 1,
      });
      return;
    }

    try {
      set({
        isLoading: true,
        parseProgress: `Aggregating ${catalog.totalFiles} files across ${catalog.availableYears.length} years...`,
        archiveProcessingStatus: {
          isProcessing: true,
          stage: 'Initializing workers...',
          processed: 0,
          total: catalog.totalFiles,
          recordsParsed: 0,
          failedCount: 0,
          percentage: 0,
          errors: [],
        },
      });

      // Asynchronously aggregate archive files in parallel Web Workers
      const { mergedFile, parsedFileMap, failedFiles } = await aggregateArchiveFiles(
        catalog.files,
        catalog.folderName,
        get().stationMasterMap,
        (progress) => {
          set({
            parseProgress: `Aggregating ${progress.processed} / ${progress.total} files (${progress.currentFilename})...`,
            archiveProcessingStatus: {
              isProcessing: true,
              stage: progress.stage,
              processed: progress.processed,
              total: progress.total,
              recordsParsed: progress.recordsParsed,
              failedCount: progress.failedCount,
              percentage: progress.percentage,
              errors: get().archiveProcessingStatus?.errors || [],
            },
          });
        }
      );

      set({
        file: mergedFile,
        archiveMergedFile: mergedFile,
        parsedArchiveFileMap: parsedFileMap,
        isLoading: false,
        parseProgress: '',
        selectedArchiveDate: null,
        selectedArchiveFileId: null,
        activeArchiveRange: null,
        archiveDateRange: {
          from: catalog.minDate || '',
          to: catalog.maxDate || '',
        },
        tablePage: 1,
        archiveProcessingStatus: {
          isProcessing: false,
          stage: 'Complete',
          processed: catalog.totalFiles,
          total: catalog.totalFiles,
          recordsParsed: mergedFile.records.length,
          failedCount: failedFiles.length,
          percentage: 100,
          errors: failedFiles,
        },
      });
    } catch (err) {
      console.error('Failed to aggregate archive files:', err);
      set({
        isLoading: false,
        parseProgress: '',
        error: err instanceof Error ? err.message : 'Failed to aggregate files',
        archiveProcessingStatus: {
          isProcessing: false,
          stage: 'Failed',
          processed: 0,
          total: catalog.totalFiles,
          recordsParsed: 0,
          failedCount: catalog.totalFiles,
          percentage: 0,
          errors: [{ id: 'error', filename: 'archive', error: err instanceof Error ? err.message : String(err) }],
        },
      });
    }
  },

  selectArchiveRange: async (from: string, to: string) => {
    const catalog = get().archiveCatalog;
    if (!catalog) return;

    const normFrom = normalizeIsoDate(from);
    const normTo = normalizeIsoDate(to);

    const matchingFiles = catalog.files.filter((f) => {
      if (normFrom && f.dateKey < normFrom) return false;
      if (normTo && f.dateKey > normTo) return false;
      return true;
    });

    if (matchingFiles.length === 0) {
      set({
        archiveDateRange: { from: normFrom, to: normTo },
      });
      return;
    }

    if (matchingFiles.length === 1) {
      set({
        archiveDateRange: { from: normFrom, to: normTo },
        activeArchiveRange: null,
      });
      await get().loadArchiveFile(matchingFiles[0]);
      return;
    }

    if (matchingFiles.length === catalog.files.length && get().archiveMergedFile) {
      set({
        file: get().archiveMergedFile,
        selectedArchiveDate: null,
        selectedArchiveFileId: null,
        activeArchiveRange: null,
        archiveDateRange: {
          from: catalog.minDate || '',
          to: catalog.maxDate || '',
        },
        tablePage: 1,
      });
      return;
    }

    try {
      set({
        isLoading: true,
        archiveDateRange: { from: normFrom, to: normTo },
        parseProgress: `Aggregating ${matchingFiles.length} files in date range (${normFrom} to ${normTo})...`,
        archiveProcessingStatus: {
          isProcessing: true,
          stage: `Parsing ${matchingFiles.length} files (${normFrom} to ${normTo})...`,
          processed: 0,
          total: matchingFiles.length,
          recordsParsed: 0,
          failedCount: 0,
          percentage: 0,
          errors: [],
        },
      });

      const { mergedFile, parsedFileMap, failedFiles } = await aggregateArchiveFiles(
        matchingFiles,
        `${catalog.folderName} (${normFrom} to ${normTo})`,
        get().stationMasterMap,
        (progress) => {
          set({
            parseProgress: `Aggregating ${progress.processed} / ${progress.total} files (${progress.currentFilename})...`,
            archiveProcessingStatus: {
              isProcessing: true,
              stage: progress.stage,
              processed: progress.processed,
              total: progress.total,
              recordsParsed: progress.recordsParsed,
              failedCount: progress.failedCount,
              percentage: progress.percentage,
              errors: get().archiveProcessingStatus?.errors || [],
            },
          });
        }
      );

      set({
        file: mergedFile,
        parsedArchiveFileMap: new Map([...get().parsedArchiveFileMap, ...parsedFileMap]),
        isLoading: false,
        parseProgress: '',
        selectedArchiveDate: null,
        selectedArchiveFileId: null,
        activeArchiveRange: {
          from: normFrom,
          to: normTo,
          count: matchingFiles.length,
        },
        archiveDateRange: { from: normFrom, to: normTo },
        tablePage: 1,
        archiveProcessingStatus: {
          isProcessing: false,
          stage: 'Completed',
          processed: matchingFiles.length,
          total: matchingFiles.length,
          recordsParsed: mergedFile.records.length,
          failedCount: failedFiles.length,
          percentage: 100,
          errors: failedFiles,
        },
      });
    } catch (err) {
      console.error('Failed to aggregate date range:', err);
      set({
        isLoading: false,
        parseProgress: '',
        error: err instanceof Error ? err.message : 'Failed to aggregate date range',
        archiveProcessingStatus: null,
      });
    }
  },

  selectArchiveDate: async (dateKey) => {
    const catalog = get().archiveCatalog;
    if (!catalog) return;
    set({ selectedArchiveDate: dateKey, tablePage: 1 });

    const filesOnDate = catalog.dateFileMap[dateKey];
    if (filesOnDate && filesOnDate.length > 0) {
      await get().loadArchiveFile(filesOnDate[0]);
    }
  },

  loadArchiveFile: async (fileInfo) => {
    try {
      set({
        isLoading: true,
        selectedArchiveFileId: fileInfo.id,
        selectedArchiveDate: fileInfo.dateKey,
        parseProgress: `Loading ${fileInfo.name}...`,
      });

      // Check cache first for instant 0ms switching
      const cached = get().parsedArchiveFileMap?.get(fileInfo.id);
      if (cached) {
        set({
          file: cached,
          activeMode: 'archive',
          isLoading: false,
          parseProgress: '',
          selectedArchiveDate: fileInfo.dateKey,
          selectedArchiveFileId: fileInfo.id,
          dateRange: { start: null, end: null },
          tablePage: 1,
        });
        return;
      }

      let buffer: ArrayBuffer;
      if (typeof fileInfo.fileRef.arrayBuffer === 'function') {
        try {
          buffer = await fileInfo.fileRef.arrayBuffer();
        } catch {
          buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
            reader.readAsArrayBuffer(fileInfo.fileRef);
          });
        }
      } else {
        buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
          reader.readAsArrayBuffer(fileInfo.fileRef);
        });
      }

      const parsed = await workerPool.parseSingle(
        buffer,
        fileInfo.name,
        fileInfo.size,
        get().stationMasterList
      );

      // Save in cache
      get().parsedArchiveFileMap?.set(fileInfo.id, parsed);

      set({
        file: parsed,
        activeMode: 'archive',
        isLoading: false,
        parseProgress: '',
        selectedArchiveDate: fileInfo.dateKey,
        selectedArchiveFileId: fileInfo.id,
        activeArchiveRange: null,
        dateRange: { start: null, end: null },
        tablePage: 1,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to parse ${fileInfo.name}`;
      set({ error: msg, isLoading: false, parseProgress: '' });
    }
  },

  navigateArchiveDate: (direction) => {
    const catalog = get().archiveCatalog;
    const current = get().selectedArchiveDate;
    if (!catalog || !catalog.availableDateKeys.length) return;

    const keys = catalog.availableDateKeys;
    const currentIndex = current ? keys.indexOf(current) : -1;
    let nextIndex = 0;

    if (direction === 'prev') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : keys.length - 1;
    } else {
      nextIndex = currentIndex >= 0 && currentIndex < keys.length - 1 ? currentIndex + 1 : 0;
    }

    const nextDate = keys[nextIndex];
    if (nextDate) {
      get().selectArchiveDate(nextDate);
    }
  },

  getRecordsForExport: async (scope, onProgress) => {
    const state = get();
    const catalog = state.archiveCatalog;

    // Case 1: Single file mode or no catalog
    if (state.activeMode === 'single' || !catalog || catalog.totalFiles === 0) {
      if (!state.file) {
        throw new Error('No telemetry data loaded to export.');
      }
      const records = scope === 'all_archive' ? state.file.records : selectFilteredRecords(state);
      return {
        records,
        sourceFile: state.file,
        startDate: state.dateRange.start || state.file.stats.startTime,
        endDate: state.dateRange.end || state.file.stats.endTime,
      };
    }

    // Case 2: Multi-Year Archive Mode - Export All Archive Data
    if (scope === 'all_archive') {
      let merged = state.archiveMergedFile;
      if (!merged) {
        if (onProgress) {
          onProgress(5, `Aggregating all ${catalog.totalFiles} files across ${catalog.availableYears.length} years...`);
        }
        const { mergedFile, parsedFileMap } = await aggregateArchiveFiles(
          catalog.files,
          catalog.folderName,
          state.stationMasterMap,
          (p) => {
            if (onProgress) {
              onProgress(
                Math.round(5 + (p.percentage / 100) * 25),
                `Reading archive ${p.processed}/${p.total}: ${p.currentFilename}`
              );
            }
          }
        );
        merged = mergedFile;
        set({
          archiveMergedFile: mergedFile,
          parsedArchiveFileMap: parsedFileMap,
        });
      }
      return {
        records: merged.records,
        sourceFile: merged,
        startDate: merged.stats.startTime,
        endDate: merged.stats.endTime,
      };
    }

    // Case 3: Multi-Year Archive Mode - Export Current Filtered Data
    const normFrom = normalizeIsoDate(state.archiveDateRange.from || '');
    const normTo = normalizeIsoDate(state.archiveDateRange.to || '');
    const isMultiDateFilter =
      (normFrom && normFrom !== (catalog.minDate || '')) ||
      (normTo && normTo !== (catalog.maxDate || '')) ||
      state.activeArchiveRange !== null;

    // Subcase 3A: Date range filter is active (and not viewing an explicit single day)
    if (isMultiDateFilter && state.selectedArchiveDate === null) {
      const matchingFiles = catalog.files.filter((f) => {
        if (normFrom && f.dateKey < normFrom) return false;
        if (normTo && f.dateKey > normTo) return false;
        return true;
      });

      let targetFile = state.file;
      // If current state.file is not the aggregated range for these matching files, aggregate them
      if (
        !targetFile ||
        targetFile === state.archiveMergedFile ||
        !targetFile.filename.includes(normFrom)
      ) {
        if (onProgress) {
          onProgress(10, `Aggregating ${matchingFiles.length} files in date range (${normFrom} to ${normTo})...`);
        }
        const { mergedFile } = await aggregateArchiveFiles(
          matchingFiles,
          `${catalog.folderName} (${normFrom} to ${normTo})`,
          state.stationMasterMap,
          (p) => {
            if (onProgress) {
              onProgress(
                Math.round(5 + (p.percentage / 100) * 25),
                `Parsing archive ${p.processed}/${p.total}: ${p.currentFilename}`
              );
            }
          }
        );
        targetFile = mergedFile;
      }

      const tempState = { ...state, file: targetFile };
      const filtered = selectFilteredRecords(tempState);
      return {
        records: filtered,
        sourceFile: targetFile,
        startDate: targetFile.stats.startTime,
        endDate: targetFile.stats.endTime,
      };
    }

    // Subcase 3B: Single file is currently active
    if (state.selectedArchiveDate !== null && state.file) {
      const tempState = { ...state, file: state.file };
      const filtered = selectFilteredRecords(tempState);
      return {
        records: filtered,
        sourceFile: state.file,
        startDate: state.dateRange.start || state.file.stats.startTime,
        endDate: state.dateRange.end || state.file.stats.endTime,
      };
    }

    // Subcase 3C: Fallback (All dates filtered by station/time)
    const source = state.archiveMergedFile || state.file;
    if (!source) throw new Error('No telemetry data available for export');
    const tempState = { ...state, file: source };
    const filtered = selectFilteredRecords(tempState);
    return {
      records: filtered,
      sourceFile: source,
      startDate: state.dateRange.start || source.stats.startTime,
      endDate: state.dateRange.end || source.stats.endTime,
    };
  },
}));

// Re-export all memoized selectors for seamless imports from use-app-store
export * from './selectors';
