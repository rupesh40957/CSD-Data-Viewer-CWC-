'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import { formatTimeOnly, formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { Activity, Radio, Sliders, Zap } from 'lucide-react';

export function TelemetryCharts() {
  const {
    file,
    selectedStations,
    chartConfig,
    setStationFocus,
    setSelectedSensorKey,
    activeVisualization,
    setActiveVisualization,
    stationMasterMap,
  } = useAppStore();
  const records = useAppStore(selectFilteredRecords);

  const selectedSensor = chartConfig.selectedSensors[0] || 's16';
  const stationFocus = chartConfig.stationFocus || 'ALL';

  // Available sensors in data
  const sensorOptions = [
    { key: 's16', label: 's16 (Composite Float)' },
    { key: 's08', label: 's08 (Integer Part)' },
    { key: 's09', label: 's09 (Fractional Part)' },
    { key: 's17', label: 's17 (Auxiliary)' },
    { key: 's00', label: 's00' },
    { key: 's01', label: 's01' },
    { key: 's02', label: 's02' },
    { key: 's03', label: 's03' },
    { key: 's04', label: 's04' },
    { key: 'c1', label: 'c1 (Channel 1)' },
    { key: 'c2', label: 'c2 (Channel 2)' },
    { key: 'c3', label: 'c3 (Channel 3)' },
    { key: 'signalPower', label: 'Signal Power (dB)' },
  ];

  // Time-series data points
  const timeSeriesData = useMemo(() => {
    let dataset = records;
    if (stationFocus !== 'ALL') {
      dataset = records.filter((r) => r.stationId === stationFocus);
    }

    // Limit to 200 points for smooth charting, sampled if larger
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(dataset.length / maxPoints));

    const points = [];
    for (let i = 0; i < dataset.length; i += step) {
      const r = dataset[i];
      let val: number | null = null;

      if (selectedSensor === 's16') val = r.s16;
      else if (selectedSensor === 's17') val = r.s17;
      else if (selectedSensor === 'c1') val = r.c1;
      else if (selectedSensor === 'c2') val = r.c2;
      else if (selectedSensor === 'c3') val = r.c3;
      else if (selectedSensor === 'signalPower') val = r.signal.power;
      else {
        // Find in sensor array
        const found = r.sensors.find((s) => s.key === selectedSensor);
        val = found ? found.value : null;
      }

      const master = stationMasterMap.get(r.stationId.trim().toUpperCase());
      points.push({
        time: formatTimeOnly(r.timestamp),
        fullTime: formatCsdTimestamp(r.timestamp),
        value: val,
        stationId: r.stationId,
        stationName: r.stationName || master?.stationName || null,
        quality: r.quality,
        status: r.status,
        signal: r.signal.raw,
      });
    }

    return points;
  }, [records, selectedSensor, stationFocus, stationMasterMap]);

  // Signal Power Distribution
  const signalPoints = useMemo(() => {
    const dataset = stationFocus !== 'ALL' ? records.filter((r) => r.stationId === stationFocus) : records;
    const step = Math.max(1, Math.floor(dataset.length / 150));
    const result = [];
    for (let i = 0; i < dataset.length; i += step) {
      const r = dataset[i];
      result.push({
        time: formatTimeOnly(r.timestamp),
        power: r.signal.power,
        quality: r.quality,
        isGood: r.quality === 'Good',
        stationId: r.stationId,
      });
    }
    return result;
  }, [records, stationFocus]);

  // Sensor telemetry stats summary matrix
  const sensorMatrix = useMemo(() => {
    const keys = ['s16', 's17', 's00', 's01', 's02', 's08', 's09', 'c1', 'c2', 'c3'];
    return keys.map((key) => {
      let validCount = 0;
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;

      for (const r of records) {
        let val: number | null = null;
        if (key === 's16') val = r.s16;
        else if (key === 's17') val = r.s17;
        else if (key === 'c1') val = r.c1;
        else if (key === 'c2') val = r.c2;
        else if (key === 'c3') val = r.c3;
        else {
          const s = r.sensors.find((x) => x.key === key);
          val = s ? s.value : null;
        }

        if (val !== null && !isNaN(val)) {
          validCount++;
          sum += val;
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }

      return {
        key,
        total: records.length,
        validCount,
        validPct: records.length > 0 ? ((validCount / records.length) * 100).toFixed(0) : '0',
        min: min === Infinity ? '--' : min.toFixed(2),
        max: max === -Infinity ? '--' : max.toFixed(2),
        avg: validCount > 0 ? (sum / validCount).toFixed(2) : '--',
      };
    });
  }, [records]);

  if (!file) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>No Data Loaded</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Upload a .csd telemetry file, choose a folder, or provide a valid path/URL to view charts.
        </p>
      </div>
    );
  }

  const activeStationList = file.stations.slice(0, 30);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Controls Bar */}
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
          <Activity size={20} color="var(--primary-light)" />
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Telemetry Visualizer</h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Interactive time-series curves & RF carrier analysis
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sensor Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              SENSOR:
            </span>
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensorKey(e.target.value)}
              className="text-input mono-font"
              style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {sensorOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Station Focus Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              STATION:
            </span>
            <select
              value={stationFocus}
              onChange={(e) => setStationFocus(e.target.value)}
              className="text-input mono-font"
              style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', maxWidth: '320px' }}
            >
              <option value="ALL">All Stations (Aggregate)</option>
              {activeStationList.map((st) => {
                const masterInfo =
                  st.stationMetadata || stationMasterMap.get(st.stationId.trim().toUpperCase());
                const name = st.stationName || masterInfo?.stationName;
                const label = name ? `${name} — ${st.stationId}` : `${st.stationId} (Unmapped)`;
                return (
                  <option key={st.stationId} value={st.stationId}>
                    {label} ({st.totalRecords} recs)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* 1. Primary Time Series Chart */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-dim)',
                letterSpacing: '0.04em',
              }}
            >
              TIME SERIES TELEMETRY: {selectedSensor.toUpperCase()}
            </h4>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Station:{' '}
              <strong style={{ color: 'var(--primary-light)' }}>
                {stationFocus === 'ALL'
                  ? 'Multi-Node Aggregate'
                  : (() => {
                      const fm = stationMasterMap.get(stationFocus.trim().toUpperCase());
                      return fm?.stationName ? `${fm.stationName} — ${stationFocus}` : stationFocus;
                    })()}
              </strong>{' '}
              • Chronological trend
            </span>
          </div>

          {/* Visualization switcher */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['line', 'bar', 'scatter'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveVisualization(type)}
                className="btn-secondary"
                style={{
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  textTransform: 'capitalize',
                  background:
                    activeVisualization === type ? 'var(--primary)' : 'var(--bg-surface)',
                  color: activeVisualization === type ? '#ffffff' : 'var(--text-muted)',
                  borderColor:
                    activeVisualization === type ? 'var(--primary-light)' : 'var(--border)',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {activeVisualization === 'bar' ? (
              <BarChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={11} minTickGap={25} />
                <YAxis stroke="var(--text-dim)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                  }}
                  formatter={(val: unknown) => [
                    val !== null ? Number(val).toFixed(3) : '$$ (Corrupted)',
                    selectedSensor,
                  ]}
                />
                <Bar dataKey="value" fill="var(--primary-light)" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={11} minTickGap={25} />
                <YAxis stroke="var(--text-dim)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                  }}
                  formatter={(val: unknown) => [
                    val !== null ? Number(val).toFixed(3) : '$$ (Corrupted)',
                    selectedSensor,
                  ]}
                  labelFormatter={(_label, payload) =>
                    payload && payload[0]
                      ? `${payload[0].payload.fullTime} • STN: ${payload[0].payload.stationId}`
                      : ''
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary-light)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: 'var(--primary-light)' }}
                  activeDot={{ r: 5, fill: '#38bdf8' }}
                  connectNulls={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Signal Strength & Power Analysis */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-dim)',
              letterSpacing: '0.04em',
            }}
          >
            RF CARRIER SIGNAL POWER (dB)
          </h4>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Extracted from NNPnn burst telemetry • Tracks reception strength across frame intervals
          </span>
        </div>

        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={signalPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={11} minTickGap={25} />
              <YAxis stroke="var(--text-dim)" fontSize={11} domain={[25, 55]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                }}
              />
              <Bar dataKey="power" radius={[3, 3, 0, 0]}>
                {signalPoints.map((entry, index) => (
                  <Cell
                    key={`sig-${index}`}
                    fill={entry.isGood ? 'var(--quality-good)' : 'var(--quality-bad)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Sensor Matrix Health Summary */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-dim)',
            letterSpacing: '0.04em',
            marginBottom: '14px',
          }}
        >
          TELEMETRY PARAMETER STATISTICS MATRIX
        </h4>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Parameter</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Valid Readings</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Integrity %</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Min Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Max Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Mean Average</th>
              </tr>
            </thead>
            <tbody>
              {sensorMatrix.map((m) => (
                <tr
                  key={m.key}
                  style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)' }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <span className="mono-font" style={{ fontWeight: 700, color: 'var(--primary-light)' }}>
                      {m.key}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }} className="mono-font">
                    {m.validCount.toLocaleString()} / {m.total.toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background:
                          Number(m.validPct) > 90
                            ? 'var(--quality-good-bg)'
                            : 'var(--quality-bad-bg)',
                        color:
                          Number(m.validPct) > 90
                            ? 'var(--quality-good)'
                            : 'var(--quality-bad)',
                      }}
                    >
                      {m.validPct}%
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }} className="mono-font">
                    {m.min}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }} className="mono-font">
                    {m.max}
                  </td>
                  <td
                    style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}
                    className="mono-font"
                  >
                    {m.avg}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
