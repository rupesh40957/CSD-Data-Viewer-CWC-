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
} from '@/lib/parser/date-extractor';

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

  // 12. INSAT Sensor Configuration & Engineering Values
  insatSensors: InsatSensorConfig[];
  insatMSL: number;
  showEngineeringValues: boolean;
  isInsatConfigOpen: boolean;

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
  archiveDateRange: { from: string; to: string };
  isArchiveModalOpen: boolean;

  loadArchiveFolder: (files: File[], folderName?: string) => Promise<void>;
  selectArchiveDate: (dateKey: string) => void;
  setArchiveDateRange: (range: { from: string; to: string }) => void;
  loadArchiveFile: (fileInfo: ArchiveFileInfo) => Promise<void>;
  navigateArchiveDate: (direction: 'prev' | 'next') => void;
  setIsArchiveModalOpen: (open: boolean) => void;
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

  // 13. Dynamic Multi-Year Telemetry Archive implementation
  archiveCatalog: null,
  selectedArchiveDate: null,
  selectedArchiveFileId: null,
  archiveDateRange: { from: '', to: '' },
  isArchiveModalOpen: false,

  setIsArchiveModalOpen: (isArchiveModalOpen) => set({ isArchiveModalOpen }),
  setArchiveDateRange: (archiveDateRange) => set({ archiveDateRange }),

  loadArchiveFolder: async (files, folderName = 'Telemetry Archive') => {
    try {
      const catalog = buildDynamicArchiveCatalog(files, folderName);
      if (catalog.totalFiles === 0) {
        alert('No .csd or .txt telemetry files found in the chosen folder.');
        return;
      }
      const initialDate = catalog.maxDate || catalog.minDate || null;
      set({
        archiveCatalog: catalog,
        selectedArchiveDate: initialDate,
        selectedArchiveFileId: null,
        archiveDateRange: {
          from: catalog.minDate || '',
          to: catalog.maxDate || '',
        },
      });

      // Auto-load first file of latest available date if exists
      if (initialDate && catalog.dateFileMap[initialDate]?.length > 0) {
        const firstFile = catalog.dateFileMap[initialDate][0];
        await get().loadArchiveFile(firstFile);
      }
    } catch (err) {
      console.error('Failed to build dynamic archive catalog:', err);
    }
  },

  selectArchiveDate: (dateKey) => {
    const catalog = get().archiveCatalog;
    if (!catalog) return;
    set({ selectedArchiveDate: dateKey });

    const filesOnDate = catalog.dateFileMap[dateKey];
    if (filesOnDate && filesOnDate.length > 0) {
      get().loadArchiveFile(filesOnDate[0]);
    }
  },

  loadArchiveFile: async (fileInfo) => {
    try {
      set({
        isLoading: true,
        selectedArchiveFileId: fileInfo.id,
        parseProgress: `Loading ${fileInfo.name}...`,
      });

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

      const decoded = decodeCsdBuffer(buffer);
      const parsed = parseCsdContent(decoded, fileInfo.name, fileInfo.size, get().stationMasterMap);

      get().setFile(parsed);
      set({
        selectedArchiveDate: fileInfo.dateKey,
        selectedArchiveFileId: fileInfo.id,
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
}));

// Re-export all memoized selectors for seamless imports from use-app-store
export * from './selectors';
