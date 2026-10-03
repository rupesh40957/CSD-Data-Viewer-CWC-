'use client';

import React, { useState } from 'react';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import {
  ExportSections,
  DEFAULT_EXPORT_SECTIONS,
  exportToExcel,
  exportToCsv,
} from '@/lib/utils/export';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Check,
  Building2,
  Clock,
  ShieldCheck,
  Sliders,
  Zap,
  Radio,
  Antenna,
} from 'lucide-react';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'excel' | 'csv';
}

const SECTION_INFO: {
  key: keyof ExportSections;
  label: string;
  desc: string;
  icon: React.ReactNode;
  columns: string[];
}[] = [
  {
    key: 'stationInfo',
    label: 'Station Information',
    desc: 'Line number, Station ID, Station Name',
    icon: <Building2 size={15} />,
    columns: ['Line', 'Station Name', 'Station ID'],
  },
  {
    key: 'timestamp',
    label: 'Timestamp (IST)',
    desc: 'Date/Time converted to IST, Time Offset code',
    icon: <Clock size={15} />,
    columns: ['Date/Time (IST)', 'Time Offset'],
  },
  {
    key: 'statusQuality',
    label: 'Status & Quality',
    desc: 'Carrier lock status, data quality, corruption flags',
    icon: <ShieldCheck size={15} />,
    columns: ['Status', 'Quality', 'Corrupt Flag'],
  },
  {
    key: 'configValues',
    label: 'Config Values',
    desc: 'Frame calibration counters and H code',
    icon: <Sliders size={15} />,
    columns: ['c1', 'c2', 'c3', 'H Code'],
  },
  {
    key: 'insatEngineering',
    label: 'INSAT Engineering Values',
    desc: 'Computed parameters: AirTemp, Battery, Humidity, Pressure, Rainfall, WaterLevel, etc.',
    icon: <Zap size={15} />,
    columns: ['AirTemp', 'Battery', 'Humidity', 'Pressure', 'RainDaily', 'Rainfall', 'Evaporation', 'SolarRad', 'WindDir', 'WindSpeed', 'WaterLevel'],
  },
  {
    key: 'rawSensors',
    label: 'Raw Sensor Readings',
    desc: 'Raw s00–s17 sensor multiplex channels',
    icon: <Radio size={15} />,
    columns: ['s00', 's01', '...', 's15', 's16', 's17'],
  },
  {
    key: 'signalInfo',
    label: 'Signal Information',
    desc: 'Carrier signal power, type, and raw signal code',
    icon: <Antenna size={15} />,
    columns: ['Signal Power', 'Signal Type', 'Signal Code'],
  },
];

export function ExportOptionsModal({ isOpen, onClose, format }: ExportOptionsModalProps) {
  const { file, insatSensors, insatMSL } = useAppStore();
  const records = useAppStore(selectFilteredRecords);

  const [sections, setSections] = useState<ExportSections>({ ...DEFAULT_EXPORT_SECTIONS });

  if (!isOpen || !file) return null;

  const toggleSection = (key: keyof ExportSections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    const all: ExportSections = {
      stationInfo: true,
      timestamp: true,
      statusQuality: true,
      configValues: true,
      insatEngineering: true,
      rawSensors: true,
      signalInfo: true,
    };
    setSections(all);
  };

  const selectNone = () => {
    const none: ExportSections = {
      stationInfo: false,
      timestamp: false,
      statusQuality: false,
      configValues: false,
      insatEngineering: false,
      rawSensors: false,
      signalInfo: false,
    };
    setSections(none);
  };

  const enabledCount = Object.values(sections).filter(Boolean).length;
  const totalColEstimate = SECTION_INFO.reduce(
    (sum, s) => sum + (sections[s.key] ? s.columns.length : 0),
    0
  );

  const handleExport = () => {
    const filename = `${file.filename.replace(/\.csd$/i, '')}_${format === 'excel' ? 'export.xlsx' : 'export.csv'}`;
    if (format === 'excel') {
      exportToExcel(records, filename, sections, insatSensors, insatMSL);
    } else {
      exportToCsv(records, filename, sections, insatSensors, insatMSL);
    }
    onClose();
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(16, 185, 129, 0.06)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: format === 'excel'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(34, 197, 94, 0.05))'
              : 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(14, 165, 233, 0.05))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: format === 'excel'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {format === 'excel' ? (
                <FileSpreadsheet size={18} color="#10b981" />
              ) : (
                <FileText size={18} color="#38bdf8" />
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Export to {format === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {records.length.toLocaleString()} filtered records • Select columns to include
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '5px', borderRadius: '50%' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            padding: '8px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.73rem',
          }}
        >
          <span style={{ color: 'var(--text-dim)' }}>
            <strong style={{ color: 'var(--text-main)' }}>{enabledCount}</strong> sections •{' '}
            <strong>~{totalColEstimate}</strong> columns
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={selectAll}
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Section List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SECTION_INFO.map((section) => {
              const isOn = sections[section.key];
              return (
                <div
                  key={section.key}
                  onClick={() => toggleSection(section.key)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isOn ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-surface)',
                    border: isOn
                      ? '1px solid rgba(16, 185, 129, 0.25)'
                      : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: isOn
                        ? '2px solid #10b981'
                        : '2px solid var(--text-dim)',
                      background: isOn ? '#10b981' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isOn && <Check size={13} color="white" strokeWidth={3} />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ color: isOn ? '#10b981' : 'var(--text-dim)' }}>
                        {section.icon}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          color: isOn ? 'var(--text-main)' : 'var(--text-muted)',
                        }}
                      >
                        {section.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      {section.desc}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {section.columns.map((col) => (
                        <span
                          key={col}
                          style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: isOn ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-subtle)',
                            color: isOn ? 'var(--primary-light)' : 'var(--text-dim)',
                            fontFamily: 'var(--font-mono)',
                            border: '1px solid rgba(148, 163, 184, 0.06)',
                          }}
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            className="btn-primary"
            disabled={enabledCount === 0}
            style={{
              padding: '8px 20px',
              fontSize: '0.82rem',
              opacity: enabledCount === 0 ? 0.4 : 1,
            }}
          >
            <Download size={15} />
            <span>
              Export {records.length.toLocaleString()} Records
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
