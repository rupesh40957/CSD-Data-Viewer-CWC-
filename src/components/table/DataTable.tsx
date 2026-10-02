'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { exportToExcel, exportToCsv } from '@/lib/utils/export';
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Columns,
  RefreshCw,
} from 'lucide-react';
import { CsdRecord } from '@/types/csd';
import { RecordDrawer } from './RecordDrawer';

export function DataTable() {
  const {
    file,
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
  } = useAppStore();
  const records = useAppStore(selectFilteredRecords);

  const [showConfigCols, setShowConfigCols] = useState(true);
  const [showAllSensors, setShowAllSensors] = useState(false);

  // Pagination calculation
  const totalPages = Math.ceil(records.length / tablePageSize) || 1;
  const currentPage = Math.min(Math.max(1, tablePage), totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * tablePageSize;
    return records.slice(start, start + tablePageSize);
  }, [records, currentPage, tablePageSize]);

  if (!file) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>No Data Loaded</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Upload a .csd telemetry file, choose a folder, or provide a valid path/URL to view records.
        </p>
      </div>
    );
  }

  const handleExportExcel = () => {
    exportToExcel(records, `${file.filename.replace('.csd', '')}_report.xlsx`);
  };

  const handleExportCsv = () => {
    exportToCsv(records, `${file.filename.replace('.csd', '')}_report.csv`);
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
        {/* Left: Quick Search & Filter Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
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
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          {selectedStations.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--primary-light)',
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
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Right: Column Toggles, Page Size & Exports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

          <select
            value={tablePageSize}
            onChange={(e) => {
              setTablePageSize(Number(e.target.value));
            }}
            className="text-input"
            style={{ padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
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

      {/* Main Data Table */}
      <div
        className="glass-panel"
        style={{
          overflowX: 'auto',
          width: '100%',
          maxHeight: 'calc(100vh - 230px)',
          overflowY: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            textAlign: 'left',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: 'var(--bg-surface)',
              zIndex: 10,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-dim)',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '10px 12px', width: '50px' }}>Line</th>
              <th style={{ padding: '10px 12px', minWidth: '160px' }}>Station Name</th>
              <th style={{ padding: '10px 12px' }}>Station ID</th>
              <th style={{ padding: '10px 12px' }}>Date & Time (IST)</th>
              <th style={{ padding: '10px 10px' }}>Offset</th>
              <th style={{ padding: '10px 10px' }}>Status</th>
              <th style={{ padding: '10px 10px' }}>Quality</th>

              {showConfigCols && (
                <>
                  <th style={{ padding: '10px 8px' }}>c1</th>
                  <th style={{ padding: '10px 8px' }}>c2</th>
                  <th style={{ padding: '10px 8px' }}>c3</th>
                  <th style={{ padding: '10px 10px' }}>H Code</th>
                </>
              )}

              <th style={{ padding: '10px 12px' }}>s16 (Composite)</th>
              <th style={{ padding: '10px 10px' }}>s17</th>

              {showAllSensors ? (
                <>
                  <th style={{ padding: '10px 10px' }}>Sensor Stream (s00 - s15)</th>
                </>
              ) : (
                <th style={{ padding: '10px 10px' }}>Active Telemetry</th>
              )}

              <th style={{ padding: '10px 12px' }}>Signal Code</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={showConfigCols ? 14 : 10}
                  style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}
                >
                  No records match your active filter criteria.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r) => {
                const isBad = r.quality === 'Bad';
                const isSelected = selectedRecordId === r.id;
                const masterInfo =
                  r.stationMetadata || stationMasterMap.get(r.stationId.trim().toUpperCase());
                const stationName = r.stationName || masterInfo?.stationName || null;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecordId(isSelected ? null : r.id)}
                    style={{
                      height: '42px',
                      borderBottom: '1px solid var(--border)',
                      background: isSelected
                        ? 'var(--primary-glow)'
                        : isBad
                        ? 'rgba(239, 68, 68, 0.04)'
                        : 'transparent',
                      borderLeft: isSelected
                        ? '3px solid var(--primary-light)'
                        : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = isBad
                          ? 'rgba(239, 68, 68, 0.08)'
                          : 'var(--bg-surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = isBad
                          ? 'rgba(239, 68, 68, 0.03)'
                          : 'transparent';
                      }
                    }}
                  >
                    {/* Line */}
                    <td
                      style={{
                        padding: '8px 12px',
                        color: 'var(--text-dim)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                      }}
                    >
                      #{r.lineNumber}
                    </td>

                    {/* Station Name */}
                    <td style={{ padding: '8px 12px' }}>
                      {stationName ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>
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
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                            Unknown Station
                          </span>
                          <span
                            style={{
                              fontSize: '0.6rem',
                              padding: '0px 4px',
                              borderRadius: '2px',
                              background: 'rgba(234, 179, 8, 0.15)',
                              color: 'var(--quality-corrupt)',
                            }}
                          >
                            Unmapped
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Station ID */}
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        className="mono-font"
                        style={{
                          fontWeight: 700,
                          color: isBad ? 'var(--quality-bad)' : 'var(--primary-light)',
                        }}
                      >
                        {r.stationId}
                      </span>
                    </td>

                    {/* Timestamp IST */}
                    <td
                      style={{
                        padding: '8px 12px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCsdTimestamp(r.timestamp, true)}
                    </td>

                    {/* Time Offset */}
                    <td
                      style={{
                        padding: '8px 10px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {r.timeOffset}
                    </td>

                    {/* Status Mode */}
                    <td style={{ padding: '8px 10px' }}>
                      {r.status === 'L' && (
                        <span className="badge badge-locked">L</span>
                      )}
                      {r.status === 'U' && (
                        <span className="badge badge-unlocked">U</span>
                      )}
                      {r.status === '$' && (
                        <span className="badge badge-corrupt">$</span>
                      )}
                    </td>

                    {/* Quality */}
                    <td style={{ padding: '8px 10px' }}>
                      {r.quality === 'Good' ? (
                        <span className="badge badge-good">Good</span>
                      ) : (
                        <span className="badge badge-bad" title={r.errors.join('; ')}>
                          Bad
                        </span>
                      )}
                    </td>

                    {/* Config c1, c2, c3, H */}
                    {showConfigCols && (
                      <>
                        <td
                          style={{
                            padding: '8px 8px',
                            fontFamily: 'var(--font-mono)',
                            color: r.c1 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
                          }}
                        >
                          {r.c1 === null ? '$$' : r.c1}
                        </td>
                        <td
                          style={{
                            padding: '8px 8px',
                            fontFamily: 'var(--font-mono)',
                            color: r.c2 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
                          }}
                        >
                          {r.c2 === null ? '$$' : r.c2}
                        </td>
                        <td
                          style={{
                            padding: '8px 8px',
                            fontFamily: 'var(--font-mono)',
                            color: r.c3 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
                          }}
                        >
                          {r.c3 === null ? '$$' : r.c3}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            color: r.h ? 'var(--text-main)' : 'var(--quality-bad)',
                          }}
                        >
                          {r.h ? `H:${r.h}` : 'H:$$'}
                        </td>
                      </>
                    )}

                    {/* s16 Composite float */}
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        className="mono-font"
                        style={{
                          fontWeight: 700,
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
                      style={{
                        padding: '8px 10px',
                        fontFamily: 'var(--font-mono)',
                        color: r.s17 === null ? 'var(--quality-bad)' : 'var(--text-muted)',
                      }}
                    >
                      {r.s17 === null ? '$$' : r.s17}
                    </td>

                    {/* Sensor Array / Active Telemetry */}
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '320px' }}>
                        {r.sensors.map((s, sIdx) => {
                          const isDollar = s.value === null;
                          return (
                            <span
                              key={sIdx}
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: isDollar
                                  ? 'var(--quality-bad-bg)'
                                  : 'var(--bg-surface)',
                                border: isDollar
                                  ? '1px solid rgba(239, 68, 68, 0.4)'
                                  : '1px solid var(--border)',
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
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span
                        className="mono-font"
                        style={{
                          fontSize: '0.72rem',
                          color: r.signal.signalType === 'NN' ? 'var(--quality-bad)' : 'var(--text-dim)',
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

      {/* Table Pagination Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
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
            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
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
            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Record Details Drawer */}
      <RecordDrawer />
    </div>
  );
}
