'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { ArchiveFileInfo } from '@/lib/parser/date-extractor';
import {
  Calendar,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Filter,
} from 'lucide-react';

export function SidebarArchiveFiles() {
  const {
    archiveCatalog,
    archiveDateRange,
    setArchiveDateRange,
    selectedArchiveFileId,
    loadArchiveFile,
    file,
    isLoading,
    setIsArchiveModalOpen,
  } = useAppStore();

  const [query, setQuery] = useState('');

  // Filter files dynamically by arbitrary From Date and To Date
  const filteredFiles = useMemo(() => {
    if (!archiveCatalog || !archiveCatalog.files) return [];

    const from = archiveDateRange?.from?.trim() || '';
    const to = archiveDateRange?.to?.trim() || '';
    const q = query.trim().toLowerCase();

    return archiveCatalog.files.filter((f) => {
      // 1. Date Range filter (ISO string comparison: 'YYYY-MM-DD')
      if (from && f.dateKey < from) return false;
      if (to && f.dateKey > to) return false;

      // 2. Search query filter
      if (q) {
        const matchName = f.name.toLowerCase().includes(q);
        const matchHuman = f.humanDate.toLowerCase().includes(q);
        const matchDisplay = f.displayDate.toLowerCase().includes(q);
        if (!matchName && !matchHuman && !matchDisplay) return false;
      }

      // Missing dates are automatically skipped because we only iterate actual files
      return true;
    });
  }, [archiveCatalog, archiveDateRange, query]);

  if (!archiveCatalog || archiveCatalog.totalFiles === 0) {
    return null;
  }

  const handleResetToAll = () => {
    setArchiveDateRange({
      from: archiveCatalog.minDate || '',
      to: archiveCatalog.maxDate || '',
    });
    setQuery('');
  };

  const handleClearRange = () => {
    setArchiveDateRange({ from: '', to: '' });
    setQuery('');
  };

  const isFiltered =
    (archiveDateRange?.from && archiveDateRange.from !== (archiveCatalog.minDate || '')) ||
    (archiveDateRange?.to && archiveDateRange.to !== (archiveCatalog.maxDate || '')) ||
    query.trim().length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 12px',
        background: 'rgba(0, 237, 100, 0.02)',
        borderBottom: '1px solid var(--atlas-border)',
      }}
    >
      {/* ─── Header: Archive Summary & Calendar Trigger ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={13} color="var(--atlas-green)" />
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--atlas-green)',
            }}
          >
            Archive Files by Date
          </span>
        </div>

        <button
          onClick={() => setIsArchiveModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--atlas-text-secondary)',
            fontSize: '0.64rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
          title="Open Visual Calendar Explorer"
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--atlas-green)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--atlas-text-secondary)')}
        >
          <SlidersHorizontal size={11} />
          <span>Calendar</span>
        </button>
      </div>

      {/* ─── Dynamic Date Range Controls (From Date & To Date) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          background: 'var(--atlas-surface)',
          padding: '6px 8px',
          borderRadius: '6px',
          border: '1px solid var(--atlas-border)',
        }}
      >
        {/* From Date Input */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.6rem',
              color: 'var(--atlas-text-secondary)',
              fontWeight: 600,
              marginBottom: '2px',
              textTransform: 'uppercase',
            }}
          >
            From Date
          </label>
          <input
            type="date"
            value={archiveDateRange?.from || ''}
            onChange={(e) =>
              setArchiveDateRange({
                from: e.target.value,
                to: archiveDateRange?.to || '',
              })
            }
            className="mono-font"
            style={{
              width: '100%',
              padding: '3px 4px',
              fontSize: '0.68rem',
              borderRadius: '4px',
              background: 'var(--bg-app)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--atlas-text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* To Date Input */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.6rem',
              color: 'var(--atlas-text-secondary)',
              fontWeight: 600,
              marginBottom: '2px',
              textTransform: 'uppercase',
            }}
          >
            To Date
          </label>
          <input
            type="date"
            value={archiveDateRange?.to || ''}
            onChange={(e) =>
              setArchiveDateRange({
                from: archiveDateRange?.from || '',
                to: e.target.value,
              })
            }
            className="mono-font"
            style={{
              width: '100%',
              padding: '3px 4px',
              fontSize: '0.68rem',
              borderRadius: '4px',
              background: 'var(--bg-app)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--atlas-text-primary)',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>

      {/* ─── Quick Presets & File Counter Bar ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--atlas-text-secondary)',
            fontWeight: 500,
          }}
        >
          Showing <strong style={{ color: 'var(--atlas-green)' }}>{filteredFiles.length}</strong> of{' '}
          {archiveCatalog.totalFiles} files
        </span>

        <div style={{ display: 'flex', gap: '4px' }}>
          {isFiltered && (
            <button
              onClick={handleClearRange}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.62rem',
                color: 'var(--atlas-text-secondary)',
                cursor: 'pointer',
                padding: '1px 4px',
              }}
              title="Clear date filter"
            >
              Clear
            </button>
          )}

          <button
            onClick={handleResetToAll}
            style={{
              background: 'rgba(0, 237, 100, 0.1)',
              border: '1px solid rgba(0, 237, 100, 0.25)',
              borderRadius: '3px',
              padding: '2px 6px',
              fontSize: '0.62rem',
              color: 'var(--atlas-green)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            title="Reset range to encompass all available archive dates"
          >
            All Dates
          </button>
        </div>
      </div>

      {/* ─── Search / Filter Filter Input ─── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Search
          size={11}
          color="var(--atlas-text-secondary)"
          style={{ position: 'absolute', left: '7px', pointerEvents: 'none' }}
        />
        <input
          type="text"
          placeholder="Filter files by date or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 6px 4px 24px',
            fontSize: '0.68rem',
            borderRadius: '4px',
            background: 'var(--atlas-surface)',
            border: '1px solid var(--atlas-border)',
            color: 'var(--atlas-text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {/* ─── Filtered Available .csd Files List ─── */}
      <div
        style={{
          maxHeight: '340px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          paddingRight: '2px',
        }}
      >
        {filteredFiles.length === 0 ? (
          <div
            style={{
              padding: '20px 8px',
              textAlign: 'center',
              color: 'var(--atlas-text-secondary)',
              fontSize: '0.72rem',
              lineHeight: 1.4,
            }}
          >
            No .csd files found in selected date range.
            <div style={{ marginTop: '6px' }}>
              <button
                onClick={handleResetToAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--atlas-green)',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reset Date Range
              </button>
            </div>
          </div>
        ) : (
          filteredFiles.map((f: ArchiveFileInfo) => {
            const isCurrentlyActive =
              file?.filename === f.name || selectedArchiveFileId === f.id;

            return (
              <div
                key={f.id}
                onClick={async () => {
                  if (isLoading) return;
                  await loadArchiveFile(f);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '5px',
                  background: isCurrentlyActive
                    ? 'rgba(0, 237, 100, 0.12)'
                    : 'var(--atlas-surface)',
                  border: isCurrentlyActive
                    ? '1px solid #00ed64'
                    : '1px solid var(--atlas-border)',
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: 'all 0.12s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  boxShadow: isCurrentlyActive
                    ? '0 0 10px rgba(0, 237, 100, 0.2)'
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrentlyActive) {
                    e.currentTarget.style.borderColor = 'rgba(0, 237, 100, 0.4)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrentlyActive) {
                    e.currentTarget.style.borderColor = 'var(--atlas-border)';
                    e.currentTarget.style.background = 'var(--atlas-surface)';
                  }
                }}
                title={`Click to load ${f.name} (${f.humanDate}) into Data Table`}
              >
                {/* File Row 1: Filename & Status / Size */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                    {isCurrentlyActive ? (
                      <div
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#00ed64',
                          boxShadow: '0 0 6px #00ed64',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <FileText size={12} color="var(--atlas-text-secondary)" style={{ flexShrink: 0 }} />
                    )}
                    <span
                      className="mono-font"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: isCurrentlyActive ? 700 : 600,
                        color: isCurrentlyActive ? 'var(--atlas-green)' : 'var(--atlas-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.name}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.62rem',
                      color: isCurrentlyActive ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0,
                      fontWeight: isCurrentlyActive ? 700 : 500,
                    }}
                  >
                    {isCurrentlyActive ? 'ACTIVE' : f.formattedSize}
                  </span>
                </div>

                {/* File Row 2: Human-readable Date & Time / Copy Tag */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.64rem',
                    color: isCurrentlyActive ? 'rgba(0, 237, 100, 0.9)' : 'var(--atlas-text-secondary)',
                    paddingLeft: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={10} />
                    <span style={{ fontWeight: 600 }}>{f.humanDate}</span>
                    <span style={{ opacity: 0.7 }}>({f.displayDate})</span>
                  </div>

                  {f.timeTag && (
                    <span
                      style={{
                        fontSize: '0.58rem',
                        padding: '0 4px',
                        borderRadius: '3px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {f.timeTag}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
