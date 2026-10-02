'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import { selectSelectedStationDetails } from '@/store/selectors';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import {
  X,
  Radio,
  MapPin,
  Building,
  Briefcase,
  Waves,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function StationDetailsModal() {
  const router = useRouter();
  const {
    isStationDetailsOpen,
    setIsStationDetailsOpen,
    selectedStationIdForDetails,
    selectSingleStation,
  } = useAppStore();

  const { summary, master } = useAppStore(selectSelectedStationDetails);

  if (!isStationDetailsOpen || !selectedStationIdForDetails) return null;

  const stationId = selectedStationIdForDetails;
  const isMapped = !!master;
  const stationName = master?.stationName || 'Unknown Station (Unmapped)';

  const handleFilterToThisStation = () => {
    selectSingleStation(stationId);
    setIsStationDetailsOpen(false);
    router.push('/table');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => setIsStationDetailsOpen(false)}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(17, 28, 53, 0.95) 0%, rgba(13, 21, 39, 0.98) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: isMapped ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${isMapped ? 'rgba(56, 189, 248, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              <Radio size={19} color={isMapped ? 'var(--primary-light)' : 'var(--quality-bad)'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {stationName}
                </h3>
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    background: isMapped ? 'var(--quality-good-bg)' : 'var(--quality-bad-bg)',
                    color: isMapped ? 'var(--quality-good)' : 'var(--quality-bad)',
                    border: `1px solid ${isMapped ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {isMapped ? 'MAPPED IN MASTER' : 'UNMAPPED'}
                </span>
              </div>
              <div className="mono-font" style={{ fontSize: '0.78rem', color: 'var(--primary-light)', marginTop: '2px' }}>
                Station ID: <strong>{stationId}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsStationDetailsOpen(false)}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Master Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
            }}
          >
            {/* State */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
                <MapPin size={12} color="var(--primary-light)" />
                <span>STATE</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: master?.stateName ? 'var(--text-main)' : 'var(--text-dim)' }}>
                {master?.stateName || 'Not available'}
              </div>
            </div>

            {/* District */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
                <MapPin size={12} color="var(--accent-teal)" />
                <span>DISTRICT</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: master?.district ? 'var(--text-main)' : 'var(--text-dim)' }}>
                {master?.district || 'Not available'}
              </div>
            </div>

            {/* River */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
                <Waves size={12} color="#06b6d4" />
                <span>RIVER</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: master?.riverName ? 'var(--text-main)' : 'var(--text-dim)' }}>
                {master?.riverName || 'Not available'}
              </div>
            </div>

            {/* Organization */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
                <Building size={12} color="#a855f7" />
                <span>ORGANIZATION</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: master?.organizationName ? 'var(--text-main)' : 'var(--text-dim)' }}>
                {master?.organizationName || 'Not available'}
              </div>
            </div>

            {/* Division Office */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                gridColumn: '1 / -1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>
                <Briefcase size={12} color="#f59e0b" />
                <span>DIVISION OFFICE</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: master?.divisionOffice ? 'var(--text-main)' : 'var(--text-dim)' }}>
                {master?.divisionOffice || 'Not available'}
              </div>
            </div>
          </div>

          {/* Telemetry Stream Activity for this Station */}
          {summary && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(13, 21, 39, 0.6)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '10px' }}>
                CSD TELEMETRY ACTIVITY
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Records</div>
                  <div className="mono-font" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {summary.totalRecords}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Good Quality</div>
                  <div className="mono-font" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--quality-good)' }}>
                    {summary.goodRecords} ({((summary.goodRecords / summary.totalRecords) * 100).toFixed(0)}%)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status Modes</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <span className="badge badge-locked" style={{ fontSize: '0.65rem' }}>L:{summary.lockedCount}</span>
                    <span className="badge badge-unlocked" style={{ fontSize: '0.65rem' }}>U:{summary.unlockedCount}</span>
                    {summary.corruptCount > 0 && (
                      <span className="badge badge-corrupt" style={{ fontSize: '0.65rem' }}>$:{summary.corruptCount}</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.73rem', color: 'var(--text-dim)' }}>
                First Seen: {formatCsdTimestamp(summary.firstSeen, false)} • Last Seen: {formatCsdTimestamp(summary.lastSeen, false)}
              </div>
            </div>
          )}

          {!isMapped && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                fontSize: '0.76rem',
                color: 'var(--text-muted)',
              }}
            >
              <AlertTriangle size={16} color="var(--quality-bad)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--quality-bad)' }}>Unmapped Station:</strong> This Station ID was not found in the master Excel file (<code className="mono-font">Sation ID</code> column). The raw telemetry stream is preserved exactly without guessing metadata.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={() => setIsStationDetailsOpen(false)}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.8rem' }}
          >
            Close
          </button>
          <button
            onClick={handleFilterToThisStation}
            className="btn-primary"
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
          >
            <span>Filter Data Table to this Station</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
