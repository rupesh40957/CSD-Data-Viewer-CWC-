'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import { selectDetectedSensorsSummary } from '@/store/selectors';
import { Sliders, Activity, Settings, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';

export function SensorOverview() {
  const { file, setSelectedSensorKey, setIsSettingsOpen, setActiveVisualization } = useAppStore();
  const sensorSummaries = useAppStore(selectDetectedSensorsSummary);

  if (!file || sensorSummaries.length === 0) return null;

  const handleFocusSensor = (key: string) => {
    setSelectedSensorKey(key);
    // Smooth scroll to visualization section
    const el = document.getElementById('visualization-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="glass-panel" id="sensors-section" style={{ padding: '20px', width: '100%' }}>
      {/* Header */}
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
            <Sliders size={17} color="var(--primary-light)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700 }}>Telemetry Parameter Overview</h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  background: 'var(--bg-surface-hover)',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {sensorSummaries.length} Channels Detected
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Factual statistical distribution calculated directly from stream frames
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          title="Configure custom parameter labels and units"
        >
          <Settings size={13} />
          <span>Map Metadata</span>
        </button>
      </div>

      {/* Engineering Parameter Table */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                color: 'var(--text-dim)',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '10px 12px' }}>Channel Key</th>
              <th style={{ padding: '10px 12px' }}>Label / Unit</th>
              <th style={{ padding: '10px 12px' }}>Stream Coverage</th>
              <th style={{ padding: '10px 12px' }}>Min Value</th>
              <th style={{ padding: '10px 12px' }}>Max Value</th>
              <th style={{ padding: '10px 12px' }}>Mean (Avg)</th>
              <th style={{ padding: '10px 12px' }}>Latest Value</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sensorSummaries.map((sensor) => {
              const isGoodCoverage = sensor.validPct >= 80;
              return (
                <tr
                  key={sensor.key}
                  style={{
                    borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--bg-surface-hover)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Channel Key */}
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          sensor.key === 's16'
                            ? 'var(--primary-light)'
                            : sensor.key.startsWith('c')
                            ? '#fbbf24'
                            : sensor.key === 'signalPower'
                            ? 'var(--accent-teal)'
                            : 'var(--text-main)',
                      }}
                    >
                      {sensor.key}
                    </span>
                  </td>

                  {/* Label / Unit */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                        {sensor.customLabel || (sensor.key === 's16' ? 's16 (Float)' : sensor.key)}
                      </span>
                      {sensor.unit && (
                        <span
                          className="mono-font"
                          style={{
                            fontSize: '0.68rem',
                            padding: '1px 5px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: 'var(--primary-light)',
                            borderRadius: '4px',
                          }}
                        >
                          {sensor.unit}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Stream Coverage Bar */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '130px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                        <span style={{ color: isGoodCoverage ? 'var(--quality-good)' : 'var(--quality-bad)' }}>
                          {sensor.validPct}% valid
                        </span>
                        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                          {sensor.validReadings}/{sensor.totalReadings}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '4px',
                          width: '100%',
                          background: 'rgba(148, 163, 184, 0.15)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${sensor.validPct}%`,
                            height: '100%',
                            background: isGoodCoverage
                              ? 'linear-gradient(90deg, #10b981, #34d399)'
                              : 'linear-gradient(90deg, #ef4444, #f87171)',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Min */}
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'var(--font-mono)',
                      color: sensor.min !== null ? 'var(--text-main)' : 'var(--text-dim)',
                    }}
                  >
                    {sensor.min !== null ? sensor.min.toFixed(2) : '--'}
                  </td>

                  {/* Max */}
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'var(--font-mono)',
                      color: sensor.max !== null ? 'var(--text-main)' : 'var(--text-dim)',
                    }}
                  >
                    {sensor.max !== null ? sensor.max.toFixed(2) : '--'}
                  </td>

                  {/* Avg */}
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'var(--font-mono)',
                      color: sensor.avg !== null ? 'var(--primary-light)' : 'var(--text-dim)',
                    }}
                  >
                    {sensor.avg !== null ? sensor.avg.toFixed(2) : '--'}
                  </td>

                  {/* Latest */}
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'var(--font-mono)',
                      color: sensor.latest !== null ? '#10b981' : 'var(--text-dim)',
                      fontWeight: 600,
                    }}
                  >
                    {sensor.latest !== null ? sensor.latest.toFixed(2) : '--'}
                  </td>

                  {/* Plot Action */}
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleFocusSensor(sensor.key)}
                      className="btn-secondary"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title={`Plot ${sensor.key} time series curve`}
                    >
                      <Activity size={12} color="var(--primary-light)" />
                      <span>Plot</span>
                    </button>
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
