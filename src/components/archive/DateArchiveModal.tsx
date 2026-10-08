'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/use-app-store';
import {
  X,
  FolderOpen,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  Layers,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Sparkles,
} from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function DateArchiveModal() {
  const router = useRouter();
  const {
    archiveCatalog,
    selectedArchiveDate,
    selectedArchiveFileId,
    loadArchiveFolder,
    selectArchiveDate,
    loadArchiveFile,
    isArchiveModalOpen,
    setIsArchiveModalOpen,
    isLoading,
  } = useAppStore();

  const folderInputRef = useRef<HTMLInputElement>(null);

  // Local state for Year and Month viewing in the modal
  const defaultYear = selectedArchiveDate
    ? parseInt(selectedArchiveDate.split('-')[0], 10)
    : archiveCatalog?.availableYears[archiveCatalog.availableYears.length - 1] || new Date().getFullYear();

  const defaultMonth = selectedArchiveDate
    ? parseInt(selectedArchiveDate.split('-')[1], 10)
    : 1;

  const [viewYear, setViewYear] = useState<number>(defaultYear);
  const [viewMonth, setViewMonth] = useState<number>(defaultMonth);

  // Sync year and month view when catalog loads or selected date changes
  useEffect(() => {
    if (selectedArchiveDate) {
      const parts = selectedArchiveDate.split('-');
      if (parts.length >= 2) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10));
      }
    } else if (archiveCatalog?.availableYears.length) {
      const latestYr = archiveCatalog.availableYears[archiveCatalog.availableYears.length - 1];
      setViewYear(latestYr);
      const months = archiveCatalog.yearMonthsMap[latestYr] || [1];
      setViewMonth(months[months.length - 1] || 1);
    }
  }, [selectedArchiveDate, archiveCatalog]);

  if (!isArchiveModalOpen) return null;

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstRel = files[0]?.webkitRelativePath || '';
    const folderName = firstRel.split('/')[0] || 'CSD Multi-Year Archive';

    loadArchiveFolder(Array.from(files), folderName);
    e.target.value = '';
  };

  // Days in month calculation
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysCount = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 = Sunday

  // Active files on currently selected date
  const filesOnSelectedDate = selectedArchiveDate && archiveCatalog
    ? archiveCatalog.dateFileMap[selectedArchiveDate] || []
    : [];

  const handleDayClick = (day: number) => {
    const dateKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    selectArchiveDate(dateKey);
  };

  const handleSelectAndOpenTable = async (fileInfo: typeof filesOnSelectedDate[0]) => {
    await loadArchiveFile(fileInfo);
    setIsArchiveModalOpen(false);
    router.push('/table');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={() => setIsArchiveModalOpen(false)}
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

      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '92vh',
          background: 'var(--bg-app)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div
          style={{
            padding: '16px 22px',
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.3), rgba(6, 182, 212, 0.3))',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} color="var(--primary-light)" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Multi-Year CSD Telemetry Archive Explorer
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {archiveCatalog
                  ? `Archive: "${archiveCatalog.folderName}" • ${archiveCatalog.totalFiles} files detected across ${archiveCatalog.availableYears.length} year(s)`
                  : 'Select any folder containing 1, 2, 5+ years of .csd telemetry files'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
            >
              <FolderOpen size={14} color="var(--primary-light)" />
              <span>{archiveCatalog ? 'Change Folder' : 'Select Folder'}</span>
            </button>

            <button
              onClick={() => setIsArchiveModalOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        {!archiveCatalog || archiveCatalog.totalFiles === 0 ? (
          /* Empty / Initial Folder Picker Prompt */
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div
              onClick={() => folderInputRef.current?.click()}
              style={{
                maxWidth: '520px',
                margin: '0 auto',
                border: '2px dashed rgba(56, 189, 248, 0.35)',
                borderRadius: 'var(--radius-lg)',
                padding: '44px 24px',
                background: 'rgba(17, 28, 53, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <FolderOpen size={42} color="var(--primary-light)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Choose Your Telemetry Folder
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
                Select a folder on your computer storing 1 year, 2 years, or multiple years of <code>.csd</code> files.
                All years and dates will be detected automatically.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="btn-primary"
                style={{ padding: '10px 20px' }}
              >
                <FolderOpen size={16} />
                <span>Browse Folder</span>
              </button>
            </div>
          </div>
        ) : (
          /* Main Multi-Year Calendar & Files View */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 340px',
              minHeight: '480px',
              overflowY: 'auto',
            }}
          >
            {/* Left: Dynamic Year Tabs, Month Chooser & Calendar Grid */}
            <div style={{ padding: '20px', borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
              {/* Dynamic Year Pills */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  DETECTED YEARS ({archiveCatalog.availableYears.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {archiveCatalog.availableYears.map((yr) => {
                    const isSelectedYear = viewYear === yr;
                    return (
                      <button
                        key={yr}
                        onClick={() => {
                          setViewYear(yr);
                          const months = archiveCatalog.yearMonthsMap[yr] || [1];
                          setViewMonth(months[0] || 1);
                        }}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelectedYear
                            ? '1px solid var(--primary-light)'
                            : '1px solid var(--border)',
                          background: isSelectedYear
                            ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.35), rgba(6, 182, 212, 0.2))'
                            : 'var(--bg-surface)',
                          color: isSelectedYear ? '#ffffff' : 'var(--text-muted)',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelectedYear ? '0 0 14px rgba(56, 189, 248, 0.25)' : 'none',
                        }}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Month Selector Pills */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                  MONTHS IN {viewYear}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                  {MONTH_NAMES.map((mName, mIdx) => {
                    const mNum = mIdx + 1;
                    const isSelectedMonth = viewMonth === mNum;
                    const hasDataInMonth = (archiveCatalog.yearMonthsMap[viewYear] || []).includes(mNum);

                    return (
                      <button
                        key={mName}
                        onClick={() => setViewMonth(mNum)}
                        style={{
                          padding: '6px 4px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: isSelectedMonth ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'center',
                          border: isSelectedMonth
                            ? '1px solid var(--primary-light)'
                            : '1px solid var(--border)',
                          background: isSelectedMonth
                            ? 'var(--primary)'
                            : hasDataInMonth
                            ? 'var(--bg-surface)'
                            : 'rgba(15, 23, 42, 0.3)',
                          color: isSelectedMonth
                            ? '#ffffff'
                            : hasDataInMonth
                            ? 'var(--text-main)'
                            : 'var(--text-dim)',
                          opacity: hasDataInMonth ? 1 : 0.45,
                        }}
                      >
                        {mName.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Grid for ViewYear & ViewMonth */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {MONTH_NAMES[viewMonth - 1]} {viewYear}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Click any highlighted day to inspect telemetry files
                  </div>
                </div>

                {/* Day-of-week header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {/* Empty cells before day 1 */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ height: '38px' }} />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: daysCount }).map((_, i) => {
                    const day = i + 1;
                    const dateKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const filesOnDay = archiveCatalog.dateFileMap[dateKey] || [];
                    const hasFiles = filesOnDay.length > 0;
                    const isSelected = selectedArchiveDate === dateKey;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => handleDayClick(day)}
                        disabled={!hasFiles}
                        style={{
                          height: '38px',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: hasFiles ? 'pointer' : 'default',
                          border: isSelected
                            ? '2px solid var(--primary-light)'
                            : hasFiles
                            ? '1px solid rgba(16, 185, 129, 0.4)'
                            : '1px solid transparent',
                          background: isSelected
                            ? 'var(--primary-glow)'
                            : hasFiles
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'transparent',
                          color: isSelected
                            ? '#ffffff'
                            : hasFiles
                            ? 'var(--text-main)'
                            : 'var(--text-dim)',
                          opacity: hasFiles ? 1 : 0.3,
                          position: 'relative',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <span style={{ fontSize: '0.78rem', fontWeight: hasFiles ? 700 : 400 }}>{day}</span>
                        {hasFiles && (
                          <span
                            style={{
                              fontSize: '0.6rem',
                              color: 'var(--quality-good)',
                              fontWeight: 600,
                              lineHeight: 1,
                            }}
                          >
                            {filesOnDay.length} {filesOnDay.length === 1 ? 'file' : 'files'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Files on Selected Date Panel */}
            <div style={{ padding: '20px', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                  SELECTED DATE
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: '2px' }}>
                  {selectedArchiveDate
                    ? (() => {
                        const parts = selectedArchiveDate.split('-');
                        const d = parts[2];
                        const m = parseInt(parts[1], 10);
                        const y = parts[0];
                        return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
                      })()
                    : 'No Date Selected'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ISO: {selectedArchiveDate || '--'}
                </div>
              </div>

              {/* Files List */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filesOnSelectedDate.length === 0 ? (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Calendar size={28} color="var(--text-dim)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>No telemetry files on this date</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Please click on a highlighted green day in the calendar.
                    </div>
                  </div>
                ) : (
                  filesOnSelectedDate.map((f) => {
                    const isActive = f.id === selectedArchiveFileId;
                    return (
                      <div
                        key={f.id}
                        style={{
                          padding: '12px',
                          borderRadius: 'var(--radius-md)',
                          border: isActive
                            ? '1px solid var(--primary-light)'
                            : '1px solid var(--border)',
                          background: isActive
                            ? 'rgba(56, 189, 248, 0.12)'
                            : 'var(--bg-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className="mono-font" style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-main)' }}>
                            {f.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: '4px' }}>
                            {f.formattedSize}
                          </span>
                        </div>

                        {f.timeTag && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--primary-light)' }}>
                            <Clock size={11} />
                            <span>{f.timeTag}</span>
                          </div>
                        )}

                        <button
                          onClick={() => handleSelectAndOpenTable(f)}
                          disabled={isLoading}
                          className={isActive ? 'btn-primary' : 'btn-secondary'}
                          style={{
                            marginTop: '4px',
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            width: '100%',
                            justifyContent: 'center',
                          }}
                        >
                          <span>{isActive ? 'Active File in Table' : 'Open in Data Table'}</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
