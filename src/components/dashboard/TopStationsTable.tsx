'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/use-app-store';
import { Radio, ArrowUpRight, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export function TopStationsTable() {
  const router = useRouter();
  const {
    file,
    selectSingleStation,
    stationMasterMap,
    setSelectedStationIdForDetails,
    setIsUnmappedModalOpen,
  } = useAppStore();

  if (!file) return null;

  const top = file.stations.slice(0, 12);

  const handleInspect = (stationId: string) => {
    selectSingleStation(stationId);
    router.push('/table');
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginTop: '16px', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <h4
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--text-dim)',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>TOP TRANSMITTING STATIONS</span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--primary-light)',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              CSD ↔ XLSX Enriched
            </span>
          </h4>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Ranked by telemetry packet density across stream
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsUnmappedModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.76rem', color: 'var(--quality-corrupt)' }}
            title="Inspect telemetry stations missing in master XLSX"
          >
            <AlertCircle size={14} />
            <span>Diagnostics</span>
          </button>

          <button
            onClick={() => router.push('/table')}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.76rem' }}
          >
            <span>View All {file.stations.length} Stations</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--table-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table
          className="csd-grid-table"
          style={{
            width: '100%',
            fontSize: '0.82rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr>
              <th className="csd-th" style={{ padding: '10px 12px' }}>Station Name</th>
              <th className="csd-th" style={{ padding: '10px 12px' }}>Station ID</th>
              <th className="csd-th" style={{ padding: '10px 12px' }}>Total Records</th>
              <th className="csd-th" style={{ padding: '10px 12px' }}>Health / Quality</th>
              <th className="csd-th" style={{ padding: '10px 12px' }}>Carrier Status</th>
              <th className="csd-th" style={{ padding: '10px 12px' }}>Active Sensors</th>
              <th className="csd-th" style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {top.map((st, idx) => {
              const masterInfo =
                st.stationMetadata || stationMasterMap.get(st.stationId.trim().toUpperCase());
              const stationName = st.stationName || masterInfo?.stationName || null;
              const isMapped = !!stationName;
              const goodPct = ((st.goodRecords / st.totalRecords) * 100).toFixed(0);

              return (
                <tr
                  key={st.stationId}
                  className={`csd-tr ${idx % 2 === 0 ? 'csd-tr-even' : 'csd-tr-odd'}`}
                >
                  {/* Station Name */}
                  <td className="csd-td" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={14} color={isMapped ? 'var(--primary-light)' : 'var(--text-dim)'} />
                      {stationName ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.84rem' }}>
                            {stationName}
                          </span>
                          {masterInfo?.stateName && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {masterInfo.district ? `${masterInfo.district}, ` : ''}{masterInfo.stateName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            Unknown Station
                          </span>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'rgba(234, 179, 8, 0.15)',
                              color: 'var(--quality-corrupt)',
                              border: '1px solid rgba(234, 179, 8, 0.3)',
                            }}
                          >
                            Unmapped
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Station ID */}
                  <td className="csd-td" style={{ padding: '10px 12px' }}>
                    <span
                      className="mono-font"
                      style={{
                        fontWeight: 600,
                        color: isMapped ? 'var(--primary-light)' : 'var(--text-dim)',
                        fontSize: '0.8rem',
                        background: 'var(--bg-surface)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                      }}
                    >
                      {st.stationId}
                    </span>
                  </td>

                  {/* Total Records */}
                  <td className="csd-td" style={{ padding: '10px 12px' }}>
                    <span className="mono-font" style={{ fontWeight: 600 }}>
                      {st.totalRecords}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      records
                    </span>
                  </td>

                  {/* Health / Quality */}
                  <td className="csd-td" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '54px',
                          height: '6px',
                          borderRadius: '3px',
                          background: 'var(--quality-bad-bg)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${goodPct}%`,
                            height: '100%',
                            background: 'var(--quality-good)',
                          }}
                        />
                      </div>
                      <span
                        className="mono-font"
                        style={{
                          fontSize: '0.74rem',
                          color: st.badRecords === 0 ? 'var(--quality-good)' : 'var(--text-main)',
                        }}
                      >
                        {goodPct}%
                      </span>
                      {st.badRecords > 0 && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--quality-bad)',
                            background: 'var(--quality-bad-bg)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          {st.badRecords} bad
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Carrier Status */}
                  <td className="csd-td" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {st.lockedCount > 0 && (
                        <span className="badge badge-locked" style={{ fontSize: '0.65rem' }}>
                          L:{st.lockedCount}
                        </span>
                      )}
                      {st.unlockedCount > 0 && (
                        <span className="badge badge-unlocked" style={{ fontSize: '0.65rem' }}>
                          U:{st.unlockedCount}
                        </span>
                      )}
                      {st.corruptCount > 0 && (
                        <span className="badge badge-corrupt" style={{ fontSize: '0.65rem' }}>
                          $:{st.corruptCount}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Active Sensors */}
                  <td className="csd-td" style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {st.activeSensors.slice(0, 4).join(', ')}
                      {st.activeSensors.length > 4 ? ` +${st.activeSensors.length - 4}` : ''}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="csd-td" style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedStationIdForDetails(st.stationId)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        title="View Station Master Metadata"
                      >
                        <Info size={13} />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => handleInspect(st.stationId)}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      >
                        Inspect
                      </button>
                    </div>
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
