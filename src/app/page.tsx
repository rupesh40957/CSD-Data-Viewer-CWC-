'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { FileUploader } from '@/components/upload/FileUploader';
import { FileSummaryCard } from '@/components/dashboard/FileSummaryCard';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { SensorOverview } from '@/components/dashboard/SensorOverview';
import { QualityChart } from '@/components/dashboard/QualityChart';
import { TopStationsTable } from '@/components/dashboard/TopStationsTable';
import { TelemetryQuickView } from '@/components/dashboard/TelemetryQuickView';
import { StationMappingCard } from '@/components/dashboard/StationMappingCard';
import { StationHierarchyExplorer } from '@/components/dashboard/StationHierarchyExplorer';
import {
  Activity,
  Sliders,
  ShieldCheck,
  Radio,
  Clock,
  Layers,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

export default function DashboardPage() {
  const { file, loadStationMaster, isLoading } = useAppStore();
  const [activeTab, setActiveTab] = useState<'all' | 'sensors' | 'quality' | 'stations'>('all');


  // Auto-load station master XLSX for name enrichment
  useEffect(() => {
    loadStationMaster();
  }, [loadStationMaster]);

  if (!file && !isLoading) {
    return <FileUploader />;
  }

  if (!file) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '1500px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* 1. File / Stream Summary Card */}
      <FileSummaryCard />

      {/* 1b. Station Master XLSX Mapping & Integration Card */}
      <StationMappingCard />

      {/* 2. Primary KPI Metric Cards (Total, Good %, Bad %, Channels, Start Time, End Time) */}
      <StatsCards />

      {/* Quick View Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Complete Overview', icon: Layers },
            { id: 'sensors', label: 'Parameter & Sensor Matrix', icon: Sliders },
            { id: 'quality', label: 'Carrier Lock & Quality Health', icon: ShieldCheck },
            { id: 'stations', label: 'Reporting Stations Activity', icon: Radio },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  border: isSelected
                    ? '1px solid rgba(56, 189, 248, 0.4)'
                    : '1px solid var(--border)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(6, 182, 212, 0.15))'
                    : 'var(--bg-surface)',
                  color: isSelected ? 'var(--primary-light)' : 'var(--text-muted)',
                  transition: 'all 0.12s ease',
                }}
              >
                <Icon size={14} color={isSelected ? 'var(--primary-light)' : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} />
          <span>Updated from stream live cache</span>
        </div>
      </div>

      {/* 3. Parameter / Sensor Overview (Table listing s00-s17, c1-c3, signal with min, max, avg, count, latest) */}
      {(activeTab === 'all' || activeTab === 'sensors') && (
        <section id="sensors-section">
          <SensorOverview />
        </section>
      )}

      {/* 4. Station Activity Summary & Hierarchy Telemetry Workstation */}
      {(activeTab === 'all' || activeTab === 'stations') && (
        <section id="stations-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <StationHierarchyExplorer />
          <TopStationsTable />
        </section>
      )}

      {/* 5. Data Quality, Transmission Locks (L vs U vs $) & H-code charts */}
      {(activeTab === 'all' || activeTab === 'quality') && (
        <section id="quality-section">
          <QualityChart />
        </section>
      )}

      {/* 6. Telemetry Quick View: Recent Stream frames snapshot */}
      {activeTab === 'all' && (
        <section id="quick-view-section">
          <TelemetryQuickView />
        </section>
      )}
    </div>
  );
}
