'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { computeRecordEngineeringValues, getParameterColor } from '@/lib/insat/compute';
import { ExportOptionsModal } from '@/components/export/ExportOptionsModal';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Columns,
  Satellite,
  Zap,
  Grid,
  X,
  AlertTriangle,
  FolderOpen,
  Calendar,
  TableProperties,
  ListFilter,
  Printer,
  Radio,
} from 'lucide-react';
import { RecordDrawer } from './RecordDrawer';
import { buildMatrixReportFromRecords } from '@/lib/export/matrix-builder';
import { MatrixReportModel } from '@/lib/export/types';
import { useVirtualizer } from '@tanstack/react-virtual';

const MatrixTableRow = React.memo(function MatrixTableRow({
  ts,
  rowVals,
  isEven,
  stationGroups,
}: {
  ts: string;
  rowVals: (string | number | null)[];
  isEven: boolean;
  stationGroups: MatrixReportModel['stationGroups'];
}) {
  return (
    <tr
      className={`csd-tr ${isEven ? 'csd-tr-even' : 'csd-tr-odd'}`}
      style={{ height: '30px' }}
    >
      <td
        className="csd-td mono-font"
        style={{
          position: 'sticky',
          left: 0,
          zIndex: 8,
          background: isEven ? 'var(--bg-surface)' : 'var(--bg-subtle)',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.74rem',
          borderRight: '2px solid #64748B',
          whiteSpace: 'nowrap',
        }}
      >
        {ts}
      </td>

      {stationGroups.flatMap((group) =>
        group.sensors.map((sensor, sIdx) => {
          const isLast = sIdx === group.sensors.length - 1;
          const val = rowVals[sensor.colIndex];
          const isNumber = typeof val === 'number';
          const isMissing = val === undefined || val === null || val === '---';
          const isLock = val === 'Lock';
          const isUnlock = val === 'Unlock';

          return (
            <td
              key={`${group.stationId}-${sensor.name}-${sIdx}`}
              className="csd-td mono-font"
              style={{
                textAlign: isNumber ? 'right' : 'center',
                fontSize: '0.74rem',
                fontWeight: isNumber ? 600 : 400,
                color: isMissing
                  ? 'var(--text-dim)'
                  : isNumber
                  ? 'var(--text-main)'
                  : isLock
                  ? '#10b981'
                  : isUnlock
                  ? '#f59e0b'
                  : 'var(--text-main)',
                borderRight: isLast ? '2px solid #64748B' : '1px solid var(--border)',
                padding: '4px 8px',
              }}
            >
              {isMissing ? (
                '---'
              ) : isNumber ? (
                Number.isInteger(val) ? val : (val as number).toFixed(sensor.resolution ?? 1)
              ) : isLock ? (
                <span className="badge badge-locked" style={{ fontSize: '0.65rem' }}>Lock</span>
              ) : isUnlock ? (
                <span className="badge badge-unlocked" style={{ fontSize: '0.65rem' }}>Unlock</span>
              ) : (
                String(val)
              )}
            </td>
          );
        })
      )}
    </tr>
  );
});

