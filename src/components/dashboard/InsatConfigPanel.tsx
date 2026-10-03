'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { InsatSensorConfig } from '@/lib/insat/types';
import { DEFAULT_INSAT_SENSORS } from '@/lib/insat/default-config';
import {
  X,
  Check,
  RotateCcw,
  Satellite,
  Info,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Mountain,
} from 'lucide-react';

/**
 * INSAT Sensor Configuration Panel
 *
 * Full-featured modal for viewing and editing INSAT DCS sensor-to-parameter
 * mappings, equations, MSL value, and toggle individual sensors on/off.
 */
export function InsatConfigPanel() {
  const {
    isInsatConfigOpen,
    setIsInsatConfigOpen,
    insatSensors,
    setInsatSensors,
    insatMSL,
    setInsatMSL,
    showEngineeringValues,
    setShowEngineeringValues,
    resetInsatSensors,
    toggleInsatSensor,
  } = useAppStore();

  const [localSensors, setLocalSensors] = useState<InsatSensorConfig[]>(insatSensors);
  const [localMSL, setLocalMSL] = useState<number>(insatMSL);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Sync local state when modal opens
  React.useEffect(() => {
    if (isInsatConfigOpen) {
      setLocalSensors(insatSensors);
      setLocalMSL(insatMSL);
    }
  }, [isInsatConfigOpen, insatSensors, insatMSL]);

  if (!isInsatConfigOpen) return null;

  const enabledCount = localSensors.filter((s) => s.enabled).length;

  const handleSave = () => {
    setInsatSensors(localSensors);
    setInsatMSL(localMSL);
    setIsInsatConfigOpen(false);
  };

  const handleReset = () => {
    setLocalSensors(DEFAULT_INSAT_SENSORS);
    setLocalMSL(0);
  };

  const handleToggle = (idx: number) => {
    const next = [...localSensors];
    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
    setLocalSensors(next);
  };

  const handleMSLChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) setLocalMSL(num);
    else if (val === '' || val === '-') setLocalMSL(0);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsInsatConfigOpen(false);
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '880px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(6, 182, 212, 0.08)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(14, 165, 233, 0.05))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(14, 165, 233, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Satellite size={20} color="#06b6d4" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                INSAT Sensor Configuration
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Configure DCS telemetry channel → engineering parameter mappings
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Global engineering values toggle */}
            <button
              onClick={() => setShowEngineeringValues(!showEngineeringValues)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: showEngineeringValues
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid var(--border)',
                background: showEngineeringValues
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'var(--bg-surface)',
                color: showEngineeringValues ? '#10b981' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={13} />
              <span>Eng. Values {showEngineeringValues ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setIsInsatConfigOpen(false)}
              className="btn-secondary"
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(56, 189, 248, 0.06)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          <Info size={16} color="var(--primary-light)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            INSAT DCS equations convert raw integer telemetry values from CSD sensor channels
            (<code style={{ color: 'var(--primary-light)' }}>s00</code>–<code style={{ color: 'var(--primary-light)' }}>s14</code>,{' '}
            <code style={{ color: 'var(--primary-light)' }}>c1</code>–<code style={{ color: 'var(--primary-light)' }}>c3</code>)
            into calibrated physical measurements. Toggle sensors on/off and adjust MSL for WaterLevel.
          </span>
        </div>

        {/* MSL Configuration */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mountain size={16} color="#06b6d4" />
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Mean Sea Level (MSL)</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  marginLeft: '8px',
                }}
              >
                Added to WaterLevel = (s08 + s09) + MSL
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="number"
              value={localMSL}
              onChange={(e) => handleMSLChange(e.target.value)}
              step="0.001"
              className="text-input mono-font"
              style={{
                width: '120px',
                padding: '6px 10px',
                fontSize: '0.82rem',
                textAlign: 'right',
                fontWeight: 600,
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>meters</span>
          </div>
        </div>

        {/* Status Bar */}
        <div
          style={{
            padding: '8px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.73rem',
            color: 'var(--text-dim)',
          }}
        >
          <span>
            <strong style={{ color: 'var(--text-main)' }}>{enabledCount}</strong> of{' '}
            <strong>{localSensors.length}</strong> parameters enabled
          </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            Profile: CWC Default
          </span>
        </div>

        {/* Sensor Configuration Table */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '0',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--bg-surface)',
                zIndex: 5,
              }}
            >
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '10px 16px', width: '44px', textAlign: 'center' }}>ON</th>
                <th style={{ padding: '10px 12px', minWidth: '110px' }}>Parameter</th>
                <th style={{ padding: '10px 10px', width: '70px' }}>Unit</th>
                <th style={{ padding: '10px 10px', width: '80px' }}>Source</th>
                <th style={{ padding: '10px 10px', width: '60px' }}>Pos</th>
                <th style={{ padding: '10px 10px', width: '55px' }}>Res.</th>
                <th style={{ padding: '10px 12px' }}>INSAT Equation</th>
                <th style={{ padding: '10px 12px', width: '30px' }}></th>
              </tr>
            </thead>
            <tbody>
              {localSensors.map((sensor, idx) => {
                const isExpanded = expandedIdx === idx;
                return (
                  <React.Fragment key={idx}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid rgba(148, 163, 184, 0.06)',
                        opacity: sensor.enabled ? 1 : 0.45,
                        transition: 'opacity 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    >
                      {/* Toggle */}
                      <td
                        style={{ padding: '10px 16px', textAlign: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(idx);
                        }}
                      >
                        {sensor.enabled ? (
                          <ToggleRight
                            size={22}
                            color="#10b981"
                            style={{ cursor: 'pointer' }}
                          />
                        ) : (
                          <ToggleLeft
                            size={22}
                            color="var(--text-dim)"
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </td>

                      {/* Parameter Name */}
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            color: sensor.enabled ? 'var(--text-main)' : 'var(--text-dim)',
                          }}
                        >
                          {sensor.sensorName}
                        </span>
                      </td>

                      {/* Unit */}
                      <td
                        style={{
                          padding: '10px 10px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {sensor.unit}
                      </td>

                      {/* Source IDs */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                          {sensor.insatSensorIds.map((id) => (
                            <span
                              key={id}
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                background: 'rgba(56, 189, 248, 0.1)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                color: 'var(--primary-light)',
                                fontWeight: 600,
                              }}
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Position */}
                      <td
                        style={{
                          padding: '10px 10px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                        }}
                      >
                        {sensor.insatSensorPositions.join(', ')}
                      </td>

                      {/* Resolution */}
                      <td
                        style={{
                          padding: '10px 10px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: 'var(--text-dim)',
                        }}
                      >
                        {sensor.resolution}
                      </td>

                      {/* Equation */}
                      <td style={{ padding: '10px 12px' }}>
                        <code
                          style={{
                            fontSize: '0.76rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(139, 92, 246, 0.08)',
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                            color: '#a78bfa',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {sensor.equationDisplay}
                        </code>
                      </td>

                      {/* Expand Arrow */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {isExpanded ? (
                          <ChevronUp size={14} color="var(--text-dim)" />
                        ) : (
                          <ChevronDown size={14} color="var(--text-dim)" />
                        )}
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.06)' }}>
                        <td colSpan={8} style={{ padding: '0 16px 14px 60px' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr 1fr',
                              gap: '12px',
                              padding: '14px 16px',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(15, 23, 42, 0.5)',
                              border: '1px solid rgba(148, 163, 184, 0.06)',
                              fontSize: '0.76rem',
                              animation: 'fadeIn 0.15s ease',
                            }}
                          >
                            <div>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                Equation Type
                              </span>
                              <div style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                                {sensor.equationType}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                Right Digits
                              </span>
                              <div style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                                {sensor.rightDigit}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                Parameters
                              </span>
                              <div style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                                {sensor.equationParams
                                  ? Object.entries(sensor.equationParams)
                                      .map(([k, v]) => `${k}=${v}`)
                                      .join(', ')
                                  : '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <button
            onClick={handleReset}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            <RotateCcw size={13} />
            <span>Reset to CWC Defaults</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsInsatConfigOpen(false)}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{ padding: '6px 18px', fontSize: '0.78rem' }}
            >
              <Check size={14} />
              <span>Apply Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
