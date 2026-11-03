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
  FolderArchive,
  Database,
} from 'lucide-react';

export function DateArchiveNavigator() {
  const {
    activeMode,
    archiveCatalog,
    archiveMergedFile,
    selectedArchiveDate,
    selectedArchiveFileId,
    loadArchiveFolder,
    selectArchiveDate,
    selectArchiveAll,
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

  // Case 1: Single File Mode or No Archive Folder Loaded
  if (activeMode === 'single' || !archiveCatalog || archiveCatalog.totalFiles === 0) {
    const singleDate = file?.stats?.startTime ? new Date(file.stats.startTime) : null;
    const singleDateKey = singleDate
      ? `${singleDate.getFullYear()}-${String(singleDate.getMonth() + 1).padStart(2, '0')}-${String(singleDate.getDate()).padStart(2, '0')}`
      : '';
    const singleDateDisplay = singleDate
      ? `${String(singleDate.getDate()).padStart(2, '0')}/${String(singleDate.getMonth() + 1).padStart(2, '0')}/${singleDate.getFullYear()}`
      : 'Single Day';

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
          border: '1px solid rgba(56, 189, 248, 0.3)',
          background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.85), rgba(17, 28, 53, 0.75))',
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

        {/* Left: Mode Badge & Single File Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Active Mode Pill Indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--primary-light)',
            }}
          >
            <FileText size={13} />
            <span>Single File Mode</span>
          </div>

          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mono-font" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {file.filename}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                ({file.records.length.toLocaleString()} records • {singleDateDisplay})
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              No telemetry file loaded
            </span>
          )}

          {/* Stepper (Disabled in Single File Mode with informative tooltip) */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.5 }}
            title="Single File Mode: To navigate between multiple dates, choose an Archive Folder containing multi-day .csd files"
          >
            <button className="btn-secondary" disabled style={{ padding: '4px 8px', height: '28px', cursor: 'not-allowed' }}>
              <ChevronLeft size={13} />
              <span style={{ fontSize: '0.7rem' }}>Prev Day</span>
            </button>
            <button className="btn-secondary" disabled style={{ padding: '4px 8px', height: '28px', cursor: 'not-allowed' }}>
              <span style={{ fontSize: '0.7rem' }}>Next Day</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Date Selector (Displaying Single File Date) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} color="var(--primary-light)" />
            <input
              type="date"
              value={singleDateKey}
              readOnly
              disabled
              title="Single File Date (Switch to Multi-Year Archive to navigate any date)"
              className="text-input mono-font"
              style={{
                padding: '3px 8px',
                fontSize: '0.74rem',
                fontWeight: 600,
                height: '28px',
                width: '130px',
                opacity: 0.8,
                cursor: 'default',
              }}
            />
          </div>
        </div>

        {/* Right: Prominent Multi-Year Archive Chooser Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
            }}
            title="Select a folder containing 1 or multiple years of CSD telemetry files"
          >
            <FolderOpen size={14} />
            <span>Choose CSD Archive Folder</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Multi-Year Archive Mode
  const filesOnSelectedDate = selectedArchiveDate
    ? archiveCatalog.dateFileMap[selectedArchiveDate] || []
    : [];

  const activeFileInfo = filesOnSelectedDate.find((f) => f.id === selectedArchiveFileId) || filesOnSelectedDate[0];
  const currentYear = selectedArchiveDate
    ? parseInt(selectedArchiveDate.split('-')[0], 10)
    : archiveCatalog.availableYears[archiveCatalog.availableYears.length - 1] || archiveCatalog.availableYears[0];

  const handleYearChange = (yr: number) => {
    const matchingDates = archiveCatalog.availableDateKeys.filter((k) => k.startsWith(`${yr}-`));
    if (matchingDates.length > 0) {
      selectArchiveDate(matchingDates[matchingDates.length - 1]);
    }
  };

  const isViewingAll = selectedArchiveDate === null;

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
        border: '1px solid rgba(16, 185, 129, 0.35)',
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

      {/* Left: Mode Badge, Folder Context & Steppers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Active Mode Pill Indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: 'var(--quality-good)',
          }}
          title={`Multi-Year Archive Mode: ${archiveCatalog.totalFiles} files across ${archiveCatalog.availableYears.length} years (${archiveCatalog.availableYears.join(', ')})`}
        >
          <FolderArchive size={13} />
          <span>Multi-Year Archive Mode</span>
        </div>

        {/* Change Folder Button */}
        <button
          onClick={() => folderInputRef.current?.click()}
          className="btn-secondary"
          style={{ padding: '5px 9px', fontSize: '0.74rem' }}
          title="Change or re-select folder"
        >
          <FolderOpen size={13} color="var(--primary-light)" />
          <span style={{ fontWeight: 600 }}>{archiveCatalog.folderName}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            ({archiveCatalog.totalFiles} files • {archiveCatalog.availableYears.length} Yrs)
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
                padding: '3px 8px',
                fontSize: '0.74rem',
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

        {/* View All (Merged) Toggle Button */}
        <button
          onClick={selectArchiveAll}
          className={isViewingAll ? 'btn-primary' : 'btn-secondary'}
          style={{
            padding: '4px 10px',
            fontSize: '0.72rem',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: isViewingAll ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
            borderColor: isViewingAll ? '#10b981' : undefined,
          }}
          title="View all records merged across all dates in this multi-year archive"
        >
          <Layers size={13} />
          <span>{isViewingAll ? 'All Dates Merged' : 'View All Dates'}</span>
        </button>
      </div>

      {/* Right: Available Files on Date & Explorer Modal Launcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Available Files on Date dropdown */}
        {selectedArchiveDate && filesOnSelectedDate.length > 0 && (
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
