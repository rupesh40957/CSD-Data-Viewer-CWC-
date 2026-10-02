'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { selectDetectedSensorsSummary } from '@/store/selectors';
import { Sliders, X, Check, RotateCcw, Info, Cpu } from 'lucide-react';

export function SensorMetadataModal() {
  const { isSettingsOpen, setIsSettingsOpen, sensorMetadata, updateSensorMetadata, resetSensorMetadata } =
    useAppStore();
  const detectedSensors = useAppStore(selectDetectedSensorsSummary);

  const [localMap, setLocalMap] = useState<Record<string, { customLabel: string; unit: string }>>(
    sensorMetadata
  );

  if (!isSettingsOpen) return null;

  const handleSave = () => {
    Object.entries(localMap).forEach(([key, val]) => {
      updateSensorMetadata(key, val);
    });
    setIsSettingsOpen(false);
  };

  const handleReset = () => {
    resetSensorMetadata();
    setLocalMap({});
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} color="var(--primary-light)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Telemetry Sensor Parameter Mapping</h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Configure user-defined telemetry labels and engineering units
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(false)}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Info Banner */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(56, 189, 248, 0.08)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          <Info size={16} color="var(--primary-light)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            The raw <code>.csd</code> logger stream records telemetry channels as standard slots (<code>s00</code>–<code>s17</code>) and configs (<code>c1</code>–<code>c3</code>).
            To keep factual data integrity, default labels remain raw. You can define custom descriptions and units below for visual reporting without modifying the underlying raw records.
          </span>
        </div>

        {/* Form Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', width: '120px' }}>Raw Key</th>
                <th style={{ padding: '8px 10px' }}>Custom Label (Optional)</th>
                <th style={{ padding: '8px 10px', width: '140px' }}>Engineering Unit</th>
              </tr>
            </thead>
            <tbody>
              {detectedSensors.map((s) => {
                const current = localMap[s.key] || { customLabel: '', unit: '' };
                return (
                  <tr key={s.key} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.06)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      <span className="badge badge-locked" style={{ padding: '2px 8px' }}>
                        {s.key}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        placeholder={`e.g. ${s.key === 's16' ? 'Water Level' : s.key}`}
                        value={current.customLabel}
                        onChange={(e) =>
                          setLocalMap({
                            ...localMap,
                            [s.key]: { ...current, customLabel: e.target.value },
                          })
                        }
                        className="text-input"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.78rem' }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="text"
                        placeholder="e.g. m, V, mm"
                        value={current.unit}
                        onChange={(e) =>
                          setLocalMap({
                            ...localMap,
                            [s.key]: { ...current, unit: e.target.value },
                          })
                        }
                        className="text-input mono-font"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.78rem' }}
                      />
                    </td>
                  </tr>
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
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <RotateCcw size={13} />
            <span>Reset to Raw Keys</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{ padding: '6px 16px', fontSize: '0.78rem' }}
            >
              <Check size={14} />
              <span>Apply Mappings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
