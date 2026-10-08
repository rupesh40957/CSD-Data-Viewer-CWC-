'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore, selectFilteredRecords } from '@/store/use-app-store';
import {
  Activity,
  Table as TableIcon,
  LineChart,
  FileCode,
  Sun,
  Moon,
  Upload,
  Download,
  Database,
  CheckCircle,
  AlertTriangle,
  Settings,
  FolderOpen,
  Radio,
  Calendar,
} from 'lucide-react';
import { ExportOptionsModal } from '@/components/export/ExportOptionsModal';

export function Header() {
  const pathname = usePathname();
  const {
    file,
    theme,
    toggleTheme,
    parseFileBuffer,
    isLoading,
    setIsSettingsOpen,
    setIsImportModalOpen,
    setIsArchiveModalOpen,
    archiveCatalog,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');

  const navItems = [
    { label: 'Overview', href: '/', icon: Activity },
    { label: 'Data Table', href: '/table', icon: TableIcon },
    { label: 'Charts & Trends', href: '/charts', icon: LineChart },
    { label: 'Raw Telemetry', href: '/raw', icon: FileCode },
  ];

  const handleExportExcel = () => {
    setExportFormat('excel');
    setExportModalOpen(true);
  };

  const handleExportCsv = () => {
    setExportFormat('csv');
    setExportModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        parseFileBuffer(buffer, f.name, f.size);
      }
    };
    reader.readAsArrayBuffer(f);
    e.target.value = ''; // Reset input
  };

  return (
    <>
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Hidden File Input for header Load File */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csd,.txt"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Brand & Dataset Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
            }}
          >
            <Database size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.08rem', letterSpacing: '-0.02em' }}>
                CSD Data Viewer
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Hydrometeorological & Industrial AWS Telemetry
            </div>
          </div>
        </div>

        {/* Dataset Status Tag */}
        {file ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
            }}
          >
            <span className="live-indicator" />
            <span className="mono-font" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {file.filename}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {file.records.length.toLocaleString()} records
            </span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--primary-light)' }}>
              {file.stats.uniqueStations} stations
            </span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--quality-good)', fontWeight: 600 }}>
              {((file.stats.goodRecords / file.stats.totalRecords) * 100).toFixed(1)}% Valid
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-dim)',
            }}
          >
            <AlertTriangle size={14} color="#f59e0b" />
            <span>No telemetry file loaded</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: '0.84rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? (theme === 'dark' ? '#ffffff' : 'var(--primary)') : 'var(--text-muted)',
                background: isActive
                  ? theme === 'dark'
                    ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.35), rgba(6, 182, 212, 0.2))'
                    : 'rgba(2, 132, 199, 0.12)'
                  : 'transparent',
                border: isActive
                  ? '1px solid var(--border-focus)'
                  : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--primary-light)' : 'currentColor'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Action Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Load File button */}
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="btn-secondary"
          title="Import or replace .csd telemetry file"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          <FolderOpen size={14} color="var(--primary-light)" />
          <span>Load File</span>
        </button>

        {/* Date Archive button */}
        <button
          onClick={() => setIsArchiveModalOpen(true)}
          className="btn-secondary"
          title="Browse multi-year CSD telemetry date archive"
          style={{
            padding: '6px 12px',
            fontSize: '0.8rem',
            background: archiveCatalog && archiveCatalog.totalFiles > 0 ? 'rgba(56, 189, 248, 0.12)' : undefined,
            borderColor: archiveCatalog && archiveCatalog.totalFiles > 0 ? 'rgba(56, 189, 248, 0.4)' : undefined,
            color: archiveCatalog && archiveCatalog.totalFiles > 0 ? 'var(--primary-light)' : undefined,
          }}
        >
          <Calendar size={14} color="var(--primary-light)" />
          <span>
            {archiveCatalog && archiveCatalog.totalFiles > 0
              ? `Archive (${archiveCatalog.availableYears.length} Yrs)`
              : 'Date Archive'}
          </span>
        </button>

        {file && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleExportExcel}
              className="btn-secondary"
              title="Export filtered records to Excel"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Download size={14} color="#10b981" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-secondary"
              title="Export filtered records to CSV"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Download size={14} color="#38bdf8" />
              <span>CSV</span>
            </button>
          </div>
        )}

        {/* Settings button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn-secondary"
          style={{ padding: '8px', borderRadius: 'var(--radius-md)' }}
          title="Telemetry Parameter & Channel Mapping Settings"
        >
          <Settings size={16} color="var(--text-muted)" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-secondary"
          style={{ padding: '8px', borderRadius: '50%' }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#3b82f6" />}
        </button>
      </div>
    </header>
      <ExportOptionsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        format={exportFormat}
      />
    </>
  );
}
