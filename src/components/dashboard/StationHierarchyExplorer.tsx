'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/use-app-store';
import { StationHierarchyTree } from '@/components/stations/StationHierarchyTree';
import {
  Radio,
  Building2,
  FolderTree,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Download,
  LineChart,
  Table as TableIcon,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Maximize2,
  Cpu,
  Activity,
  Sliders,
} from 'lucide-react';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { exportToExcel } from '@/lib/utils/export';

export function StationHierarchyExplorer() {
  const router = useRouter();
  const {
    file,
    selectedStationIdForDetails,
    setSelectedStationIdForDetails,
    selectSingleStation,
    stationMasterMap,
    setIsStationDetailsOpen,
  } = useAppStore();

  const stations = file?.stations || [];

  // Active inspected station
  const activeStationId =
    selectedStationIdForDetails || (stations.length > 0 ? stations[0].stationId : null);

  const activeStation = useMemo(() => {
    if (!activeStationId || !file) return null;
    const norm = activeStationId.trim().toUpperCase();
    const summary = file.stations.find(
      (s) => s.stationId.trim().toUpperCase() === norm
    );
    const master = stationMasterMap.get(norm) || summary?.stationMetadata;
    return { summary, master };
  }, [file, activeStationId, stationMasterMap]);

  // Compute sensor telemetry readings for active station
  const sensorStats = useMemo(() => {
    if (!activeStationId || !file) return [];
    const norm = activeStationId.trim().toUpperCase();
    const stationRecords = file.records.filter(
      (r) => r.stationId.trim().toUpperCase() === norm
    );

    if (stationRecords.length === 0) return [];

    // Aggregate values for s16 (Water Level), s17 (Battery), signal, and sensors
    const stats: {
      name: string;
      channel: string;
      unit: string;
      latest: number | string | null;
      min: number | null;
      max: number | null;
      count: number;
    }[] = [];

    // s16 Water Level
    const s16Vals = stationRecords
      .map((r) => r.s16)
      .filter((v): v is number => v !== null && !isNaN(v));
    if (s16Vals.length > 0) {
      stats.push({
        name: 'Water Level (s16)',
        channel: 's16',
        unit: 'Mtrs',
        latest: stationRecords[stationRecords.length - 1].s16,
        min: Math.min(...s16Vals),
        max: Math.max(...s16Vals),
        count: s16Vals.length,
      });
    }

    // s17 Battery
    const s17Vals = stationRecords
      .map((r) => r.s17)
      .filter((v): v is number => v !== null && !isNaN(v));
    if (s17Vals.length > 0) {
      stats.push({
        name: 'Battery / Auxiliary (s17)',
        channel: 's17',
        unit: 'Volt',
        latest: stationRecords[stationRecords.length - 1].s17,
        min: Math.min(...s17Vals),
        max: Math.max(...s17Vals),
        count: s17Vals.length,
      });
    }

    // Signal Power / RF Telemetry
    const sigVals = stationRecords
      .map((r) => r.signal.power)
      .filter((v): v is number => v !== null && !isNaN(v));
    if (sigVals.length > 0) {
      stats.push({
        name: 'RF Signal Power',
        channel: 'Signal',
        unit: 'dB',
        latest: stationRecords[stationRecords.length - 1].signal.power,
        min: Math.min(...sigVals),
        max: Math.max(...sigVals),
        count: sigVals.length,
      });
    }

    // Dynamic sensors s00 - s15
    const sensorKeys = new Set<string>();
    stationRecords.forEach((r) => {
      Object.keys(r.sensorMap).forEach((k) => sensorKeys.add(k));
    });

    sensorKeys.forEach((key) => {
      const lower = key.toLowerCase();
      // Skip explicit s16 and s17 to prevent duplicate channels
      if (lower === 's16' || lower === 's17') return;

      const vals: number[] = [];
      let latest: number | null = null;
      stationRecords.forEach((r) => {
        const arr = r.sensorMap[key];
        if (arr && arr.length > 0) {
          arr.forEach((v) => {
            if (v !== null && !isNaN(v)) {
              vals.push(v);
              latest = v;
            }
          });
        }
      });

      if (vals.length > 0) {
        stats.push({
          name: `Sensor Channel ${key.toUpperCase()}`,
          channel: key,
          unit: 'Reading',
          latest,
          min: Math.min(...vals),
          max: Math.max(...vals),
          count: vals.length,
        });
      }
    });

    return stats;
  }, [activeStationId, file]);

  const handleExportStation = () => {
    if (!activeStationId || !file) return;
    const norm = activeStationId.trim().toUpperCase();
    const stRecords = file.records.filter(
      (r) => r.stationId.trim().toUpperCase() === norm
    );
    if (stRecords.length === 0) return;
    const name = `${activeStation?.master?.stationName || activeStationId}_telemetry.xlsx`;
    exportToExcel(stRecords, name);
  };

  const handleFocusStationTable = () => {
    if (!activeStationId) return;
    selectSingleStation(activeStationId);
    router.push('/table');
  };

  const handleFocusStationCharts = () => {
    if (!activeStationId) return;
    selectSingleStation(activeStationId);
    router.push('/charts');
  };

  if (!file) return null;

  const summary = activeStation?.summary;
  const master = activeStation?.master;
  const isMapped = !!master;
  const displayName = master?.stationName || summary?.stationName || activeStationId || 'Unknown';

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(6, 182, 212, 0.4)',
            }}
          >
            <FolderTree size={18} color="#ffffff" />
          </div>

          <div>
            <h3
              style={{
                fontSize: '0.96rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0,
              }}
            >
              <span>STATION DIRECTORY & TELEMETRY WORKSTATION</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'var(--primary-light)',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                CSD Real-Time Viewer
              </span>
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Stepped 4-tier hierarchy: Organization ➔ Division Office ➔ State Name ➔ Station
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-dim)',
              padding: '4px 10px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            {stations.length} Telemetry Stations Detected
          </div>
        </div>
      </div>

      {/* Dual Pane Workstation Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 380px) 1fr',
          minHeight: '560px',
        }}
      >
        {/* LEFT PANE: Hierarchy Tree (Image 1 left side) */}
        <div
          style={{
            borderRight: '1px solid var(--border)',
            background: 'rgba(10, 17, 34, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '680px',
          }}
        >
          <StationHierarchyTree maxHeight="580px" />
        </div>

        {/* RIGHT PANE: Station-Wise Data View (Image 1 right side) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: '680px',
            background: 'var(--bg-surface)',
          }}
        >
          {activeStation ? (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Station Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(6, 182, 212, 0.05))',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Radio size={16} color="var(--primary-light)" />
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {displayName}
                    </h2>
                    {isMapped ? (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontWeight: 600,
                        }}
                      >
                        Mapped in Master
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: 'var(--quality-corrupt)',
                          fontWeight: 600,
                        }}
                      >
                        Unmapped Station
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Station ID:</span>
                    <strong className="mono-font" style={{ color: 'var(--primary-light)' }}>
                      {activeStationId}
                    </strong>
                    {master?.rawStationId && master.rawStationId !== activeStationId && (
                      <span style={{ color: 'var(--text-dim)' }}>(Excel: {master.rawStationId})</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons (Matching Image 1 right action bar) */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleFocusStationTable}
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                    title="View all records for this station in Data Table"
                  >
                    <TableIcon size={13} />
                    <span>View Data</span>
                  </button>

                  <button
                    onClick={handleFocusStationCharts}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                    title="Open sensor time series chart"
                  >
                    <LineChart size={13} color="var(--primary-light)" />
                    <span>Graph</span>
                  </button>

                  <button
                    onClick={handleExportStation}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                    title="Export station telemetry to Excel"
                  >
                    <Download size={13} color="#10b981" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => {
                      if (activeStationId) {
                        setSelectedStationIdForDetails(activeStationId);
                        setIsStationDetailsOpen(true);
                      }
                    }}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                    title="Detailed site information modal"
                  >
                    <Info size={13} />
                  </button>
                </div>
              </div>

              {/* Station Hierarchy & Geographic Metadata Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    <Building2 size={13} color="var(--primary-light)" />
                    <span>ORGANIZATION NAME</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {master?.organizationName || 'Unassigned Organization'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    <FolderTree size={13} color="#c084fc" />
                    <span>DIVISION OFFICE</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {master?.divisionOffice || 'Unassigned Division'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    <MapPin size={13} color="#4ade80" />
                    <span>STATE NAME</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {master?.stateName || 'Unassigned State'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    <Activity size={13} color="#fbbf24" />
                    <span>PACKET TRANSMISSIONS</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {summary?.totalRecords || 0} frames ({summary?.goodRecords || 0} valid)
                  </div>
                </div>
              </div>

              {/* Selected Sensors List Table (Matching Image 1 table exactly!) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      letterSpacing: '0.04em',
                      margin: 0,
                    }}
                  >
                    SELECTED SENSORS LIST
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {sensorStats.length} Sensor Channels Logged
                  </span>
                </div>

                <div
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-dim)' }}>
                          Parameter / Sensor
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-dim)' }}>
                          Channel
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-dim)' }}>
                          Unit
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-dim)' }}>
                          Latest Value
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-dim)' }}>
                          Min
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-dim)' }}>
                          Max
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-dim)' }}>
                          Samples
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensorStats.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                            No sensor readings recorded for this station
                          </td>
                        </tr>
                      ) : (
                        sensorStats.map((st, idx) => (
                          <tr
                            key={`${st.channel}-${idx}`}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)',
                            }}
                          >
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {displayName}:{st.name}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--primary-light)' }}>
                              {st.channel}
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                              {st.unit}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary-light)' }}>
                              {st.latest !== null ? String(st.latest) : '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                              {st.min !== null ? String(st.min) : '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                              {st.max !== null ? String(st.max) : '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-dim)' }}>
                              {st.count}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Time Window info */}
              {summary?.firstSeen && summary?.lastSeen && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Calendar size={13} color="var(--primary-light)" />
                  <span>
                    Observation Window:{' '}
                    <strong style={{ color: 'var(--text-main)' }}>
                      {formatCsdTimestamp(summary.firstSeen)}
                    </strong>{' '}
                    to{' '}
                    <strong style={{ color: 'var(--text-main)' }}>
                      {formatCsdTimestamp(summary.lastSeen)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                gap: '12px',
              }}
            >
              <Radio size={36} color="var(--text-dim)" style={{ opacity: 0.5 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No Station Selected</div>
              <div style={{ fontSize: '0.78rem', maxWidth: '360px' }}>
                Click on any station node in the hierarchy tree on the left to inspect its real-time telemetry,
                sensor parameters, and transmission statistics.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
