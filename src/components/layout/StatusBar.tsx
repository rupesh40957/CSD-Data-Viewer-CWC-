'use client';

import React from 'react';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { HardDrive, Clock, CheckCircle2, AlertOctagon, Code2 } from 'lucide-react';

export function StatusBar() {
  const { file } = useAppStore();
  const filtered = useAppStore(selectFilteredRecords);

  const total = file ? file.records.length : 0;
  const filteredCount = file ? filtered.length : 0;
  const goodPct = total > 0 ? ((file!.stats.goodRecords / total) * 100).toFixed(1) : '0';

  const startTimeStr = file?.stats.startTime ? formatCsdTimestamp(file.stats.startTime, false) : '--';
  const endTimeStr = file?.stats.endTime ? formatCsdTimestamp(file.stats.endTime, false) : '--';

  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-glass)',
        fontSize: '0.74rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        zIndex: 40,
      }}
    >
      {/* Left: Telemetry Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {file ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={13} color="var(--primary-light)" />
              <span>
                {filteredCount === total
                  ? `All ${total.toLocaleString()} Records`
                  : `Filtered: ${filteredCount.toLocaleString()} / ${total.toLocaleString()}`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={13} color="var(--text-dim)" />
              <span>
                {startTimeStr} — {endTimeStr}
              </span>
            </div>
          </>
        ) : (
          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
            No dataset loaded
          </span>
        )}
      </div>

      {/* Center: Developer Credit */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
        }}
      >
        <Code2 size={12} style={{ opacity: 0.6 }} />
        <span>Developed by</span>
        <a
          href="https://backcoding.in"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--primary-light)',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--primary-light)')}
        >
          BackCoding
        </a>
      </div>

      {/* Right: Quality Stats (only when file loaded) */}
      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} color="var(--quality-good)" />
            <span>
              Good: {file.stats.goodRecords.toLocaleString()} ({goodPct}%)
            </span>
          </div>

          {file.stats.badRecords > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={13} color="var(--quality-bad)" />
              <span style={{ color: 'var(--quality-bad)' }}>
                Bad: {file.stats.badRecords.toLocaleString()}
              </span>
            </div>
          )}

          <div style={{ color: 'var(--text-dim)' }}>
            Size: {(file.fileSize / 1024).toFixed(1)} KB
          </div>
        </div>
      ) : (
        <div />
      )}
    </footer>
  );
}
