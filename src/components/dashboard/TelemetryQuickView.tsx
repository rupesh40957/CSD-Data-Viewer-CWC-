'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { Radio, ArrowUpRight, Activity, Zap, CheckCircle2, AlertTriangle, Table as TableIcon } from 'lucide-react';

export function TelemetryQuickView() {
  const { file, setSelectedRecordId } = useAppStore();
  const records = useAppStore(selectFilteredRecords);

  if (!file || records.length === 0) return null;

  // Take the most recent 7 records
  const recentRecords = records.slice(Math.max(0, records.length - 8)).reverse();

  return (
    <div
      className="glass-panel"
      id="telemetry-quick-view"
      style={{
        padding: '20px',
        width: '100%',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={17} color="var(--primary-light)" />
          </div>
          <div>
            <h4
              style={{
                fontSize: '0.94rem',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Recent Telemetry Stream Frames
            </h4>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Real-time sequence snapshot from {file.filename} logger stream
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/charts"
            className="btn-secondary"
            style={{ padding: '5px 12px', fontSize: '0.76rem', textDecoration: 'none' }}
          >
            <Zap size={13} color="var(--accent-teal)" />
            <span>Interactive Graphs</span>
          </Link>
          <Link
            href="/table"
            className="btn-secondary"
            style={{ padding: '5px 12px', fontSize: '0.76rem', textDecoration: 'none' }}
          >
            <TableIcon size={13} color="var(--primary-light)" />
            <span>Full Data Table ({records.length})</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* Stream Table */}
      <div style={{ overflowX: 'auto', width: '100%', border: '1px solid var(--table-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table
          className="csd-grid-table"
          style={{
            width: '100%',
            fontSize: '0.8rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr>
              <th className="csd-th" style={{ padding: '8px 12px' }}>Line #</th>
              <th className="csd-th" style={{ padding: '8px 12px' }}>Timestamp (IST)</th>
              <th className="csd-th" style={{ padding: '8px 12px' }}>Station ID</th>
              <th className="csd-th" style={{ padding: '8px 12px' }}>Carrier Lock</th>
              <th className="csd-th" style={{ padding: '8px 12px' }}>Record Type (H)</th>
              <th className="csd-th" style={{ padding: '8px 12px', textAlign: 'right' }}>s16 (Float)</th>
              <th className="csd-th" style={{ padding: '8px 12px', textAlign: 'right' }}>RF Signal Power</th>
              <th className="csd-th" style={{ padding: '8px 12px', textAlign: 'center' }}>Quality</th>
            </tr>
          </thead>
          <tbody>
            {recentRecords.map((r, idx) => {
              const isLocked = r.status === 'L';
              const isUnlocked = r.status === 'U';
              const isCorrupt = r.status === '$' || r.quality === 'Bad';

              return (
                <tr
                  key={r.id}
                  className={`csd-tr ${idx % 2 === 0 ? 'csd-tr-even' : 'csd-tr-odd'} ${isCorrupt ? 'bad-row' : ''}`}
                >
                  <td className="csd-td mono-font" style={{ padding: '9px 12px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>#{r.lineNumber}</span>
                  </td>
                  <td className="csd-td mono-font" style={{ padding: '9px 12px' }}>
                    {formatCsdTimestamp(r.timestamp, false)}
                  </td>
                  <td className="csd-td" style={{ padding: '9px 12px' }}>
                    <span
                      className="mono-font"
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: 'var(--primary-light)',
                        fontWeight: 600,
                      }}
                    >
                      {r.stationId}
                    </span>
                  </td>
                  <td className="csd-td" style={{ padding: '9px 12px' }}>
                    <span
                      className={`badge ${
                        isLocked ? 'badge-locked' : isUnlocked ? 'badge-unlocked' : 'badge-corrupt'
                      }`}
                      style={{ padding: '1px 6px', fontSize: '0.66rem' }}
                    >
                      {isLocked ? 'L (Locked)' : isUnlocked ? 'U (Unlocked)' : '$ (Noise)'}
                    </span>
                  </td>
                  <td className="csd-td mono-font" style={{ padding: '9px 12px' }}>
                    {r.h ? `H:${r.h}` : '--'}
                  </td>
                  <td className="csd-td mono-font" style={{ padding: '9px 12px', textAlign: 'right' }}>
                    {r.s16 !== null ? (
                      <strong style={{ color: 'var(--text-main)' }}>{r.s16.toFixed(3)}</strong>
                    ) : (
                      <span style={{ color: 'var(--quality-bad)' }}>$$</span>
                    )}
                  </td>
                  <td className="csd-td mono-font" style={{ padding: '9px 12px', textAlign: 'right' }}>
                    {r.signal.power !== undefined ? (
                      <span style={{ color: 'var(--accent-teal)' }}>{r.signal.power} dB</span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="csd-td" style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span
                      className={`badge ${r.quality === 'Good' ? 'badge-good' : 'badge-bad'}`}
                      style={{ padding: '1px 6px', fontSize: '0.66rem' }}
                    >
                      {r.quality}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
