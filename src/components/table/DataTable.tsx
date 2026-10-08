'use client';

import React, { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { RecordDrawer } from './RecordDrawer';

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
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
      }}
    >
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
                ×
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
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Download size={13} color="#10b981" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Main Data Table Container Card */}
      <div className="csd-table-card">
        {/* Scrollable Grid Container */}
        <div className="csd-table-scroll-container">
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

                {/* INSAT Engineering Value Columns — prominent accent header */}
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
                paginatedRecords.map((r, rowIdx) => {
                  const isBad = r.quality === 'Bad';
                  const isSelected = selectedRecordId === r.id;
                  const isEven = rowIdx % 2 === 0;
                  const masterInfo =
                    r.stationMetadata || stationMasterMap.get(r.stationId.trim().toUpperCase());
                  const stationName = r.stationName || masterInfo?.stationName || null;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRecordId(isSelected ? null : r.id)}
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
                          <span className="badge badge-bad" title={r.errors.join('; ')}>
                            Bad
                          </span>
                        )}
                      </td>

                      {/* INSAT Engineering Value Cells — with clear parameter colors */}
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
                                  ? `Raw: ${ev.rawInputs.join(', ')} | Eq: ${sensor.equationDisplay}`
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
                          {r.sensors.map((s, sIdx) => {
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
                            color: r.signal.signalType === 'NN' ? 'var(--quality-bad)' : 'var(--text-dim)',
                            background: 'rgba(148, 163, 184, 0.06)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--table-border-subtle)',
                            display: 'inline-block',
                          }}
                        >
                          {r.signal.raw}
                        </span>
                      </td>
                    </tr>
                  );
                })
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