const RecordTableRow = React.memo(function RecordTableRow({
  record: r,
  isEven,
  isSelected,
  onSelect,
  stationMasterMap,
  showEngineeringValues,
  enabledInsatSensors,
  insatMSL,
  showConfigCols,
}: {
  record: any;
  isEven: boolean;
  isSelected: boolean;
  onSelect: () => void;
  stationMasterMap: Map<string, any>;
  showEngineeringValues: boolean;
  enabledInsatSensors: any[];
  insatMSL: number;
  showConfigCols: boolean;
}) {
  const isBad = r.quality === 'Bad';
  const masterInfo =
    r.stationMetadata || stationMasterMap.get(r.stationId?.trim().toUpperCase());
  const stationName = r.stationName || masterInfo?.stationName || null;

  return (
    <tr
      onClick={onSelect}
      className={`csd-tr ${isEven ? 'csd-tr-even' : 'csd-tr-odd'} ${isSelected ? 'selected' : ''} ${isBad ? 'bad-row' : ''}`}
      style={{
        borderLeft: isSelected ? '4px solid var(--primary-light)' : '4px solid transparent',
      }}
    >
      {/* Line Number */}
      <td className="csd-td" style={{ textAlign: 'center' }}>
        <span className="csd-line-badge">#{r.lineNumber}</span>
      </td>

      {/* Station Name */}
      <td className="csd-td">
        {stationName ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.81rem' }}>
              {stationName}
            </span>
            {masterInfo?.stateName && (
              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                {masterInfo.district ? `${masterInfo.district}, ` : ''}{masterInfo.stateName}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Unknown Station
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'rgba(234, 179, 8, 0.15)',
                color: 'var(--quality-corrupt)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                fontWeight: 600,
              }}
            >
              Unmapped
            </span>
          </div>
        )}
      </td>

      {/* Station ID */}
      <td className="csd-td" style={{ textAlign: 'center' }}>
        <span
          className="mono-font"
          style={{
            fontWeight: 700,
            fontSize: '0.78rem',
            color: isBad ? 'var(--quality-bad)' : 'var(--primary-light)',
            background: isBad ? 'rgba(239, 68, 68, 0.08)' : 'rgba(56, 189, 248, 0.08)',
            padding: '2px 7px',
            borderRadius: '4px',
            border: isBad ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
            display: 'inline-block',
            letterSpacing: '0.04em',
          }}
        >
          {r.stationId}
        </span>
      </td>

      {/* Timestamp IST */}
      <td className="csd-td">
        <span
          className="mono-font"
          style={{
            color: 'var(--text-main)',
            fontSize: '0.74rem',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
          }}
        >
          {formatCsdTimestamp(r.timestamp, true)}
        </span>
      </td>

      {/* Time Offset */}
      <td className="csd-td" style={{ textAlign: 'center' }}>
        <span
          className="mono-font"
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.73rem',
          }}
        >
          {r.timeOffset}
        </span>
      </td>

      {/* Status Mode */}
      <td className="csd-td" style={{ textAlign: 'center' }}>
        {r.status === 'L' && <span className="badge badge-locked">L</span>}
        {r.status === 'U' && <span className="badge badge-unlocked">U</span>}
        {r.status === '$' && <span className="badge badge-corrupt">$</span>}
      </td>

      {/* Quality */}
      <td className="csd-td" style={{ textAlign: 'center' }}>
        {r.quality === 'Good' ? (
          <span className="badge badge-good">Good</span>
        ) : (
          <span className="badge badge-bad" title={r.errors?.join('; ') || ''}>
            Bad
          </span>
        )}
      </td>

      {/* INSAT Engineering Value Cells */}
      {showEngineeringValues && (() => {
        const engValues = computeRecordEngineeringValues(enabledInsatSensors, r, insatMSL);
        return enabledInsatSensors.map((sensor) => {
          const ev = engValues[sensor.sensorName];
          if (!ev) return (
            <td
              key={sensor.sensorName}
              className="csd-td csd-td-eng"
              style={{
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
              }}
            >
              —
            </td>
          );
          return (
            <td
              key={sensor.sensorName}
              className="csd-td csd-td-eng"
              style={{
                textAlign: 'right',
                fontFamily: 'var(--font-mono)',
                fontWeight: ev.isValid ? 700 : 400,
                fontSize: '0.78rem',
                color: getParameterColor(sensor.sensorName, ev.value),
              }}
              title={
                ev.isValid
                  ? `Raw: ${ev.rawInputs?.join(', ') || ''} | Eq: ${sensor.equationDisplay}`
                  : 'Missing or corrupt input'
              }
            >
              {ev.displayValue}
            </td>
          );
        });
      })()}

      {/* Config c1, c2, c3, H */}
      {showConfigCols && (
        <>
          <td
            className="csd-td"
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              color: r.c1 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
              fontSize: '0.73rem',
            }}
          >
            {r.c1 === null ? '$$' : r.c1}
          </td>
          <td
            className="csd-td"
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              color: r.c2 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
              fontSize: '0.73rem',
            }}
          >
            {r.c2 === null ? '$$' : r.c2}
          </td>
          <td
            className="csd-td"
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              color: r.c3 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
              fontSize: '0.73rem',
            }}
          >
            {r.c3 === null ? '$$' : r.c3}
          </td>
          <td
            className="csd-td"
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: r.h ? 'var(--text-main)' : 'var(--quality-bad)',
              fontSize: '0.73rem',
            }}
          >
            {r.h ? `H:${r.h}` : 'H:$$'}
          </td>
        </>
      )}

      {/* s16 Composite float */}
      <td className="csd-td" style={{ textAlign: 'right' }}>
        <span
          className="mono-font"
          style={{
            fontWeight: 700,
            fontSize: '0.75rem',
            color:
              r.s16 === null
                ? 'var(--quality-bad)'
                : r.s16 > 0
                ? 'var(--primary-light)'
                : 'var(--text-muted)',
          }}
        >
          {r.s16 === null ? '$$' : r.s16.toFixed(3)}
        </span>
      </td>

      {/* s17 */}
      <td
        className="csd-td"
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          color: r.s17 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
          fontSize: '0.73rem',
        }}
      >
        {r.s17 === null ? '$$' : r.s17}
      </td>

      {/* Sensor Array / Active Telemetry */}
      <td className="csd-td">
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '340px' }}>
          {r.sensors?.map((s: any, sIdx: number) => {
            const isDollar = s.value === null;
            return (
              <span
                key={sIdx}
                style={{
                  fontSize: '0.67rem',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: isDollar
                    ? 'var(--quality-bad-bg)'
                    : 'rgba(148, 163, 184, 0.08)',
                  border: isDollar
                    ? '1px solid rgba(239, 68, 68, 0.35)'
                    : '1px solid var(--table-border-subtle)',
                  color: isDollar ? 'var(--quality-bad)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s.key}:{isDollar ? '$$' : s.value}
              </span>
            );
          })}
        </div>
      </td>

      {/* Signal Code */}
      <td className="csd-td" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
        <span
          className="mono-font"
          style={{
            fontSize: '0.72rem',
            color: r.signal?.signalType === 'NN' ? 'var(--quality-bad)' : 'var(--text-dim)',
            background: 'rgba(148, 163, 184, 0.06)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid var(--table-border-subtle)',
            display: 'inline-block',
          }}
        >
          {r.signal?.raw}
        </span>
      </td>
    </tr>
  );
});

