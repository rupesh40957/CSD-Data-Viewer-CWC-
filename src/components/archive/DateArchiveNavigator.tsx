'use client';

import React, { useRef } from 'react';
import { useAppStore } from '@/store/use-app-store';
import {
  FolderOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export function DateArchiveNavigator() {
  const {
    archiveCatalog,
    selectedArchiveDate,
    selectedArchiveFileId,
    loadArchiveFolder,
    selectArchiveDate,
    loadArchiveFile,
    navigateArchiveDate,
    setIsArchiveModalOpen,
    isLoading,
    file,
  } = useAppStore();

  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Detect folder name from first relative path if possible
    const firstRel = files[0]?.webkitRelativePath || '';
    const folderName = firstRel.split('/')[0] || 'CSD Multi-Year Archive';

    await loadArchiveFolder(Array.from(files), folderName);
    setIsArchiveModalOpen(true);
  };

  // If no archive folder loaded yet, display a sleek quick-loader banner
  if (!archiveCatalog || archiveCatalog.totalFiles === 0) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px dashed rgba(56, 189, 248, 0.35)',
          background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.75), rgba(17, 28, 53, 0.6))',
        }}
      >
        <input
          type="file"
          ref={folderInputRef}
          // @ts-expect-error webkitdirectory is standard in browsers
          webkitdirectory="true"
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderChange}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <FolderOpen size={17} color="var(--primary-light)" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Multi-Year CSD Telemetry Archive
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Load a folder with 1, 2, 5+ years of .csd files to browse by date and switch files dynamically
            </div>
          </div>
        </div>

        <button
          onClick={() => folderInputRef.current?.click()}
          className="btn-primary"
          style={{ padding: '7px 14px', fontSize: '0.78rem' }}
        >
          <FolderOpen size={14} />
          <span>Choose Archive Folder</span>
        </button>
      </div>
    );
  }

  // Active files on currently selected date
  const filesOnSelectedDate = selectedArchiveDate
    ? archiveCatalog.dateFileMap[selectedArchiveDate] || []
    : [];

  const activeFileInfo = filesOnSelectedDate.find((f) => f.id === selectedArchiveFileId) || filesOnSelectedDate[0];

  // Selected date components
  const currentYear = selectedArchiveDate ? parseInt(selectedArchiveDate.split('-')[0], 10) : archiveCatalog.availableYears[0];

  const handleYearChange = (yr: number) => {
    // Find earliest or latest date matching this year
    const matchingDates = archiveCatalog.availableDateKeys.filter((k) => k.startsWith(`${yr}-`));
    if (matchingDates.length > 0) {
      selectArchiveDate(matchingDates[0]);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        border: '1px solid var(--border-focus)',
        background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.85), rgba(17, 28, 53, 0.75))',
      }}
    >
      <input
        type="file"
        ref={folderInputRef}
        // @ts-expect-error webkitdirectory
        webkitdirectory="true"
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderChange}
      />

      {/* Left: Folder Context & Year Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => folderInputRef.current?.click()}
          className="btn-secondary"
          style={{ padding: '5px 9px', fontSize: '0.74rem' }}
          title="Change or re-select folder"
        >
          <FolderOpen size={13} color="var(--primary-light)" />
          <span style={{ fontWeight: 600 }}>{archiveCatalog.folderName}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            ({archiveCatalog.totalFiles} files)
          </span>
        </button>

        {/* Dynamic Year Dropdown */}
        {archiveCatalog.availableYears.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>YEAR:</span>
            <select
              value={currentYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="text-input"
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: 'var(--primary-light)',
                background: 'var(--bg-surface)',
                height: '30px',
              }}
            >
              {archiveCatalog.availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stepper: Prev Date / Next Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => navigateArchiveDate('prev')}
            className="btn-secondary"
            style={{ padding: '5px 8px', height: '30px' }}
            title="Jump to previous date with CSD telemetry"
          >
            <ChevronLeft size={14} />
            <span style={{ fontSize: '0.72rem' }}>Prev Day</span>
          </button>

          <button
            onClick={() => navigateArchiveDate('next')}
            className="btn-secondary"
            style={{ padding: '5px 8px', height: '30px' }}
            title="Jump to next date with CSD telemetry"
          >
            <span style={{ fontSize: '0.72rem' }}>Next Day</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Date Selector Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="var(--primary-light)" />
          <input
            type="date"
            value={selectedArchiveDate || ''}
            min={archiveCatalog.minDate || undefined}
            max={archiveCatalog.maxDate || undefined}
            onChange={(e) => {
              if (e.target.value) {
                selectArchiveDate(e.target.value);
              }
            }}
            className="text-input mono-font"
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              height: '30px',
              width: '135px',
            }}
          />
        </div>
      </div>

      {/* Right: Available Files on Date & Explorer Modal Launcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Available Files on Date dropdown */}
        {filesOnSelectedDate.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              FILES ({filesOnSelectedDate.length}):
            </span>
            <select
              value={activeFileInfo?.id}
              onChange={(e) => {
                const chosen = filesOnSelectedDate.find((f) => f.id === e.target.value);
                if (chosen) loadArchiveFile(chosen);
              }}
              disabled={isLoading}
              className="text-input mono-font"
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text-main)',
                background: 'var(--bg-surface)',
                height: '30px',
                maxWidth: '220px',
              }}
            >
              {filesOnSelectedDate.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.formattedSize})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span style={{ fontSize: '0.74rem', color: 'var(--quality-corrupt)', fontWeight: 500 }}>
            No .csd files found on this date
          </span>
        )}

        {/* Full Archive Calendar / Explorer Modal Button */}
        <button
          onClick={() => setIsArchiveModalOpen(true)}
          className="btn-secondary"
          style={{
            padding: '5px 11px',
            fontSize: '0.75rem',
            background: 'rgba(56, 189, 248, 0.1)',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            color: 'var(--primary-light)',
            height: '30px',
          }}
          title="Open Full Multi-Year Calendar & Archive Explorer"
        >
          <SlidersHorizontal size={13} />
          <span>Calendar Explorer</span>
        </button>
      </div>
    </div>
  );
}
