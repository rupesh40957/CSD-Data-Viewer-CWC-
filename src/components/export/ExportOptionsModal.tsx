'use client';

import React, { useState } from 'react';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import {
  ExportSections,
  DEFAULT_EXPORT_SECTIONS,
  exportToExcel,
  exportToCsv,
  exportToPdf,
  generateExportFilename,
  ExportReportMode,
  formatCwcDateShort,
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
  Printer,
  Zap,
  Radio,
  Antenna,
  Loader2,
  TableProperties,
  ListFilter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'excel' | 'csv' | 'pdf';
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
    desc: 'Raw s00â€“s17 sensor multiplex channels',
    icon: <Radio size={15} />,
    columns: ['s00', 's01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17'],
  },
  {
    key: 'signalInfo',
    label: 'Signal Information',
    desc: 'Carrier signal power, type, and raw signal code',
    icon: <Antenna size={15} />,
    columns: ['Signal Power', 'Signal Type', 'Signal Code'],
  },
];

export function ExportOptionsModal({ isOpen, onClose, format: initialFormat }: ExportOptionsModalProps) {
  const {
    file,
    activeMode,
    archiveCatalog,
    archiveDateRange,
    activeArchiveRange,
    archiveMergedFile,
    insatSensors,
    insatMSL,
    selectedStations,
    dateRange,
    getRecordsForExport,
  } = useAppStore();
  const records = useAppStore(selectFilteredRecords);

  const [activeFormat, setActiveFormat] = useState<'excel' | 'csv' | 'pdf'>(initialFormat);
  const [exportScope, setExportScope] = useState<'all_archive' | 'filtered'>('all_archive');
  const [reportMode, setReportMode] = useState<ExportReportMode>('matrix');
  const [flattenedCsv, setFlattenedCsv] = useState(false);
  const [sections, setSections] = useState<ExportSections>({ ...DEFAULT_EXPORT_SECTIONS });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressPct, setExportProgressPct] = useState(0);
  const [exportProgressStage, setExportProgressStage] = useState('');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  // Sync format with prop when opened
  React.useEffect(() => {
    setActiveFormat(initialFormat);
    setExportSuccessMsg(null);
    setExportErrorMsg(null);
    setExportProgressPct(0);
    setExportProgressStage('');
  }, [initialFormat, isOpen]);

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

  // Calculate unique station count and dynamic date range info
  const validStationsList = file.stations?.filter((s) => s.stationId !== 'CORRUPT_FRAME' && s.stationId !== 'UNKNOWN') || [];
  const uniqueStationsCount = validStationsList.length > 0
    ? validStationsList.length
    : new Set(records.map((r) => r.stationId).filter((id) => id && id !== 'CORRUPT_FRAME' && id !== 'UNKNOWN')).size;
  const hasActiveFilter = selectedStations.length > 0 || dateRange.start !== null || dateRange.end !== null;

  // Dynamically resolve start and end dates from filters or records
  let effectiveStartDate: Date | null = dateRange.start;
  let effectiveEndDate: Date | null = dateRange.end;
  if (!effectiveStartDate || !effectiveEndDate) {
    for (const r of records) {
      if (!effectiveStartDate || r.timestamp < effectiveStartDate) effectiveStartDate = r.timestamp;
      if (!effectiveEndDate || r.timestamp > effectiveEndDate) effectiveEndDate = r.timestamp;
    }
  }
  if (!effectiveStartDate && file.stats.startTime) effectiveStartDate = file.stats.startTime;
  if (!effectiveEndDate && file.stats.endTime) effectiveEndDate = file.stats.endTime;

  const dynamicPeriodText =
    effectiveStartDate && effectiveEndDate
      ? `${formatCwcDateShort(effectiveStartDate)} To ${formatCwcDateShort(effectiveEndDate)}`
      : 'Telemetry Reporting Period';

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgressPct(5);
    setExportProgressStage('Resolving export telemetry records...');
    setExportSuccessMsg(null);
    setExportErrorMsg(null);

    try {
      const {
        records: exportRecords,
        sourceFile,
        startDate,
        endDate,
      } = await getRecordsForExport(exportScope, (pct, stage) => {
        setExportProgressPct(pct);
        setExportProgressStage(stage);
      });

      if (!exportRecords || exportRecords.length === 0) {
        throw new Error('No telemetry records found matching the chosen criteria.');
      }

      const ext = activeFormat === 'excel' ? 'xlsx' : 'csv';
      const filename = generateExportFilename(
        exportScope === 'all_archive' && archiveCatalog
          ? archiveCatalog.folderName
          : file.filename,
        startDate || effectiveStartDate,
        endDate || effectiveEndDate,
        ext,
        reportMode === 'matrix' ? (flattenedCsv && ext === 'csv' ? 'flattened' : undefined) : 'records'
      );

      // Pass existing matrix model only if on single file without filters
      const existingMatrix =
        exportScope !== 'all_archive' && !hasActiveFilter
          ? ((sourceFile as any).matrixModel || null)
          : null;

      if (activeFormat === 'pdf') {
        exportToPdf(
          exportRecords,
          insatSensors,
          insatMSL,
          existingMatrix,
          startDate || effectiveStartDate,
          endDate || effectiveEndDate,
          exportScope === 'filtered' ? selectedStations : undefined
        );
        setExportSuccessMsg('Opening print / PDF dialog...');
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 1200);
        return;
      }

      if (activeFormat === 'excel') {
        await exportToExcel(
          exportRecords,
          filename,
          sections,
          insatSensors,
          insatMSL,
          reportMode,
          existingMatrix,
          startDate || effectiveStartDate,
          endDate || effectiveEndDate,
          exportScope === 'filtered' ? selectedStations : undefined,
          (pct, stage) => {
            setExportProgressPct(pct);
            setExportProgressStage(stage);
          }
        );
      } else {
        await exportToCsv(
          exportRecords,
          filename,
          sections,
          insatSensors,
          insatMSL,
          reportMode,
          flattenedCsv,
          existingMatrix,
          startDate || effectiveStartDate,
          endDate || effectiveEndDate,
          exportScope === 'filtered' ? selectedStations : undefined,
          (pct, stage) => {
            setExportProgressPct(pct);
            setExportProgressStage(stage);
          }
        );
      }

      setExportSuccessMsg(
        `Successfully generated and downloaded "${filename}" (${exportRecords.length.toLocaleString()} records)`
      );
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      console.error('Export error:', err);
      setExportErrorMsg(err instanceof Error ? err.message : 'Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(14px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 65px rgba(0, 0, 0, 0.75), 0 0 45px rgba(16, 185, 129, 0.08)',
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
            background:
              activeFormat === 'excel'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(34, 197, 94, 0.05))'
                : activeFormat === 'csv'
                ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(14, 165, 233, 0.05))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(244, 63, 94, 0.05))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '9px',
                background:
                  activeFormat === 'excel'
                    ? 'rgba(16, 185, 129, 0.22)'
                    : 'rgba(56, 189, 248, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  activeFormat === 'excel'
                    ? '0 0 16px rgba(16, 185, 129, 0.25)'
                    : '0 0 16px rgba(56, 189, 248, 0.25)',
              }}
            >
              {activeFormat === 'excel' ? (
                <FileSpreadsheet size={20} color="#10b981" />
              ) : (
                <FileText size={20} color="#38bdf8" />
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Export Telemetry Report
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Professional Central Receiving Station export for Central Water Commission
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="btn-secondary"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Format Selector Pills & Metrics */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Format Toggle Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveFormat('excel')}
              className={activeFormat === 'excel' ? 'btn-primary' : 'btn-secondary'}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: activeFormat === 'excel' ? '#10b981' : undefined,
                borderColor: activeFormat === 'excel' ? '#10b981' : undefined,
              }}
            >
              <FileSpreadsheet size={14} />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => setActiveFormat('csv')}
              className={activeFormat === 'csv' ? 'btn-primary' : 'btn-secondary'}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: activeFormat === 'csv' ? '#0ea5e9' : undefined,
                borderColor: activeFormat === 'csv' ? '#0ea5e9' : undefined,
              }}
            >
              <FileText size={14} />
              <span>CSV (.csv)</span>
            </button>
            <button
              onClick={() => setActiveFormat('pdf')}
              className={activeFormat === 'pdf' ? 'btn-primary' : 'btn-secondary'}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                background: activeFormat === 'pdf' ? '#ef4444' : undefined,
                borderColor: activeFormat === 'pdf' ? '#ef4444' : undefined,
              }}
            >
              <Printer size={14} />
              <span>PDF (.pdf)</span>
            </button>
          </div>

          {/* Quick Metrics Badge */}
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <strong style={{ color: 'var(--text-main)' }}>{uniqueStationsCount}</strong> Stations
            </span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
              }}
            >
              <strong style={{ color: 'var(--text-main)' }}>{records.length.toLocaleString()}</strong> Records
            </span>
            {hasActiveFilter && (
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: 'var(--primary-light)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ListFilter size={11} /> Filters Active
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Title Preview matching Official CWC Template */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>REPORT HEADER & DYNAMIC PERIOD PREVIEW</span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>Dynamic Synchronized</span>
          </div>
          <div
            style={{
              background: '#FFFFFF',
              color: '#000000',
              padding: '10px 14px',
              borderRadius: '6px',
              border: '2px solid #000000',
              textAlign: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#000000', letterSpacing: '-0.01em' }}>
              Telemetry Data Received at Central Receiving Station during
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#002060', marginTop: '3px' }}>
              {dynamicPeriodText}
            </div>
          </div>
        </div>

        {/* ─── Export Data Scope Selector (Phase 4: Zero Truncation Dual Modes) ─── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            SELECT DATA SCOPE (ZERO TRUNCATION)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Scope 1: Export All Archive Data */}
            <div
              onClick={() => setExportScope('all_archive')}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background:
                  exportScope === 'all_archive' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)',
                border:
                  exportScope === 'all_archive'
                    ? '1.5px solid #10b981'
                    : '1px solid var(--border)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: exportScope === 'all_archive' ? '5px solid #10b981' : '2px solid var(--text-dim)',
                  marginTop: '2px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                  Export All Archive Data
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  {archiveCatalog
                    ? `Every record across all ${archiveCatalog.totalFiles} files in the archive (${archiveCatalog.availableYears.length} year${archiveCatalog.availableYears.length > 1 ? 's' : ''})`
                    : 'Exports complete multi-year archive with zero truncation'}
                </div>
              </div>
            </div>

            {/* Scope 2: Export Current Filtered Data */}
            <div
              onClick={() => setExportScope('filtered')}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background:
                  exportScope === 'filtered' ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-surface)',
                border:
                  exportScope === 'filtered'
                    ? '1.5px solid var(--primary-light)'
                    : '1px solid var(--border)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: exportScope === 'filtered' ? '5px solid var(--primary-light)' : '2px solid var(--text-dim)',
                  marginTop: '2px',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                  Export Current Filtered Data
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  {activeArchiveRange
                    ? `Date range: ${activeArchiveRange.from} to ${activeArchiveRange.to} (${activeArchiveRange.count} files) • Respects active filters`
                    : archiveDateRange?.from && archiveDateRange?.to
                    ? `Date range: ${archiveDateRange.from} to ${archiveDateRange.to} • Respects active filters`
                    : hasActiveFilter
                    ? 'Respects active date range, station, and quality filters'
                    : 'Exports currently selected date / view filters'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Mode Selection (Matrix vs Flat) */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            SELECT REPORT LAYOUT
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Mode 1: CWC Multi-Station Matrix Report */}
            <div
              onClick={() => setReportMode('matrix')}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background:
                  reportMode === 'matrix' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                border:
                  reportMode === 'matrix'
                    ? '1.5px solid #10b981'
                    : '1px solid var(--border)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: reportMode === 'matrix' ? '5px solid #10b981' : '2px solid var(--text-dim)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <TableProperties size={14} color={reportMode === 'matrix' ? '#10b981' : 'var(--text-dim)'} />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                    CWC Multi-Station Matrix
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  Official format matching <strong>UYD NEW DELHI</strong>: multi-level headers, station groups, WIMS codes & hourly grid.
                </div>
              </div>
            </div>

            {/* Mode 2: Detailed Tabular Records */}
            <div
              onClick={() => setReportMode('flat')}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background:
                  reportMode === 'flat' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface)',
                border:
                  reportMode === 'flat'
                    ? '1.5px solid #38bdf8'
                    : '1px solid var(--border)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: reportMode === 'flat' ? '5px solid #38bdf8' : '2px solid var(--text-dim)',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <Building2 size={14} color={reportMode === 'flat' ? '#38bdf8' : 'var(--text-dim)'} />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                    Detailed Tabular Records
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.35 }}>
                  Granular record-by-record table for telemetry audits with customizable column sections.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area Based on Selected Mode */}
        {reportMode === 'matrix' ? (
          <div style={{ overflowY: 'auto', flex: 1, padding: '14px 20px' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-main)' }}>
                Professional Formatting Highlights Included:
              </div>
              <ul style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                <li><strong>Header Styling:</strong> White title background with bold black & royal blue text (`#002060`).</li>
                <li><strong>Station Groups:</strong> Highlighted station headers merged across sensor columns.</li>
                <li><strong>Hierarchy Preserved:</strong> Title, Station, Sensor, WIMS Code, Datalogger ID & Unit rows.</li>
                <li><strong>Cell Borders:</strong> Thin borders on all data cells with medium dividers separating station groups.</li>
                <li><strong>Data Usability:</strong> Alternating zebra row shading, auto-fit column widths, and frozen header/date columns.</li>
                <li><strong>Print Ready:</strong> Landscape orientation with automatic repeating header rows.</li>
              </ul>
            </div>

            {/* Standard Station Parameters Preview */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#10b981" />
                <span>Standard Station Parameters Included (TDMA Schema):</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                Each station column block contains calibrated engineering sensors matching CWC specifications:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {[
                  'AirTemp (s00)',
                  'Battery (c1)',
                  'Humidity (s07)',
                  'Pressure (s06)',
                  'RainDaily (c3)',
                  'Rainfall (c2)',
                  'Evaporation (s11)',
                  'SolarRad (s14)',
                  'WindDir (s05)',
                  'WindSpeed (s04)',
                  'WaterLevel (s08+s09)',
                ].map((param) => (
                  <span
                    key={param}
                    className="mono-font"
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontWeight: 500,
                    }}
                  >
                    {param}
                  </span>
                ))}
              </div>
            </div>

            {/* CSV Flattened Option */}
            {activeFormat === 'csv' && (
              <div
                onClick={() => setFlattenedCsv((prev) => !prev)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: flattenedCsv ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface)',
                  border: flattenedCsv ? '1px solid #38bdf8' : '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: flattenedCsv ? '2px solid #38bdf8' : '2px solid var(--text-dim)',
                    background: flattenedCsv ? '#38bdf8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {flattenedCsv && <Check size={12} color="white" strokeWidth={3} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-main)' }}>
                    Export Flattened CSV Headers
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Combines station and sensor into single header columns (e.g. <code>Baghpat - Rainfall (mm)</code>) for standard database ingestion.
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Flat Mode: Section Selectors */
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                fontSize: '0.73rem',
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>
                <strong style={{ color: 'var(--text-main)' }}>{enabledCount}</strong> sections selected (~{totalColEstimate} cols)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={selectAll} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.68rem' }}>
                  Select All
                </button>
                <button onClick={selectNone} className="btn-secondary" style={{ padding: '2px 8px', fontSize: '0.68rem' }}>
                  Clear All
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SECTION_INFO.map((section) => {
                const isOn = sections[section.key];
                return (
                  <div
                    key={section.key}
                    onClick={() => toggleSection(section.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isOn ? 'rgba(56, 189, 248, 0.06)' : 'var(--bg-surface)',
                      border: isOn ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: isOn ? '2px solid #38bdf8' : '2px solid var(--text-dim)',
                        background: isOn ? '#38bdf8' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      {isOn && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{ color: isOn ? '#38bdf8' : 'var(--text-dim)' }}>{section.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: isOn ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {section.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                        {section.desc}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {section.columns.map((col) => (
                          <span
                            key={col}
                            className="mono-font"
                            style={{
                              fontSize: '0.64rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isOn ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-subtle)',
                              color: isOn ? '#38bdf8' : 'var(--text-dim)',
                              border: isOn
                                ? '1px solid rgba(56, 189, 248, 0.28)'
                                : '1px solid rgba(148, 163, 184, 0.12)',
                              fontWeight: 500,
                              lineHeight: 1.25,
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
        )}

        {/* Real-time Export Progress Bar */}
        {isExporting && (
          <div style={{ padding: '12px 20px', background: 'rgba(2, 132, 199, 0.12)', borderTop: '1px solid var(--border-focus)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--primary-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={13} className="animate-spin" />
                <span>{exportProgressStage || 'Processing telemetry records...'}</span>
              </span>
              <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 700 }}>{exportProgressPct}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${exportProgressPct}%`,
                  background: 'linear-gradient(90deg, #0284c7, #10b981)',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Notifications */}
        {exportSuccessMsg && (
          <div
            style={{
              padding: '10px 20px',
              background: 'rgba(16, 185, 129, 0.15)',
              borderTop: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {exportErrorMsg && (
          <div
            style={{
              padding: '10px 20px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderTop: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{exportErrorMsg}</span>
          </div>
        )}

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
            disabled={isExporting}
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || (reportMode === 'flat' && enabledCount === 0)}
            className="btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '0.82rem',
              background: activeFormat === 'excel' ? '#10b981' : activeFormat === 'csv' ? '#0ea5e9' : '#ef4444',
              borderColor: activeFormat === 'excel' ? '#10b981' : activeFormat === 'csv' ? '#0ea5e9' : '#ef4444',
              opacity: isExporting || (reportMode === 'flat' && enabledCount === 0) ? 0.6 : 1,
            }}
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>{activeFormat === 'pdf' ? 'Preparing PDF...' : `Generating ${activeFormat.toUpperCase()}...`}</span>
              </>
            ) : activeFormat === 'pdf' ? (
              <>
                <Printer size={15} />
                <span>
                  Print / Save as PDF ({exportScope === 'all_archive' ? 'All Archive Data' : reportMode === 'matrix' ? 'Matrix' : `${records.length.toLocaleString()} Records`})
                </span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>
                  Download {activeFormat.toUpperCase()} ({exportScope === 'all_archive' ? 'All Archive Data' : reportMode === 'matrix' ? 'Matrix' : `${records.length.toLocaleString()} Records`})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
