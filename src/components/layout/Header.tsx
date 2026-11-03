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
  Printer,
  Download,
  Database,
  CheckCircle,
  Settings,
  FolderOpen,
  FolderArchive,
  FileText,
  Radio,
} from 'lucide-react';
import { ExportOptionsModal } from '@/components/export/ExportOptionsModal';
import { CsdLogo } from '@/components/common/CsdLogo';

export function Header() {
  const pathname = usePathname();
  const {
    file,
    activeMode,
    archiveCatalog,
    theme,
    toggleTheme,
    parseFileBuffer,
    isLoading,
    setIsSettingsOpen,
    setIsImportModalOpen,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');

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

  const handleExportPdf = () => {
    setExportFormat('pdf');
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
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <CsdLogo
            variant="emblem"
            height={36}
            style={{
              display: 'block',
              flexShrink: 0,
              filter: theme === 'dark' ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.35))' : 'none',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.14rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-main)',
                  lineHeight: 1.2,
                }}
              >
                CSD Data Viewer
              </span>
            </div>
            <div
              style={{
                fontSize: '0.74rem',
                color: 'var(--text-dim)',
                fontWeight: 500,
                lineHeight: 1.2,
                marginTop: '2px',
              }}
            >
              Vision of connectivity • AWS Telemetry
            </div>
          </div>
        </Link>

        {file && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.74rem',
            }}
          >
            {activeMode === 'archive' && archiveCatalog ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--quality-good)',
                  fontWeight: 600,
                }}
                title={`Multi-Year Archive Mode: ${archiveCatalog.totalFiles} files across ${archiveCatalog.availableYears.length} years (${archiveCatalog.availableYears.join(', ')})`}
              >
                <FolderArchive size={13} color="var(--quality-good)" />
                <span>Multi-Year Archive Mode</span>
                <span style={{ color: 'var(--text-dim)' }}>•</span>
                <span className="mono-font" style={{ color: 'var(--text-main)' }}>
                  {archiveCatalog.totalFiles} files ({archiveCatalog.availableYears.length} Yrs)
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--primary-light)',
                  fontWeight: 600,
                }}
                title={`Single File Mode: ${file.filename}`}
              >
                <FileText size={13} color="var(--primary-light)" />
                <span>Single File Mode</span>
                <span style={{ color: 'var(--text-dim)' }}>•</span>
                <span className="mono-font" style={{ color: 'var(--text-main)' }}>
                  {file.filename}
                </span>
              </div>
            )}
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

        {file && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportExcel}
              className="btn-secondary"
              title="Download formatted CWC Excel report (.xlsx)"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                background: 'rgba(16, 185, 129, 0.08)',
              }}
            >
              <Download size={14} color="#10b981" />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-secondary"
              title="Download CWC CSV report (.csv)"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'rgba(56, 189, 248, 0.08)',
              }}
            >
              <Download size={14} color="#38bdf8" />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>CSV (.csv)</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="btn-secondary"
              title="Print / Save CWC report as PDF (.pdf)"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
            >
              <Printer size={14} color="#ef4444" />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>PDF (.pdf)</span>
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
