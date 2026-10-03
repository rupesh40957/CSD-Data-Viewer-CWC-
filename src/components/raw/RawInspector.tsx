'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { formatRawGmtToIst } from '@/lib/parser/timestamp-parser';
import { FileCode, AlertOctagon, Filter, Search, CheckCircle2 } from 'lucide-react';

export function RawInspector() {
  const { file } = useAppStore();
  const [onlyBad, setOnlyBad] = useState(false);
  const [onlyDollar, setOnlyDollar] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 40;

  const records = file?.records || [];

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (onlyBad && r.quality !== 'Bad') return false;
      if (onlyDollar && !r.hasCorruptMarkers) return false;
      if (search.trim() !== '') {
        const q = search.toLowerCase();
        return (
          r.stationId.toLowerCase().includes(q) ||
          r.rawLine?.toLowerCase().includes(q) ||
          r.errors.some((err) => err.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [records, onlyBad, onlyDollar, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (!file) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>No Data Loaded</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Upload a .csd telemetry file, choose a folder, or provide a valid path/URL to inspect raw telemetry.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Protocol Framing Summary Card */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileCode size={22} color="var(--primary-light)" />
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Raw Frame Protocol Inspector</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Prefix: <code style={{ color: 'var(--primary-light)' }}>» (0xBB)</code> • Delimiter: <code style={{ color: 'var(--primary-light)' }}>¸ (0xB8)</code>
              </span>
              {file.parsingSummary && (
                <>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--primary-light)',
                      borderRadius: '4px',
                    }}
                  >
                    {file.parsingSummary.detectedEncoding}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      background: 'rgba(148, 163, 184, 0.1)',
                      color: 'var(--text-muted)',
                      borderRadius: '4px',
                    }}
                  >
                    {file.parsingSummary.lineEnding}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--quality-good)',
                      borderRadius: '4px',
                    }}
                  >
                    ⚡ {file.parsingSummary.parseTimeMs}ms parse
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              color: onlyBad ? 'var(--quality-bad)' : 'var(--text-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={onlyBad}
              onChange={(e) => {
                setOnlyBad(e.target.checked);
                setPage(1);
              }}
            />
            <span>Only Bad ({file.stats.badRecords})</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              color: onlyDollar ? '#f59e0b' : 'var(--text-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={onlyDollar}
              onChange={(e) => {
                setOnlyDollar(e.target.checked);
                setPage(1);
              }}
            />
            <span>Only $$ Corrupted ({file.stats.corruptedFieldsRecords})</span>
          </label>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Search
          size={15}
          color="var(--text-dim)"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Filter raw text or station ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="text-input mono-font"
          style={{ width: '100%', paddingLeft: '36px' }}
        />
      </div>

      {/* Frame List */}
      <div
        className="glass-panel"
        style={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: 'calc(100vh - 300px)',
          overflowY: 'auto',
        }}
      >
        {pageItems.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No raw frames match the selected criteria.
          </div>
        ) : (
          pageItems.map((r) => {
            const isBad = r.quality === 'Bad';
            const hasDollar = r.hasCorruptMarkers;

            return (
              <div
                key={r.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isBad ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-surface)',
                  border: isBad
                    ? '1px solid rgba(239, 68, 68, 0.25)'
                    : '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      className="mono-font"
                      style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}
                    >
                      LINE #{r.lineNumber}
                    </span>
                    <span
                      className="mono-font"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: isBad ? 'var(--quality-bad)' : 'var(--primary-light)',
                      }}
                    >
                      {r.stationId}
                    </span>
                    <span
                      className="mono-font"
                      style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}
                    >
                      {formatRawGmtToIst(r.timestampRaw)}
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginLeft: '4px' }}>IST</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {r.status === 'L' && <span className="badge badge-locked">LOCK (L)</span>}
                    {r.status === 'U' && <span className="badge badge-unlocked">UNLK (U)</span>}
                    {r.status === '$' && <span className="badge badge-corrupt">CORR ($)</span>}
                    {isBad ? (
                      <span className="badge badge-bad">BAD</span>
                    ) : (
                      <span className="badge badge-good">GOOD</span>
                    )}
                  </div>
                </div>

                {/* Raw Stream Output */}
                <div
                  className="mono-font"
                  style={{
                    fontSize: '0.74rem',
                    background: 'var(--bg-app)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    color: isBad ? 'var(--quality-bad)' : 'var(--text-muted)',
                    lineHeight: '1.4',
                  }}
                >
                  {r.rawLine}
                </div>

                {/* Anomalies / Warning tags */}
                {r.errors.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                    {r.errors.map((err, eIdx) => (
                      <span
                        key={eIdx}
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--quality-bad)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertOctagon size={10} />
                        {err}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} of{' '}
          {filtered.length} frames
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            Prev
          </button>
          <span className="mono-font" style={{ alignSelf: 'center' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