export function DataTable() {
  const {
    file,
    archiveCatalog,
    loadArchiveFolder,
    setIsArchiveModalOpen,
    setIsImportModalOpen,
    searchQuery,
    setSearchQuery,
    selectedStations,
    dateRange,
    clearStationSelection,
    selectedRecordId,
    setSelectedRecordId,
    tablePage,
    setTablePage,
    tablePageSize,
    setTablePageSize,
    stationMasterMap,
    insatSensors,
    insatMSL,
    showEngineeringValues,
    setShowEngineeringValues,
    setIsInsatConfigOpen,
    qualityFilter,
    setQualityFilter,
  } = useAppStore();
  const records = useAppStore(selectFilteredRecords);

  const [showConfigCols, setShowConfigCols] = useState(true);
  const tableFolderInputRef = useRef<HTMLInputElement>(null);
  const [showAllSensors, setShowAllSensors] = useState(false);
  const [highContrastGrid, setHighContrastGrid] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');

  // View Mode: 'matrix' (Data Report) vs 'records' (Log Records)
  const [viewMode, setViewMode] = useState<'matrix' | 'records'>('matrix');
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixPageSize, setMatrixPageSize] = useState(50);

  // Discover unique stations available in current records/dataset
  const allAvailableStations = useMemo(() => {
    if (!file) return [];
    if (file.stations && file.stations.length > 0) {
      return file.stations.map((s) => ({
        stationId: s.stationId,
        stationName: s.stationName || s.stationId,
      }));
    }
    const map = new Map<string, string>();
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const id = (r.stationId || '').trim().toUpperCase();
      if (!map.has(id)) {
        map.set(id, r.stationName || id);
      }
    }
    return Array.from(map.entries()).map(([stationId, stationName]) => ({
      stationId,
      stationName,
    }));
  }, [file, records]);

  // Filter stations based on selectedStations and search query
  const filteredStations = useMemo(() => {
    let list = allAvailableStations;
    if (selectedStations.length > 0) {
      const selectedSet = new Set(selectedStations.map((s) => s.toUpperCase()));
      list = list.filter((s) => selectedSet.has(s.stationId.toUpperCase()));
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (s) =>
          s.stationId.toLowerCase().includes(q) ||
          (s.stationName && s.stationName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allAvailableStations, selectedStations, searchQuery]);

  // Station Pagination State for Matrix View (prevents 5,467-column browser crash)
  const [matrixStationPage, setMatrixStationPage] = useState(1);
  const [matrixStationsPerPage, setMatrixStationsPerPage] = useState(20);

  // Reset station page to 1 when search or station filter changes
  useEffect(() => {
    setMatrixStationPage(1);
  }, [searchQuery, selectedStations]);

  const totalStationCount = filteredStations.length;
  const totalStationPages = Math.ceil(totalStationCount / matrixStationsPerPage) || 1;
  const currentStationPage = Math.min(Math.max(1, matrixStationPage), totalStationPages);

  const visibleStations = useMemo(() => {
    if (matrixStationsPerPage <= 0 || matrixStationsPerPage >= totalStationCount) {
      return filteredStations;
    }
    const start = (currentStationPage - 1) * matrixStationsPerPage;
    return filteredStations.slice(start, start + matrixStationsPerPage);
  }, [filteredStations, currentStationPage, matrixStationsPerPage, totalStationCount]);

  const visibleStationIds = useMemo(() => {
    return visibleStations.map((s) => s.stationId);
  }, [visibleStations]);

  const matrixModel: MatrixReportModel | null = useMemo(() => {
    if (!file || viewMode !== 'matrix' || visibleStationIds.length === 0) return null;
    return buildMatrixReportFromRecords(
      records,
      insatSensors,
      insatMSL,
      visibleStationIds,
      dateRange?.start,
      dateRange?.end
    );
  }, [file, viewMode, records, insatSensors, insatMSL, visibleStationIds, dateRange]);

  const paginatedTimestamps = useMemo(() => {
    if (!matrixModel) return [];
    const start = (matrixPage - 1) * matrixPageSize;
    return matrixModel.timestamps.slice(start, start + matrixPageSize);
  }, [matrixModel, matrixPage, matrixPageSize]);

  const totalMatrixPages = matrixModel ? Math.ceil(matrixModel.timestamps.length / matrixPageSize) || 1 : 1;

  // Get enabled INSAT sensors for header columns
  const enabledInsatSensors = useMemo(
    () => insatSensors.filter((s) => s.enabled),
    [insatSensors]
  );

  // Pagination calculation
  const totalPages = Math.ceil(records.length / tablePageSize) || 1;
  const currentPage = Math.min(Math.max(1, tablePage), totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * tablePageSize;
    return records.slice(start, start + tablePageSize);
  }, [records, currentPage, tablePageSize]);

  // Dynamic total column count for empty state
  const totalColumnCount = useMemo(() => {
    let count = 7; // Line, Station Name, Station ID, Timestamp, Offset, Status, Quality
    if (showEngineeringValues) count += enabledInsatSensors.length;
    if (showConfigCols) count += 4; // c1, c2, c3, H
    count += 4; // s16, s17, sensors, signal
    return count;
  }, [showEngineeringValues, enabledInsatSensors.length, showConfigCols]);

  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const matrixRowVirtualizer = useVirtualizer({
    count: paginatedTimestamps.length,
    getScrollElement: () => matrixScrollRef.current,
    estimateSize: () => 30,
    overscan: 10,
  });

  const recordsScrollRef = useRef<HTMLDivElement>(null);
  const recordRowVirtualizer = useVirtualizer({
    count: paginatedRecords.length,
    getScrollElement: () => recordsScrollRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  if (!file) {
    if (archiveCatalog && archiveCatalog.totalFiles > 0) {
      return (
        <div
          className="glass-panel"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            border: '1px dashed var(--border-focus)',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(56, 189, 248, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <Calendar size={26} color="var(--primary-light)" />
          </div>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: 700 }}>
            Archive Loaded: {archiveCatalog.folderName}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '520px' }}>
            Found {archiveCatalog.totalFiles} files across {archiveCatalog.availableYears.length} dynamic years ({archiveCatalog.availableYears.join(', ')}).
            Choose a date above or open the calendar explorer to render records in this Data Table.
          </p>
          <button
            onClick={() => setIsArchiveModalOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.82rem', marginTop: '6px' }}
          >
            <Calendar size={15} />
            <span>Open Multi-Year Calendar Explorer</span>
          </button>
        </div>
      );
    }

    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <input
          type="file"
          ref={tableFolderInputRef}
          // @ts-expect-error webkitdirectory
          webkitdirectory="true"
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const firstRel = files[0]?.webkitRelativePath || '';
            const folderName = firstRel.split('/')[0] || 'CSD Multi-Year Archive';
            await loadArchiveFolder(Array.from(files), folderName);
            setIsArchiveModalOpen(true);
          }}
        />
        <h3 style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>No Data Loaded</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 16px' }}>
          Upload a single .csd telemetry file or select a multi-year folder archive to view tabular records.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-primary"
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
          >
            Load .CSD File
          </button>
          <button
            onClick={() => {
              if (archiveCatalog && archiveCatalog.totalFiles > 0) {
                setIsArchiveModalOpen(true);
              } else {
                tableFolderInputRef.current?.click();
              }
            }}
            className="btn-secondary"
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
          >
            <FolderOpen size={14} color="var(--primary-light)" />
            <span>{archiveCatalog && archiveCatalog.totalFiles > 0 ? 'Calendar Explorer' : 'Choose Archive Folder'}</span>
          </button>
        </div>
      </div>
    );
  }

  const handleExportExcel = () => {
    setExportFormat('excel');
    setExportModalOpen(true);
  };

  const handleExportCsv = () => {
    setExportFormat('csv');
    setExportModalOpen(true);
  };

  const handleExportPdf = () => {
    setExportFormat('pdf');
    setExportModalOpen(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
      }}
    >
      {/* View Switcher: Data Report (CWC Matrix) vs Log Records (Raw Stream) */}
      <div
        className="glass-panel"
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setViewMode('matrix')}
            className={viewMode === 'matrix' ? 'btn-primary' : 'btn-secondary'}
            style={{
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              borderRadius: 'var(--radius-md)',
              background: viewMode === 'matrix' ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
              borderColor: viewMode === 'matrix' ? '#10b981' : undefined,
            }}
          >
            <TableProperties size={15} />
            <span>Data Report (CWC Matrix)</span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '2px 7px',
                borderRadius: '10px',
                background: viewMode === 'matrix' ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                color: viewMode === 'matrix' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {totalStationCount > 0 ? `${totalStationCount} Stations` : 'Matrix'}
            </span>
          </button>

          <button
            onClick={() => setViewMode('records')}
            className={viewMode === 'records' ? 'btn-primary' : 'btn-secondary'}
            style={{
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              borderRadius: 'var(--radius-md)',
              background: viewMode === 'records' ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : undefined,
              borderColor: viewMode === 'records' ? '#0ea5e9' : undefined,
            }}
          >
            <ListFilter size={15} />
            <span>Log Records (Telemetry Stream)</span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '2px 7px',
                borderRadius: '10px',
                background: viewMode === 'records' ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                color: viewMode === 'records' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {records.length.toLocaleString()}
            </span>
          </button>
        </div>

        {/* Dynamic Period Information Tag */}
        {matrixModel && (
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} color="var(--primary-light)" />
            <strong style={{ color: 'var(--text-main)' }}>{matrixModel.periodText}</strong>
          </div>
        )}
      </div>

      {/* Table Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Quick Search, Quality Filter & Active Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search
              size={15}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search station, time, signal, H code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setTablePage(1);
              }}
              className="text-input mono-font"
              style={{ width: '100%', paddingLeft: '32px', paddingRight: searchQuery ? '28px' : '10px', height: '36px' }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTablePage(1);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Quality Filter Segmented Buttons */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '2px',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => {
                setQualityFilter('all');
                setTablePage(1);
              }}
              style={{
                padding: '5px 11px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: qualityFilter === 'all' ? 'var(--primary)' : 'transparent',
                color: qualityFilter === 'all' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              All
            </button>
            <button
              onClick={() => {
                setQualityFilter('Good');
                setTablePage(1);
              }}
              style={{
                padding: '5px 11px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: qualityFilter === 'Good' ? 'var(--quality-good)' : 'transparent',
                color: qualityFilter === 'Good' ? '#ffffff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: qualityFilter === 'Good' ? '#ffffff' : 'var(--quality-good)',
                }}
              />
              Good
            </button>
            <button
              onClick={() => {
                setQualityFilter('Bad');
                setTablePage(1);
              }}
              style={{
                padding: '5px 11px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: qualityFilter === 'Bad' ? 'var(--quality-bad)' : 'transparent',
                color: qualityFilter === 'Bad' ? '#ffffff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: qualityFilter === 'Bad' ? '#ffffff' : 'var(--quality-bad)',
                }}
              />
              Bad
            </button>
          </div>

          {/* Active Station Selection Filter Tag */}
          {selectedStations.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.76rem',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--primary-light)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
              }}
            >
              <span>Filtering {selectedStations.length} station(s)</span>
              <button
                onClick={clearStationSelection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
                title="Clear station filter"
              >
                Ã—
              </button>
            </div>
          )}
        </div>

        {/* Right: Column Toggles, Border Mode, Page Size & Exports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Grid Border Style Toggle */}
          <button
            onClick={() => setHighContrastGrid(!highContrastGrid)}
            className="btn-secondary"
            style={{
              padding: '6px 11px',
              fontSize: '0.75rem',
              background: highContrastGrid ? 'rgba(56, 189, 248, 0.14)' : 'var(--bg-surface)',
              border: highContrastGrid
                ? '1px solid var(--primary-light)'
                : '1px solid var(--border)',
              color: highContrastGrid ? 'var(--primary-light)' : 'var(--text-main)',
            }}
            title="Toggle high-contrast grid lines"
          >
            <Grid size={13} />
            <span>Grid: {highContrastGrid ? 'High-Contrast' : 'Standard'}</span>
          </button>

          <button
            onClick={() => setShowConfigCols(!showConfigCols)}
            className="btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              background: showConfigCols ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
            }}
            title="Toggle c1, c2, c3, H columns"
          >
            <Columns size={13} />
            <span>Config ({showConfigCols ? 'ON' : 'OFF'})</span>
          </button>

          <button
            onClick={() => setShowAllSensors(!showAllSensors)}
            className="btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              background: showAllSensors ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
            }}
            title="Toggle expanded raw sensor array"
          >
            <span>Sensors ({showAllSensors ? 'Full' : 'Compact'})</span>
          </button>

          <button
            onClick={() => setShowEngineeringValues(!showEngineeringValues)}
            className="btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              background: showEngineeringValues ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
              border: showEngineeringValues
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid var(--border)',
              color: showEngineeringValues ? '#10b981' : 'var(--text-muted)',
            }}
            title="Toggle INSAT engineering value columns"
          >
            <Zap size={13} />
            <span>Eng. Values</span>
          </button>

          <button
            onClick={() => setIsInsatConfigOpen(true)}
            className="btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
            }}
            title="Configure INSAT sensor equations"
          >
            <Satellite size={13} />
            <span>INSAT Config</span>
          </button>

          <select
            value={tablePageSize}
            onChange={(e) => {
              setTablePageSize(Number(e.target.value));
            }}
            className="text-input"
            style={{ padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer', height: '34px' }}
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={250}>250 rows</option>
            <option value={records.length}>All ({records.length})</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="btn-secondary"
            title="Download Excel (.xlsx)"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Download size={13} color="#10b981" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="btn-secondary"
            title="Download CSV (.csv)"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Download size={13} color="#38bdf8" />
            <span>CSV (.csv)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="btn-secondary"
            title="Export / Print PDF (.pdf)"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Printer size={13} color="#ef4444" />
            <span>PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Data Report (CWC Multi-Station Matrix View) */}
      {viewMode === 'matrix' && matrixModel && (
        <div className="csd-table-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* CWC Official Report Title Banner */}
          <div
            style={{
              background: '#FFFFFF',
              color: '#000000',
              padding: '12px 18px',
              borderBottom: '2px solid #000000',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#000000', letterSpacing: '-0.01em' }}>
              Telemetry Data Received at Central Receiving Station during
            </div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#002060', marginTop: '2px' }}>
              {matrixModel.periodText}
            </div>
          </div>

          {/* Station Windowing / Horizontal Pagination Toolbar */}
          {totalStationCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Viewing Stations{' '}
                  <strong style={{ color: 'var(--text-main)' }}>
                    {(currentStationPage - 1) * matrixStationsPerPage + 1}–
                    {Math.min(currentStationPage * matrixStationsPerPage, totalStationCount)}
                  </strong>{' '}
                  of <strong style={{ color: 'var(--primary-light)' }}>{totalStationCount}</strong>
                </span>
                {totalStationPages > 1 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: 'var(--primary-light)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 600,
                    }}
                  >
                    Station Set {currentStationPage} of {totalStationPages}
                  </span>
                )}
                {searchQuery.trim() && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(234, 179, 8, 0.15)',
                      color: '#eab308',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 600,
                    }}
                  >
                    Filter: &quot;{searchQuery}&quot;
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {totalStationPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setMatrixStationPage((p) => Math.max(1, p - 1))}
                      disabled={currentStationPage <= 1}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                      title="Previous Stations"
                    >
                      <ChevronLeft size={13} />
                      <span>Prev Stations</span>
                    </button>
                    <span style={{ fontSize: '0.74rem', padding: '0 4px', color: 'var(--text-muted)' }}>
                      Set {currentStationPage}/{totalStationPages}
                    </span>
                    <button
                      onClick={() => setMatrixStationPage((p) => Math.min(totalStationPages, p + 1))}
                      disabled={currentStationPage >= totalStationPages}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                      title="Next Stations"
                    >
                      <span>Next Stations</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>View:</span>
                  <select
                    value={matrixStationsPerPage}
                    onChange={(e) => {
                      setMatrixStationsPerPage(Number(e.target.value));
                      setMatrixStationPage(1);
                    }}
                    className="csd-select"
                    style={{ padding: '3px 6px', fontSize: '0.74rem' }}
                  >
                    <option value={10}>10 Stations</option>
                    <option value={20}>20 Stations</option>
                    <option value={30}>30 Stations</option>
                    <option value={50}>50 Stations</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Matrix Scrollable Grid */}
          <div ref={matrixScrollRef} className="csd-table-scroll-container" style={{ maxHeight: '72vh', overflow: 'auto' }}>
            <table className={`csd-grid-table ${highContrastGrid ? 'high-contrast' : ''}`} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                {/* Header Row 1: Station Names (Merged) */}
                <tr style={{ position: 'sticky', top: 0, zIndex: 12 }}>
                  <th
                    rowSpan={2}
                    className="csd-th"
                    style={{
                      position: 'sticky',
                      left: 0,
                      top: 0,
                      zIndex: 20,
                      minWidth: '180px',
                      background: 'var(--bg-surface)',
                      textAlign: 'center',
                      borderRight: '2px solid #64748B',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {matrixModel.dateColumnHeader}
                  </th>
                  {matrixModel.stationGroups.map((group) => (
                    <th
                      key={group.stationId}
                      colSpan={group.colSpan}
                      className="csd-th"
                      style={{
                        textAlign: 'center',
                        background: '#1E3A5F',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        borderRight: '2px solid #64748B',
                        borderBottom: '1px solid #334155',
                        padding: '8px 10px',
                      }}
                      title={`Station ID: ${group.stationId} | WIMS Code: ${group.wimsCode || 'N/A'}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span>{group.stationName}</span>
                        <span style={{ fontSize: '0.66rem', color: '#93c5fd', fontWeight: 500 }}>
                          ID: {group.stationId}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>

                {/* Header Row 2: Sensor Parameter Names & Units */}
                <tr style={{ position: 'sticky', top: '44px', zIndex: 11 }}>
                  {matrixModel.stationGroups.flatMap((group) =>
                    group.sensors.map((sensor, sIdx) => {
                      const isLast = sIdx === group.sensors.length - 1;
                      return (
                        <th
                          key={`${group.stationId}-${sensor.name}-${sIdx}`}
                          className="csd-th"
                          style={{
                            textAlign: sensor.name.includes('GPS') || sensor.name.includes('Reporting') ? 'center' : 'right',
                            minWidth: sensor.name.includes('Reporting') ? '170px' : '95px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-main)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            borderRight: isLast ? '2px solid #64748B' : '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                            padding: '6px 8px',
                          }}
                        >
                          <div>{sensor.name}</div>
                          {sensor.unit && (
                            <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              ({sensor.unit})
                            </div>
                          )}
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {matrixRowVirtualizer.getVirtualItems().length > 0 &&
                  matrixRowVirtualizer.getVirtualItems()[0].start > 0 && (
                    <tr>
                      <td
                        colSpan={matrixModel.totalColumns}
                        style={{
                          height: `${matrixRowVirtualizer.getVirtualItems()[0].start}px`,
                          padding: 0,
                          border: 0,
                        }}
                      />
                    </tr>
                  )}
                {matrixRowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const ts = paginatedTimestamps[virtualRow.index];
                  const rowVals = matrixModel.grid.get(ts) || [ts];
                  const isEven = virtualRow.index % 2 === 0;
                  return (
                    <MatrixTableRow
                      key={ts}
                      ts={ts}
                      rowVals={rowVals}
                      isEven={isEven}
                      stationGroups={matrixModel.stationGroups}
                    />
                  );
                })}
                {matrixRowVirtualizer.getVirtualItems().length > 0 && (
                  <tr>
                    <td
                      colSpan={matrixModel.totalColumns}
                      style={{
                        height: `${
                          matrixRowVirtualizer.getTotalSize() -
                          matrixRowVirtualizer.getVirtualItems()[
                            matrixRowVirtualizer.getVirtualItems().length - 1
                          ].end
                        }px`,
                        padding: 0,
                        border: 0,
                      }}
                    />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Matrix Pagination Bar */}
          <div
            style={{
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              Showing intervals {(matrixPage - 1) * matrixPageSize + 1} to{' '}
              {Math.min(matrixPage * matrixPageSize, matrixModel.timestamps.length)} of{' '}
              {matrixModel.timestamps.length} hourly readings across {matrixModel.stationGroups.length} stations ({totalStationCount} total in archive)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                disabled={matrixPage <= 1}
                className="btn-secondary"
                style={{ padding: '4px 8px' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span>
                Page {matrixPage} of {totalMatrixPages}
              </span>
              <button
                onClick={() => setMatrixPage((p) => Math.min(totalMatrixPages, p + 1))}
                disabled={matrixPage >= totalMatrixPages}
                className="btn-secondary"
                style={{ padding: '4px 8px' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Records (Granular Line-by-Line Frame Stream) */}
      {viewMode === 'records' && (
      <div className="csd-table-card">
        {/* Scrollable Grid Container */}
        <div ref={recordsScrollRef} className="csd-table-scroll-container">
          <table className={`csd-grid-table ${highContrastGrid ? 'high-contrast' : ''}`}>
            <thead>
              <tr>
                <th className="csd-th" style={{ width: '58px', textAlign: 'center' }}>
                  Line
                </th>
                <th className="csd-th" style={{ minWidth: '175px' }}>
                  Station Name
                </th>
                <th className="csd-th" style={{ width: '100px', textAlign: 'center' }}>
                  Station ID
                </th>
                <th className="csd-th" style={{ minWidth: '170px' }}>
                  Date & Time (IST)
                </th>
                <th className="csd-th" style={{ width: '68px', textAlign: 'center' }}>
                  Offset
                </th>
                <th className="csd-th" style={{ width: '65px', textAlign: 'center' }}>
                  Status
                </th>
                <th className="csd-th" style={{ width: '75px', textAlign: 'center' }}>
                  Quality
                </th>

                {/* INSAT Engineering Value Columns â€” prominent accent header */}
                {showEngineeringValues && enabledInsatSensors.map((sensor) => (
                  <th
                    key={sensor.sensorName}
                    className="csd-th csd-th-eng"
                    style={{
                      minWidth: '110px',
                      textAlign: 'right',
                    }}
                    title={`${sensor.equationDisplay} (${sensor.insatSensorIds.join(', ')})`}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ color: '#c084fc', fontWeight: 700, fontSize: '0.72rem' }}>
                        {sensor.sensorName}
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 500, fontSize: '0.66rem' }}>
                        ({sensor.unit})
                      </span>
                    </div>
                  </th>
                ))}

                {showConfigCols && (
                  <>
                    <th className="csd-th" style={{ width: '55px', textAlign: 'center' }}>
                      c1
                    </th>
                    <th className="csd-th" style={{ width: '55px', textAlign: 'center' }}>
                      c2
                    </th>
                    <th className="csd-th" style={{ width: '55px', textAlign: 'center' }}>
                      c3
                    </th>
                    <th className="csd-th" style={{ width: '80px', textAlign: 'center' }}>
                      H Code
                    </th>
                  </>
                )}

                <th className="csd-th" style={{ minWidth: '105px', textAlign: 'right' }}>
                  s16 (Composite)
                </th>
                <th className="csd-th" style={{ width: '65px', textAlign: 'center' }}>
                  s17
                </th>

                {showAllSensors ? (
                  <th className="csd-th" style={{ minWidth: '260px' }}>
                    Sensor Stream (s00 - s15)
                  </th>
                ) : (
                  <th className="csd-th" style={{ minWidth: '260px' }}>
                    Active Telemetry
                  </th>
                )}

                <th className="csd-th" style={{ minWidth: '115px', textAlign: 'center' }}>
                  Signal Code
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumnCount}
                    style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-dim)' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={24} color="var(--text-dim)" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>No matching telemetry records found</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Try adjusting your search criteria, station filter, or quality filter.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {recordRowVirtualizer.getVirtualItems().length > 0 &&
                    recordRowVirtualizer.getVirtualItems()[0].start > 0 && (
                      <tr>
                        <td
                          colSpan={totalColumnCount}
                          style={{
                            height: `${recordRowVirtualizer.getVirtualItems()[0].start}px`,
                            padding: 0,
                            border: 0,
                          }}
                        />
                      </tr>
                    )}
                  {recordRowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const r = paginatedRecords[virtualRow.index];
                    const isEven = virtualRow.index % 2 === 0;
                    return (
                      <RecordTableRow
                        key={r.id}
                        record={r}
                        isEven={isEven}
                        isSelected={selectedRecordId === r.id}
                        onSelect={() => setSelectedRecordId(selectedRecordId === r.id ? null : r.id)}
                        stationMasterMap={stationMasterMap}
                        showEngineeringValues={showEngineeringValues}
                        enabledInsatSensors={enabledInsatSensors}
                        insatMSL={insatMSL}
                        showConfigCols={showConfigCols}
                      />
                    );
                  })}
                  {recordRowVirtualizer.getVirtualItems().length > 0 && (
                    <tr>
                      <td
                        colSpan={totalColumnCount}
                        style={{
                          height: `${
                            recordRowVirtualizer.getTotalSize() -
                            recordRowVirtualizer.getVirtualItems()[
                              recordRowVirtualizer.getVirtualItems().length - 1
                            ].end
                          }px`,
                          padding: 0,
                          border: 0,
                        }}
                      />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Integrated Table Pagination Bar */}
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--table-border)',
            background: 'var(--table-header-bg)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            Showing{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {records.length > 0 ? (currentPage - 1) * tablePageSize + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {Math.min(currentPage * tablePageSize, records.length)}
            </strong>{' '}
            of <strong style={{ color: 'var(--text-main)' }}>{records.length}</strong> filtered records
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setTablePage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.75rem', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>

            <span className="mono-font" style={{ fontSize: '0.75rem' }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setTablePage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.75rem', opacity: currentPage >= totalPages ? 0.5 : 1 }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Record Details Drawer */}
      <RecordDrawer />
      <ExportOptionsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        format={exportFormat}
      />
    </div>
  );
}
