'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { selectUnmappedStations, selectStationMappingMetrics } from '@/store/selectors';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import {
  X,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function UnmappedStationsModal() {
  const router = useRouter();
  const {
    isUnmappedModalOpen,
    setIsUnmappedModalOpen,
    selectSingleStation,
    stationMasterSummary,
  } = useAppStore();

  const unmappedStations = useAppStore(selectUnmappedStations);
  const metrics = useAppStore(selectStationMappingMetrics);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return unmappedStations;
    const q = search.trim().toLowerCase();
    return unmappedStations.filter((s) => s.stationId.toLowerCase().includes(q));
  }, [unmappedStations, search]);

  if (!isUnmappedModalOpen) return null;

  const handleInspectStation = (stationId: string) => {
    selectSingleStation(stationId);
    setIsUnmappedModalOpen(false);
    router.push('/table');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => setIsUnmappedModalOpen(false)}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <ShieldAlert size={20} color="var(--quality-bad)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Unmapped Stations Diagnostics
                </h3>
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--quality-bad-bg)',
                    color: 'var(--quality-bad)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {unmappedStations.length} Unmatched IDs
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                CSD telemetry Station IDs that have no matching entry in <code className="mono-font">Sation ID</code> column
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsUnmappedModalOpen(false)}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Overview Banner */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(13, 21, 39, 0.6)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.78rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Unmapped Stations: </span>
              <strong style={{ color: 'var(--quality-bad)' }}>{metrics.unmappedStations}</strong>
              <span style={{ color: 'var(--text-dim)' }}> ({((metrics.unmappedStations / metrics.totalCsdStations) * 100 || 0).toFixed(1)}%)</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Unmapped Records: </span>
              <strong style={{ color: 'var(--text-main)' }}>{metrics.unmappedRecords.toLocaleString()}</strong>
              <span style={{ color: 'var(--text-dim)' }}> ({((metrics.unmappedRecords / metrics.totalCsdRecords) * 100 || 0).toFixed(1)}%)</span>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={13}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search Station ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-input mono-font"
              style={{ width: '100%', paddingLeft: '30px', fontSize: '0.78rem', paddingTop: '5px', paddingBottom: '5px' }}
            />
          </div>
        </div>

        {/* Duplicate Station ID Diagnostic from Excel (Requirement 19) */}
        {stationMasterSummary && stationMasterSummary.duplicateCount > 0 && (
          <div
            style={{
              padding: '12px 24px',
              background: 'rgba(245, 158, 11, 0.12)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.76rem',
              color: 'var(--text-main)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px' }}>
              <AlertTriangle size={14} />
              <span>Duplicate Station IDs Detected in Excel Master ({stationMasterSummary.duplicateCount}):</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {stationMasterSummary.duplicates.map((dup) => (
                <div key={dup.stationId} className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Station ID: <strong style={{ color: '#f59e0b' }}>{dup.stationId}</strong> found on Rows: {dup.rows.join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unmapped Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.8rem',
              textAlign: 'left',
              marginTop: '12px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '8px 10px' }}>Unmatched Station ID</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Record Count</th>
                <th style={{ padding: '8px 10px' }}>First Timestamp</th>
                <th style={{ padding: '8px 10px' }}>Last Timestamp</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No unmapped stations match your filter
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.stationId}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '9px 10px' }}>
                      <span
                        className="mono-font"
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#f87171',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                        }}
                      >
                        {item.stationId}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }} className="mono-font">
                      <strong>{item.recordCount}</strong>
                    </td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-muted)' }} className="mono-font">
                      {formatCsdTimestamp(item.firstTimestamp, false)}
                    </td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-muted)' }} className="mono-font">
                      {formatCsdTimestamp(item.lastTimestamp, false)}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleInspectStation(item.stationId)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        <span>Filter</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Showing {filtered.length} of {unmappedStations.length} unmapped station IDs
          </span>
          <button
            onClick={() => setIsUnmappedModalOpen(false)}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
