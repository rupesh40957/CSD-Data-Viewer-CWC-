'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Binary,
  UploadCloud,
  Trash2,
} from 'lucide-react';

export function FileSummaryCard() {
  const { file, clearFile, setIsImportModalOpen, isLoading } = useAppStore();

  if (!file) return null;

  const { parsingSummary, qualitySummary, stats } = file;

  const startStr = stats.startTime ? formatCsdTimestamp(stats.startTime, false) : '--';
  const endStr = stats.endTime ? formatCsdTimestamp(stats.endTime, false) : '--';

  // Calculate duration if timestamps exist
  let durationStr = '';
  if (stats.startTime && stats.endTime) {
    const diffMs = stats.endTime.getTime() - stats.startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    durationStr = `${hours}h ${mins}m continuous telemetry span`;
  }

  const goodPct = qualitySummary?.goodPercentage ?? ((stats.goodRecords / stats.totalRecords) * 100);
  const badPct = qualitySummary?.badPercentage ?? ((stats.badRecords / stats.totalRecords) * 100);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '22px 24px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        background: 'linear-gradient(180deg, rgba(17, 28, 53, 0.85) 0%, rgba(13, 21, 39, 0.95) 100%)',
      }}
    >
      {/* Top Gradient Accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #0284c7, #06b6d4, #10b981)',
        }}
      />

      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(6, 182, 212, 0.15))',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)',
            }}
          >
            <FileText size={22} color="var(--primary-light)" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2
                className="mono-font"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                {file.filename}
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--quality-good)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <span className="live-indicator" style={{ width: '6px', height: '6px' }} />
                STREAM ACTIVE
              </span>
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <span>{(file.fileSize / 1024).toFixed(1)} KB binary size</span>
              <span>•</span>
              <span>Windows-1252 ANSI encoded</span>
              <span>•</span>
              <span>Parsed in {parsingSummary?.parseTimeMs ?? 24} ms</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.76rem', gap: '6px' }}
            title="Import a new or replacement .csd file"
          >
            <UploadCloud size={14} color="var(--primary-light)" />
            <span>Replace File</span>
          </button>


          <button
            onClick={clearFile}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.76rem',
              gap: '6px',
              color: 'var(--quality-bad)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
            }}
            title="Unload current telemetry file and return to file importer"
          >
            <Trash2 size={13} />
            <span>Reset Stream</span>
          </button>
        </div>
      </div>

      {/* Grid of Key Technical & Protocol Parameters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginTop: '16px',
        }}
      >
        {/* 1. Records & Lines */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Layers size={14} color="var(--primary-light)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)' }}>
              RECORDS & PARSING
            </span>
          </div>
          <div className="mono-font" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
            {stats.totalRecords.toLocaleString()}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
              telemetry frames
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {parsingSummary?.totalLines ?? stats.totalRecords} physical lines ({parsingSummary?.lineEnding || 'CRLF'})
          </div>
        </div>

        {/* 2. Stream Quality Rate */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <CheckCircle2 size={14} color="var(--quality-good)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)' }}>
              DATA INTEGRITY
            </span>
          </div>
          <div className="mono-font" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--quality-good)' }}>
            {goodPct.toFixed(1)}%
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
              good frames
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {stats.goodRecords.toLocaleString()} valid • {stats.badRecords.toLocaleString()} corrupt / noisy ({badPct.toFixed(1)}%)
          </div>
        </div>

        {/* 3. Protocol Specs */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Binary size={14} color="#a855f7" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)' }}>
              PROTOCOL SPECIFICATION
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#d8b4fe',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              Prefix: » (0xBB)
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--primary-light)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              Delimiter: ¸ (0xB8)
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            21 fields per frame • Multi-sensor multiplex
          </div>
        </div>

        {/* 4. Reporting Stations */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Cpu size={14} color="var(--accent-teal)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)' }}>
              STATION TRANSMITTERS
            </span>
          </div>
          <div className="mono-font" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
            {stats.uniqueStations}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
              unique stations
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Hex-addressed loggers (e.g. {stats.topStations[0]?.stationId || '738B66FA'})
          </div>
        </div>
      </div>

      {/* Time Span Banner */}
      <div
        style={{
          marginTop: '14px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(13, 21, 39, 0.6)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.78rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={14} color="var(--primary-light)" />
          <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>TIME SPAN:</span>
          <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {startStr}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>→</span>
          <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {endStr}
          </span>
        </div>

        {durationStr && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            {durationStr}
          </div>
        )}

        {/* Lock Status Breakdown Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="badge badge-locked"
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            title="L: Phase-Locked Telemetry"
          >
            L: {stats.statusBreakdown.L.toLocaleString()}
          </span>
          <span
            className="badge badge-unlocked"
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            title="U: Unlocked Telemetry"
          >
            U: {stats.statusBreakdown.U.toLocaleString()}
          </span>
          {stats.statusBreakdown.$ > 0 && (
            <span
              className="badge badge-corrupt"
              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
              title="$: Noise or Corrupted Carrier"
            >
              $: {stats.statusBreakdown.$.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
