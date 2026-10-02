'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import { selectStationMappingMetrics } from '@/store/selectors/station-selectors';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react';

export function StationMappingCard() {
  const {
    file,
    stationMasterSummary,
    isStationMasterLoading,
    stationMasterError,
    setIsUnmappedModalOpen,
  } = useAppStore();

  const metrics = useAppStore(selectStationMappingMetrics);

  if (!file) return null;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '16px 20px',
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.04) 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <Building2 size={16} color="var(--quality-good)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                STATION MASTER XLSX ENRICHMENT
              </span>
              <span
                style={{
                  fontSize: '0.66rem',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--quality-good)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontWeight: 600,
                }}
              >
                ACTIVE JOIN
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Source:{' '}
              <span className="mono-font" style={{ color: 'var(--text-dim)' }}>
                {stationMasterSummary?.workbookName || 'Telemetryu sites details all station.xlsx'}
              </span>{' '}
              ({stationMasterSummary?.uniqueStationIds.toLocaleString() || 1054} master sites)
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsUnmappedModalOpen(true)}
          className="btn-secondary"
          style={{ padding: '5px 12px', fontSize: '0.75rem', gap: '6px' }}
        >
          <span>View Unmapped Diagnostics ({metrics.unmappedStations})</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {stationMasterError && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--quality-bad-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--quality-bad)',
            fontSize: '0.75rem',
          }}
        >
          {stationMasterError}
        </div>
      )}

      {/* Grid of the 4 specified statistics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* 1. Total Stations */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            TOTAL CSD STATIONS
          </div>
          <div
            className="mono-font"
            style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}
          >
            {metrics.totalCsdStations}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Unique transmitters in stream
          </div>
        </div>

        {/* 2. Mapped Stations */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="var(--quality-good)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              MAPPED STATIONS
            </span>
          </div>
          <div
            className="mono-font"
            style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--quality-good)', marginTop: '2px' }}
          >
            {metrics.mappedStations}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-dim)' }}>
              ({metrics.mappedPercentage}%)
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Matched to Excel `Sation ID`
          </div>
        </div>

        {/* 3. Unmapped Stations */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={13} color="var(--quality-corrupt)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              UNMAPPED STATIONS
            </span>
          </div>
          <div
            className="mono-font"
            style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--quality-corrupt)', marginTop: '2px' }}
          >
            {metrics.unmappedStations}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-dim)' }}>
              ({metrics.totalCsdStations > 0 ? (100 - metrics.mappedPercentage).toFixed(1) : 0}%)
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Missing in master workbook
          </div>
        </div>

        {/* 4. Total Records & Mapped Packet Density */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            TOTAL RECORDS (PACKETS)
          </div>
          <div
            className="mono-font"
            style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}
          >
            {metrics.totalCsdRecords.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {metrics.mappedRecords.toLocaleString()} mapped ({metrics.mappedRecordsPercentage}%) • {metrics.unmappedRecords} unmapped
          </div>
        </div>
      </div>
    </div>
  );
}
