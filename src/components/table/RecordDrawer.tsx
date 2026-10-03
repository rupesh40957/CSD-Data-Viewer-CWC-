'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { computeRecordEngineeringValues, getParameterColor } from '@/lib/insat/compute';
import {
  X,
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Binary,
  Copy,
  Check,
  Building2,
  ExternalLink,
  Satellite,
  Zap,
} from 'lucide-react';

export function RecordDrawer() {
  const {
    file,
    selectedRecordId,
    setSelectedRecordId,
    stationMasterMap,
    setSelectedStationIdForDetails,
    insatSensors,
    insatMSL,
    showEngineeringValues,
  } = useAppStore();

  const [copied, setCopied] = React.useState(false);

  if (!selectedRecordId || !file) return null;

  const record = file.records.find((r) => r.id === selectedRecordId);
  if (!record) return null;

  const masterInfo =
    record.stationMetadata || stationMasterMap.get(record.stationId.trim().toUpperCase());
  const stationName = record.stationName || masterInfo?.stationName || null;
  const isMapped = !!stationName;

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(record.rawLine || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '480px',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <Radio size={14} color="var(--primary-light)" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
              RECORD DETAILS
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Frame #{record.lineNumber} • ID: {record.id}
            </span>
          </div>
        </div>

        <button
          onClick={() => setSelectedRecordId(null)}
          className="btn-secondary"
          style={{ padding: '6px', borderRadius: '50%' }}
          title="Close details drawer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* 1. Station Information Section */}
        <div
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
              STATION INFORMATION
            </span>
            {isMapped ? (
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
                MAPPED
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.66rem',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: 'rgba(234, 179, 8, 0.15)',
                  color: 'var(--quality-corrupt)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  fontWeight: 600,
                }}
              >
                UNMAPPED
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Station Name</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {stationName || 'Unknown Station (Unmapped)'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Station ID</div>
              <div
                className="mono-font"
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: 'var(--primary-light)',
                  marginTop: '2px',
                  letterSpacing: '0.04em',
                }}
              >
                {record.stationId}
              </div>
            </div>

            {masterInfo && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                {masterInfo.stateName && (
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>State:</span>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-main)' }}>{masterInfo.stateName}</div>
                  </div>
                )}
                {masterInfo.district && (
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>District:</span>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-main)' }}>{masterInfo.district}</div>
                  </div>
                )}
                {masterInfo.riverName && (
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>River:</span>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-main)' }}>{masterInfo.riverName}</div>
                  </div>
                )}
                {masterInfo.organizationName && (
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Organization:</span>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-main)' }}>{masterInfo.organizationName}</div>
                  </div>
                )}
              </div>
            )}

            {isMapped && (
              <button
                onClick={() => setSelectedStationIdForDetails(record.stationId)}
                className="btn-secondary"
                style={{ marginTop: '6px', padding: '5px 10px', fontSize: '0.72rem', width: 'fit-content', gap: '4px' }}
              >
                <Building2 size={12} />
                <span>View Full Station Master Card</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Primary Telemetry Status & Quality */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          {/* Timestamp */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              gridColumn: 'span 2',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Clock size={13} color="var(--primary-light)" />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                TIMESTAMP (PRESERVED PRECISE)
              </span>
            </div>
            <div className="mono-font" style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {formatCsdTimestamp(record.timestamp, true)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Time offset code: <span className="mono-font">{record.timeOffset}</span>
            </div>
          </div>

          {/* Status */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
              CARRIER STATUS
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className={`badge badge-${
                  record.status === 'L' ? 'locked' : record.status === 'U' ? 'unlocked' : 'corrupt'
                }`}
                style={{ fontSize: '0.82rem', padding: '3px 8px' }}
              >
                {record.status} ({record.status === 'L' ? 'Locked' : record.status === 'U' ? 'Unlocked' : 'Corrupted'})
              </span>
            </div>
          </div>

          {/* Quality */}
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
              INTEGRITY QUALITY
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {record.quality === 'Good' ? (
                <>
                  <ShieldCheck size={16} color="var(--quality-good)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--quality-good)' }}>
                    Good Quality
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert size={16} color="var(--quality-bad)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--quality-bad)' }}>
                    Bad / Corrupt
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. Configuration & Header Parameters (c1, c2, c3, H) */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px' }}>
            FRAME CALIBRATION & H CODE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ textAlign: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>c1</div>
              <div className="mono-font" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{record.c1}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>c2</div>
              <div className="mono-font" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{record.c2}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>c3</div>
              <div className="mono-font" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{record.c3}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>H Code</div>
              <div className="mono-font" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                {record.h ?? '--'}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Sensors Matrix (s00-s17) */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              SENSOR MULTIPLEX CHANNELS (s00 - s17)
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {record.sensors.length} values
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
              gap: '6px',
            }}
          >
            {record.sensors.map((s, idx) => {
              const isDollar = s.value === null;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    background: isDollar ? 'var(--quality-bad-bg)' : 'var(--bg-subtle)',
                    border: isDollar ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {s.key}
                  </div>
                  <div
                    className="mono-font"
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      color: isDollar ? 'var(--quality-bad)' : 'var(--text-main)',
                    }}
                  >
                    {isDollar ? '$$' : s.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* s16 and s17 highlights */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1, fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>s16 (Composite): </span>
              <span className="mono-font" style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                {record.s16 === null ? '$$' : record.s16.toFixed(3)}
              </span>
            </div>
            <div style={{ flex: 1, fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>s17: </span>
              <span className="mono-font" style={{ fontWeight: 600 }}>
                {record.s17 === null ? '$$' : record.s17}
              </span>
            </div>
          </div>
        </div>

        {/* 4b. INSAT Engineering Values */}
        {showEngineeringValues && (() => {
          const enabledSensors = insatSensors.filter((s) => s.enabled);
          if (enabledSensors.length === 0) return null;
          const engValues = computeRecordEngineeringValues(enabledSensors, record, insatMSL);
          const entries = Object.values(engValues);

          return (
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(6, 182, 212, 0.04))',
                border: '1px solid rgba(139, 92, 246, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={13} color="#a78bfa" />
                  <span style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.04em' }}>
                    INSAT ENGINEERING VALUES
                  </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {entries.filter((e) => e.isValid).length}/{entries.length} computed
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '6px',
                }}
              >
                {entries.map((ev) => (
                  <div
                    key={ev.parameterName}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: ev.isValid
                        ? '1px solid rgba(139, 92, 246, 0.12)'
                        : '1px solid rgba(239, 68, 68, 0.2)',
                      textAlign: 'center',
                    }}
                    title={
                      ev.isValid
                        ? `Raw: ${ev.rawInputs.join(', ')} → ${ev.sourceKeys.join(', ')}`
                        : 'Missing or corrupt input data'
                    }
                  >
                    <div style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 600, marginBottom: '3px' }}>
                      {ev.parameterName}
                    </div>
                    <div
                      className="mono-font"
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: getParameterColor(ev.parameterName, ev.value),
                      }}
                    >
                      {ev.displayValue}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {ev.unit} • {ev.sourceKeys.join('+')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 5. Signal Code */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
            CARRIER SIGNAL QUALITY
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mono-font" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {record.signal.raw}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Type: {record.signal.signalType} • Power: {record.signal.power} dB
            </span>
          </div>
        </div>

        {/* 6. Raw CSD Record */}
        <div
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Binary size={13} color="var(--primary-light)" />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                RAW CSD TELEMETRY PACKET
              </span>
            </div>

            <button
              onClick={handleCopyRaw}
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.68rem', gap: '4px' }}
            >
              {copied ? <Check size={12} color="var(--quality-good)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre
            className="mono-font"
            style={{
              margin: 0,
              fontSize: '0.72rem',
              color: 'var(--text-main)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              padding: '8px',
              borderRadius: '4px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
            }}
          >
            {record.rawLine || 'Raw frame not preserved'}
          </pre>
        </div>
      </div>
    </div>
  );
}
