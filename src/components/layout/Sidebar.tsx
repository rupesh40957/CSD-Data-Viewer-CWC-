'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/use-app-store';
import {
  Database,
  Radio,
  Search,
  CheckSquare,
  Square,
  Filter,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  Activity,
  Table as TableIcon,
  LineChart,
  ShieldCheck,
  FileCode,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Info,
  FolderTree,
  List,
  UploadCloud,
  FolderOpen,
  GripVertical,
  PanelLeftClose,
  PanelLeft,
  X,
  ArrowLeftRight,
  Trash2,
  Settings,
  Folder,
  HardDrive,
  Check,
} from 'lucide-react';
import { StationHierarchyTree } from '@/components/stations/StationHierarchyTree';

/* ─────────────────────────────────────────────────────────────
   MongoDB Atlas Collapsible Category Section
   ───────────────────────────────────────────────────────────── */
function AtlasSection({
  title,
  icon: Icon,
  badge,
  defaultOpen = true,
  children,
  actionButton,
}: {
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        borderBottom: '1px solid var(--atlas-border)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 8px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          background: open ? 'rgba(0, 237, 100, 0.02)' : 'transparent',
          transition: 'background 0.15s ease',
        }}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = open ? 'rgba(0, 237, 100, 0.02)' : 'transparent')
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon size={14} color="var(--atlas-green)" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--atlas-green)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
          {actionButton}
          {badge !== undefined && (
            <span
              style={{
                fontSize: '0.62rem',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: 'rgba(0, 237, 100, 0.12)',
                color: 'var(--atlas-green)',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {badge}
            </span>
          )}
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: 'var(--atlas-text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronRight
              size={13}
              style={{
                transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
        </div>
      </div>

      <div
        style={{
          maxHeight: open ? '3000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease-in-out',
        }}
      >
        <div style={{ padding: '4px 12px 12px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MongoDB Atlas Empty State (Upload & Path Chooser)
   ───────────────────────────────────────────────────────────── */
function AtlasEmptyState({
  onChooseFile,
  onChooseFolder,
  onOpenPathModal,
}: {
  onChooseFile: () => void;
  onChooseFolder: () => void;
  onOpenPathModal: () => void;
}) {
  const { isLoading, parseProgress } = useAppStore();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      {/* Atlas Cluster Icon */}
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(0, 237, 100, 0.12), rgba(0, 104, 74, 0.25))',
          border: '1px solid rgba(0, 237, 100, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0, 237, 100, 0.15)',
        }}
      >
        <Database size={26} color="var(--atlas-green)" />
      </div>

      <div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--atlas-text-primary)', marginBottom: '4px' }}>
          No Telemetry Connected
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--atlas-text-secondary)', lineHeight: 1.5, maxWidth: '240px' }}>
          Select a <code style={{ color: 'var(--atlas-green)', fontFamily: 'var(--font-mono)' }}>.csd</code> file or browse a local directory path to begin telemetry analysis.
        </div>
      </div>

      {isLoading ? (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(0, 237, 100, 0.08)',
            border: '1px solid rgba(0, 237, 100, 0.2)',
            fontSize: '0.74rem',
            color: 'var(--atlas-green)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid #00ed64',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span>{parseProgress || 'Processing CSD telemetry...'}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '220px' }}>
          {/* File Upload Button */}
          <button
            onClick={onChooseFile}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '6px',
              background: 'var(--atlas-green-dark)',
              color: '#ffffff',
              border: '1px solid #00ed64',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 104, 74, 0.4)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--atlas-green-dark)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--atlas-green-dark)')}
          >
            <UploadCloud size={15} color="var(--atlas-green)" />
            <span>Upload CSD File</span>
          </button>

          {/* Directory Chooser Button */}
          <button
            onClick={onChooseFolder}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--atlas-card)',
              color: 'var(--atlas-text-primary)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--atlas-green)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
          >
            <FolderOpen size={14} color="var(--atlas-green)" />
            <span>Choose Folder</span>
          </button>

          {/* Enter Path Button */}
          <button
            onClick={onOpenPathModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '7px 12px',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--atlas-text-secondary)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              fontSize: '0.72rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--atlas-text-primary)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--atlas-text-secondary)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            <HardDrive size={13} />
            <span>Enter Path / URL</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Path Input / Folder Scan Selector Modal
   ───────────────────────────────────────────────────────────── */
function PathSelectorModal({
  isOpen,
  onClose,
  discoveredFiles,
  onSelectFile,
}: {
  isOpen: boolean;
  onClose: () => void;
  discoveredFiles: File[];
  onSelectFile: (file: File) => void;
}) {
  const { parseFileBuffer } = useAppStore();
  const [manualPath, setManualPath] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchPathOrUrl = async () => {
    if (!manualPath.trim()) return;
    setErrorMsg(null);
    setIsFetchingUrl(true);
    try {
      const res = await fetch(manualPath.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const buffer = await res.arrayBuffer();
      const filename = manualPath.trim().split('/').pop()?.split('\\').pop() || 'telemetry.csd';
      parseFileBuffer(buffer, filename, buffer.byteLength);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch path';
      setErrorMsg(`Failed to load: ${msg}. If this is a local path on your Windows disk, please use the "Browse Folder / File" button.`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 14, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--atlas-bg)',
          border: '1px solid rgba(0, 237, 100, 0.25)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 237, 100, 0.1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--atlas-border)',
            background: 'var(--atlas-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={18} color="var(--atlas-green)" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--atlas-text-primary)' }}>
              Choose Dataset Path or Folder
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--atlas-text-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {discoveredFiles.length > 0 ? (
            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--atlas-green)', fontWeight: 600, marginBottom: '8px' }}>
                Found {discoveredFiles.length} CSD File(s) in Selected Folder:
              </div>
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '4px',
                }}
              >
                {discoveredFiles.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    onClick={() => {
                      onSelectFile(f);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--atlas-surface)',
                      border: '1px solid var(--atlas-border)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--atlas-green)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--atlas-border)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={15} color="var(--atlas-green)" />
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--atlas-text-primary)', fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--atlas-text-secondary)' }}>
                          {(f.size / 1024).toFixed(1)} KB • {f.webkitRelativePath || 'Local File'}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--atlas-green)', fontWeight: 600 }}>Load &rarr;</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--atlas-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Enter Server Path or URL
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="/data/telemetry.csd or https://..."
                  value={manualPath}
                  onChange={(e) => setManualPath(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--atlas-surface)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--atlas-text-primary)',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFetchPathOrUrl();
                  }}
                />
                <button
                  onClick={handleFetchPathOrUrl}
                  disabled={isFetchingUrl || !manualPath.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--atlas-green-dark)',
                    color: '#ffffff',
                    border: '1px solid #00ed64',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: isFetchingUrl ? 'wait' : 'pointer',
                  }}
                >
                  {isFetchingUrl ? 'Loading...' : 'Fetch'}
                </button>
              </div>

              {errorMsg && (
                <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#ef4444' }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main MongoDB Atlas Sidebar Component
   ───────────────────────────────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();
  const {
    file,
    clearFile,
    parseFileBuffer,
    selectedStations,
    toggleStation,
    selectAllStations,
    clearStationSelection,
    qualityFilter,
    setQualityFilter,
    statusFilter,
    toggleStatusFilter,
    recordTypeFilter,
    toggleRecordTypeFilter,
    dateRange,
    setDateRange,
    clearDateRange,
    resetFilters,
    stationMasterMap,
    setSelectedStationIdForDetails,
    setIsUnmappedModalOpen,
    stationViewMode,
    setStationViewMode,
    sidebarPosition,
    setSidebarPosition,
    sidebarWidth,
    setSidebarWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [prefixFilter, setPrefixFilter] = useState('ALL');
  const [pathModalOpen, setPathModalOpen] = useState(false);
  const [discoveredFiles, setDiscoveredFiles] = useState<File[]>([]);

  // Hidden file & directory input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Resize drag handle state
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(sidebarWidth);

  const MIN_WIDTH = 250;
  const MAX_WIDTH = 550;

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [sidebarWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = sidebarPosition === 'right' ? startX.current - e.clientX : e.clientX - startX.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarPosition, setSidebarWidth]);

  // Handle single file selection
  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    e.target.value = '';
  };

  // Handle directory selection
  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const csdFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      const lower = fileItem.name.toLowerCase();
      if (lower.endsWith('.csd') || lower.endsWith('.txt')) {
        csdFiles.push(fileItem);
      }
    }

    if (csdFiles.length === 1) {
      // Single file found, load directly
      const single = csdFiles[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) {
          parseFileBuffer(buffer, single.name, single.size);
        }
      };
      reader.readAsArrayBuffer(single);
    } else if (csdFiles.length > 1) {
      // Multiple files found, show selector dialog
      setDiscoveredFiles(csdFiles);
      setPathModalOpen(true);
    } else {
      alert('No .csd or .txt telemetry files found in the chosen folder.');
    }

    e.target.value = '';
  };

  const stations = file?.stations || [];

  const prefixes = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => set.add(s.stationId[0].toUpperCase()));
    return Array.from(set).sort();
  }, [stations]);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.stationId.toLowerCase().includes(q) ||
        (s.stationName && s.stationName.toLowerCase().includes(q));
      const matchPrefix = prefixFilter === 'ALL' || s.stationId.toUpperCase().startsWith(prefixFilter);
      return matchSearch && matchPrefix;
    });
  }, [stations, search, prefixFilter]);

  const activeFiltersCount =
    (selectedStations.length > 0 ? 1 : 0) +
    (qualityFilter !== 'all' ? 1 : 0) +
    (statusFilter.length < 3 ? 1 : 0) +
    (recordTypeFilter.length > 0 ? 1 : 0) +
    (dateRange.start || dateRange.end ? 1 : 0);

  // MongoDB Atlas signature navigation links
  const atlasNavItems = [
    { label: 'Overview', href: '/', icon: Activity },
    { label: 'Hierarchy', href: '/#hierarchy-section', icon: FolderTree },
    { label: 'Data Table', href: '/table', icon: TableIcon, count: file ? file.records.length : undefined },
    { label: 'Sensor Matrix', href: '/#sensors-section', icon: Sliders },
    { label: 'Charts & Trends', href: '/charts', icon: LineChart },
    { label: 'Data Quality', href: '/#quality-section', icon: ShieldCheck },
    { label: 'Raw Packets', href: '/raw', icon: FileCode },
  ];

  /* ─────────────────────────────────────────────────────────────
     RENDER: Collapsed Atlas Narrow Icon Rail (54px)
     ───────────────────────────────────────────────────────────── */
  if (isSidebarCollapsed) {
    return (
      <aside
        style={{
          width: '54px',
          minWidth: '54px',
          height: 'calc(100vh - 61px - 33px)',
          background: 'var(--atlas-rail-bg)',
          borderRight: sidebarPosition === 'left' ? '1px solid var(--atlas-border)' : 'none',
          borderLeft: sidebarPosition === 'right' ? '1px solid var(--atlas-border)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0 8px',
          gap: '6px',
          zIndex: 40,
        }}
      >
        {/* Atlas Leaf Brand Icon */}
        <div
          onClick={() => setIsSidebarCollapsed(false)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(0, 237, 100, 0.2), rgba(0, 104, 74, 0.4))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: '6px',
            border: '1px solid rgba(0, 237, 100, 0.3)',
          }}
          title="Expand Navigation"
        >
          <Database size={18} color="var(--atlas-green)" />
        </div>

        <div style={{ width: '28px', height: '1px', background: 'var(--atlas-border)', margin: '2px 0 6px' }} />

        {/* Navigation Icons */}
        {atlasNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/' && pathname === '/');
          return (
            <Link
              key={item.label}
              href={item.href}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)',
                background: isActive ? 'rgba(0, 237, 100, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 237, 100, 0.25)' : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title={item.label}
            >
              <Icon size={17} />
            </Link>
          );
        })}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          {/* Toggle Move Sidebar Left/Right */}
          <button
            onClick={() => setSidebarPosition(sidebarPosition === 'left' ? 'right' : 'left')}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--atlas-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={`Move sidebar to ${sidebarPosition === 'left' ? 'Right' : 'Left'}`}
          >
            <ArrowLeftRight size={15} />
          </button>

          {/* Expand sidebar button */}
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--atlas-green)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Expand Navigation"
          >
            <PanelLeft size={17} />
          </button>
        </div>
      </aside>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: Full MongoDB Atlas Expanded Sidebar
     ───────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csd,.txt"
        style={{ display: 'none' }}
        onChange={handleSingleFileChange}
      />

      {/* Hidden Folder Picker */}
      <input
        type="file"
        ref={folderInputRef}
        // @ts-expect-error webkitdirectory is standard in browsers but missing in standard React types
        webkitdirectory="true"
        directory=""
        multiple
        style={{ display: 'none' }}
        onChange={handleFolderChange}
      />

      {/* Path / Folder Selector Modal */}
      <PathSelectorModal
        isOpen={pathModalOpen}
        onClose={() => setPathModalOpen(false)}
        discoveredFiles={discoveredFiles}
        onSelectFile={(f) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const buffer = event.target?.result as ArrayBuffer;
            if (buffer) {
              parseFileBuffer(buffer, f.name, f.size);
            }
          };
          reader.readAsArrayBuffer(f);
        }}
      />

      <aside
        style={{
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
          height: 'calc(100vh - 61px - 33px)',
          background: 'var(--atlas-bg)',
          borderRight: sidebarPosition === 'left' ? '1px solid var(--atlas-border)' : 'none',
          borderLeft: sidebarPosition === 'right' ? '1px solid var(--atlas-border)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: isResizing.current ? 'none' : 'width 0.2s ease',
          position: 'relative',
          userSelect: 'text',
        }}
      >
        {/* ─── Top Atlas Brand & Cluster Context Bar ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--atlas-border)',
            background: 'var(--atlas-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, rgba(0, 237, 100, 0.2), #00684a)',
                border: '1px solid rgba(0, 237, 100, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database size={14} color="var(--atlas-green)" />
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: 'var(--atlas-text-primary)',
                  letterSpacing: '0.06em',
                }}
              >
                EXPLORE
              </span>
            </div>
          </div>

          {/* Quick Header Actions: Move, Width, Collapse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {/* Move Sidebar Position Button */}
            <button
              onClick={() => setSidebarPosition(sidebarPosition === 'left' ? 'right' : 'left')}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                borderRadius: '4px',
                color: 'var(--atlas-text-secondary)',
                display: 'flex',
                alignItems: 'center',
              }}
              title={`Move sidebar to ${sidebarPosition === 'left' ? 'Right Side' : 'Left Side'}`}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--atlas-green)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--atlas-text-secondary)')}
            >
              <ArrowLeftRight size={14} />
            </button>

            {/* Collapse Sidebar Button */}
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                borderRadius: '4px',
                color: 'var(--atlas-text-secondary)',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Collapse Navigation"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--atlas-green)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--atlas-text-secondary)')}
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
        </div>

        {/* ─── Active Dataset / Cluster Card ─── */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--atlas-border)',
            background: 'rgba(0, 237, 100, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {file ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--atlas-green)',
                      boxShadow: '0 0 8px #00ed64',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="mono-font"
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--atlas-text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={file.filename}
                  >
                    {file.filename}
                  </span>
                </div>

                {/* Clear / Disconnect Dataset Button */}
                <button
                  onClick={clearFile}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    color: '#ef4444',
                    fontSize: '0.64rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Clear dataset and reset sidebar"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                >
                  <Trash2 size={11} />
                  <span>Clear</span>
                </button>
              </div>

              {/* Cluster Metric Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                <div
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    background: 'var(--atlas-surface)',
                    border: '1px solid var(--atlas-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.58rem', color: 'var(--atlas-text-secondary)', textTransform: 'uppercase' }}>Records</div>
                  <div className="mono-font" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--atlas-text-primary)' }}>
                    {file.records.length}
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    background: 'var(--atlas-surface)',
                    border: '1px solid var(--atlas-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.58rem', color: 'var(--atlas-text-secondary)', textTransform: 'uppercase' }}>Valid</div>
                  <div className="mono-font" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--atlas-green)' }}>
                    {((file.stats.goodRecords / file.stats.totalRecords) * 100).toFixed(0)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    background: 'var(--atlas-surface)',
                    border: '1px solid var(--atlas-border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.58rem', color: 'var(--atlas-text-secondary)', textTransform: 'uppercase' }}>Size</div>
                  <div className="mono-font" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--atlas-text-secondary)' }}>
                    {(file.fileSize / 1024).toFixed(0)} KB
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: '0.74rem', color: 'var(--atlas-text-secondary)', fontWeight: 600 }}>No Dataset Loaded</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'var(--atlas-green-dark)',
                    border: '1px solid #00ed64',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Upload
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  style={{
                    background: 'var(--atlas-surface)',
                    border: '1px solid var(--atlas-border)',
                    color: 'var(--atlas-text-secondary)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Path
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Scrollable Navigation Body ─── */}
        <div
          style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          {!file ? (
            <AtlasEmptyState
              onChooseFile={() => fileInputRef.current?.click()}
              onChooseFolder={() => folderInputRef.current?.click()}
              onOpenPathModal={() => {
                setDiscoveredFiles([]);
                setPathModalOpen(true);
              }}
            />
          ) : (
            <>
              {/* 1. DATABASE & EXPLORER */}
              <AtlasSection title="Database & Explorer" icon={Layers} defaultOpen={true}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {atlasNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href === '/' && pathname === '/');
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '0.78rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--atlas-text-primary)' : 'var(--atlas-text-secondary)',
                          background: isActive ? 'rgba(0, 237, 100, 0.08)' : 'transparent',
                          borderLeft: isActive ? '3px solid #00ed64' : '3px solid transparent',
                          transition: 'all 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Icon size={15} color={isActive ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)'} />
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: '0.64rem',
                              color: 'var(--atlas-text-secondary)',
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--atlas-surface)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </AtlasSection>

              {/* 2. STATIONS & BASINS */}
              <AtlasSection
                title="Stations & Basins"
                icon={Radio}
                badge={stations.length}
                defaultOpen={true}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* View Mode Toggle: Tree vs Flat */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'var(--atlas-surface)',
                      padding: '2px',
                      borderRadius: '6px',
                      border: '1px solid var(--atlas-border)',
                    }}
                  >
                    <button
                      onClick={() => setStationViewMode('hierarchy')}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '0.68rem',
                        borderRadius: '4px',
                        background: stationViewMode === 'hierarchy' ? 'var(--atlas-green-dark)' : 'transparent',
                        color: stationViewMode === 'hierarchy' ? '#ffffff' : 'var(--atlas-text-secondary)',
                        border: stationViewMode === 'hierarchy' ? '1px solid #00ed64' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontWeight: stationViewMode === 'hierarchy' ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <FolderTree size={12} color={stationViewMode === 'hierarchy' ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)'} />
                      <span>Hierarchy Tree</span>
                    </button>
                    <button
                      onClick={() => setStationViewMode('flat')}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '0.68rem',
                        borderRadius: '4px',
                        background: stationViewMode === 'flat' ? 'var(--atlas-green-dark)' : 'transparent',
                        color: stationViewMode === 'flat' ? '#ffffff' : 'var(--atlas-text-secondary)',
                        border: stationViewMode === 'flat' ? '1px solid #00ed64' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontWeight: stationViewMode === 'flat' ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <List size={12} color={stationViewMode === 'flat' ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)'} />
                      <span>Flat List</span>
                    </button>
                  </div>

                  {stationViewMode === 'hierarchy' ? (
                    <div style={{ minHeight: '220px', margin: '0 -4px' }}>
                      <StationHierarchyTree compact />
                    </div>
                  ) : (
                    <>
                      {/* Selection Toolbar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--atlas-text-secondary)' }}>
                          {filteredStations.length} of {stations.length}
                        </span>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          <button
                            onClick={selectAllStations}
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.62rem',
                              borderRadius: '3px',
                              background: 'var(--atlas-surface)',
                              color: 'var(--atlas-text-primary)',
                              border: '1px solid var(--atlas-border)',
                              cursor: 'pointer',
                            }}
                          >
                            All
                          </button>
                          <button
                            onClick={clearStationSelection}
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.62rem',
                              borderRadius: '3px',
                              background: 'var(--atlas-surface)',
                              color: 'var(--atlas-text-secondary)',
                              border: '1px solid var(--atlas-border)',
                              cursor: 'pointer',
                            }}
                          >
                            None
                          </button>
                          <button
                            onClick={() => setIsUnmappedModalOpen(true)}
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.62rem',
                              borderRadius: '3px',
                              background: 'rgba(234, 179, 8, 0.12)',
                              color: '#f59e0b',
                              border: '1px solid rgba(234, 179, 8, 0.25)',
                              cursor: 'pointer',
                            }}
                          >
                            Unmapped
                          </button>
                        </div>
                      </div>

                      {/* Station Search */}
                      <div style={{ position: 'relative' }}>
                        <Search
                          size={12}
                          color="var(--atlas-text-secondary)"
                          style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                          type="text"
                          placeholder="Search station ID / name..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '5px 24px 5px 26px',
                            fontSize: '0.74rem',
                            borderRadius: '4px',
                            background: 'var(--atlas-surface)',
                            border: '1px solid var(--atlas-border)',
                            color: 'var(--atlas-text-primary)',
                            outline: 'none',
                          }}
                        />
                        {search && (
                          <button
                            onClick={() => setSearch('')}
                            style={{
                              position: 'absolute',
                              right: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--atlas-text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Prefix filter jumps */}
                      {prefixes.length > 1 && (
                        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setPrefixFilter('ALL')}
                            style={{
                              padding: '1px 5px',
                              fontSize: '0.6rem',
                              borderRadius: '3px',
                              background: prefixFilter === 'ALL' ? 'var(--atlas-green-dark)' : 'var(--atlas-surface)',
                              color: prefixFilter === 'ALL' ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)',
                              border: '1px solid var(--atlas-border)',
                              cursor: 'pointer',
                            }}
                          >
                            ALL
                          </button>
                          {prefixes.map((p) => (
                            <button
                              key={p}
                              onClick={() => setPrefixFilter(p)}
                              style={{
                                padding: '1px 5px',
                                fontSize: '0.6rem',
                                borderRadius: '3px',
                                background: prefixFilter === p ? 'var(--atlas-green-dark)' : 'var(--atlas-surface)',
                                color: prefixFilter === p ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)',
                                border: '1px solid var(--atlas-border)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Flat Station List */}
                      <div
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1px',
                        }}
                      >
                        {filteredStations.length === 0 ? (
                          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--atlas-text-secondary)', fontSize: '0.74rem' }}>
                            No stations match
                          </div>
                        ) : (
                          filteredStations.map((st) => {
                            const isSelected = selectedStations.includes(st.stationId);
                            const masterInfo = stationMasterMap.get(st.stationId.trim().toUpperCase());
                            const displayName = st.stationName || masterInfo?.stationName;
                            return (
                              <div
                                key={st.stationId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(0, 237, 100, 0.08)' : 'transparent',
                                  transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div
                                  onClick={() => toggleStation(st.stationId)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}
                                >
                                  {isSelected ? (
                                    <CheckSquare size={13} color="var(--atlas-green)" style={{ flexShrink: 0 }} />
                                  ) : (
                                    <Square size={13} color="var(--atlas-text-secondary)" style={{ flexShrink: 0 }} />
                                  )}
                                  <div style={{ overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        fontSize: '0.74rem',
                                        fontWeight: isSelected ? 600 : 400,
                                        color: isSelected ? 'var(--atlas-green)' : 'var(--atlas-text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {displayName || st.stationId}
                                    </div>
                                    {displayName && (
                                      <div className="mono-font" style={{ fontSize: '0.62rem', color: 'var(--atlas-text-secondary)' }}>
                                        {st.stationId}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                  {st.badRecords > 0 && (
                                    <span
                                      style={{
                                        fontSize: '0.58rem',
                                        color: '#ef4444',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        padding: '1px 3px',
                                        borderRadius: '2px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      !{st.badRecords}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: '0.66rem',
                                      color: 'var(--atlas-text-secondary)',
                                      fontFamily: 'var(--font-mono)',
                                    }}
                                  >
                                    {st.totalRecords}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStationIdForDetails(st.stationId);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: '1px',
                                      cursor: 'pointer',
                                      color: 'var(--atlas-text-secondary)',
                                    }}
                                    title="View Station Details"
                                  >
                                    <Info size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </AtlasSection>

              {/* 3. STREAMING & TELEMETRY FILTERS */}
              <AtlasSection
                title="Streaming & Filters"
                icon={Filter}
                badge={activeFiltersCount > 0 ? activeFiltersCount : undefined}
                defaultOpen={false}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Quality Filter */}
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--atlas-text-secondary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                      Quality Filter
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                      {(['all', 'Good', 'Bad'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setQualityFilter(q)}
                          style={{
                            padding: '4px 6px',
                            fontSize: '0.68rem',
                            borderRadius: '4px',
                            border: qualityFilter === q ? '1px solid #00ed64' : '1px solid var(--atlas-border)',
                            background: qualityFilter === q ? 'var(--atlas-green-dark)' : 'var(--atlas-surface)',
                            color: qualityFilter === q ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)',
                            cursor: 'pointer',
                            fontWeight: qualityFilter === q ? 600 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                          }}
                        >
                          {q === 'Good' && <CheckCircle2 size={10} color="var(--atlas-green)" />}
                          {q === 'Bad' && <XCircle size={10} color="#ef4444" />}
                          {q === 'all' ? 'ALL' : q.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Carrier Mode */}
                  <div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--atlas-text-secondary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                      Carrier Status
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { code: 'L' as const, label: 'L (Lock)', color: '#06b6d4' },
                        { code: 'U' as const, label: 'U (Unlock)', color: '#f59e0b' },
                        { code: '$' as const, label: '$ (Err)', color: '#ef4444' },
                      ].map(({ code, label, color }) => (
                        <label
                          key={code}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            color: statusFilter.includes(code) ? 'var(--atlas-text-primary)' : 'var(--atlas-text-secondary)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={statusFilter.includes(code)}
                            onChange={() => toggleStatusFilter(code)}
                            style={{ accentColor: 'var(--atlas-green)' }}
                          />
                          <span style={{ color, fontFamily: 'var(--font-mono)' }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Record Types (H-Codes) */}
                  {file.stats.hValues && file.stats.hValues.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--atlas-text-secondary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                        Record Type (H-Code)
                      </div>
                      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        {file.stats.hValues.slice(0, 5).map(({ code }) => {
                          const isSelected = recordTypeFilter.includes(code);
                          return (
                            <button
                              key={code}
                              onClick={() => toggleRecordTypeFilter(code)}
                              style={{
                                padding: '2px 6px',
                                fontSize: '0.64rem',
                                borderRadius: '4px',
                                background: isSelected ? 'var(--atlas-green-dark)' : 'var(--atlas-surface)',
                                color: isSelected ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)',
                                border: isSelected ? '1px solid #00ed64' : '1px solid var(--atlas-border)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              H:{code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Time Range Filter */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.66rem', color: 'var(--atlas-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                        <Clock size={10} />
                        <span>Time Range</span>
                      </div>
                      {(dateRange.start || dateRange.end) && (
                        <button
                          onClick={clearDateRange}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--atlas-green)',
                            fontSize: '0.64rem',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {[
                        { label: 'All 24h', hours: 'all' },
                        { label: 'Last 6h', hours: 6 },
                        { label: 'Last 1h', hours: 1 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          onClick={() => {
                            if (btn.hours === 'all') {
                              if (file.stats.startTime && file.stats.endTime) {
                                setDateRange({ start: file.stats.startTime, end: file.stats.endTime });
                              }
                            } else if (file.stats.endTime) {
                              const end = file.stats.endTime;
                              const start = new Date(end.getTime() - (btn.hours as number) * 60 * 60 * 1000);
                              setDateRange({ start, end });
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            fontSize: '0.66rem',
                            borderRadius: '4px',
                            background: 'var(--atlas-surface)',
                            color: 'var(--atlas-text-secondary)',
                            border: '1px solid var(--atlas-border)',
                            cursor: 'pointer',
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reset All Filters */}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={resetFilters}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        fontSize: '0.68rem',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={11} />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                </div>
              </AtlasSection>

              {/* 4. DATASET MANAGEMENT & STORAGE */}
              <AtlasSection title="Dataset Management" icon={HardDrive} defaultOpen={true}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Upload new file */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'var(--atlas-surface)',
                      color: 'var(--atlas-text-primary)',
                      border: '1px solid var(--atlas-border)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--atlas-green)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--atlas-border)')}
                  >
                    <UploadCloud size={14} color="var(--atlas-green)" />
                    <span>Upload New .CSD</span>
                  </button>

                  {/* Choose Path / Folder */}
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'var(--atlas-surface)',
                      color: 'var(--atlas-text-primary)',
                      border: '1px solid var(--atlas-border)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--atlas-green)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--atlas-border)')}
                  >
                    <FolderOpen size={14} color="var(--atlas-green)" />
                    <span>Choose Folder Path</span>
                  </button>

                  {/* Enter custom URL/Path */}
                  <button
                    onClick={() => {
                      setDiscoveredFiles([]);
                      setPathModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'var(--atlas-surface)',
                      color: 'var(--atlas-text-secondary)',
                      border: '1px solid var(--atlas-border)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--atlas-text-primary)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--atlas-text-secondary)';
                      e.currentTarget.style.borderColor = 'var(--atlas-border)';
                    }}
                  >
                    <HardDrive size={14} />
                    <span>Enter Path / URL</span>
                  </button>

                  {/* Clear / Disconnect Dataset button */}
                  <button
                    onClick={clearFile}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Clear Dataset & Reset</span>
                  </button>
                </div>
              </AtlasSection>
            </>
          )}
        </div>

        {/* ─── Bottom Atlas Footer Toolbar ─── */}
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--atlas-border)',
            background: 'var(--atlas-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: 'var(--atlas-text-secondary)',
          }}
        >
          {/* Width Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', marginRight: '2px' }}>Width:</span>
            {[
              { label: '260', val: 260 },
              { label: '320', val: 320 },
              { label: '420', val: 420 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setSidebarWidth(p.val)}
                style={{
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: sidebarWidth === p.val ? 'var(--atlas-green-dark)' : 'var(--atlas-surface)',
                  color: sidebarWidth === p.val ? 'var(--atlas-green)' : 'var(--atlas-text-secondary)',
                  border: '1px solid var(--atlas-border)',
                  cursor: 'pointer',
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Dock / Move Position Toggle */}
          <button
            onClick={() => setSidebarPosition(sidebarPosition === 'left' ? 'right' : 'left')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: 'var(--atlas-text-secondary)',
              cursor: 'pointer',
              fontSize: '0.65rem',
            }}
            title="Move sidebar to left or right side of screen"
          >
            <ArrowLeftRight size={12} color="var(--atlas-green)" />
            <span>Move {sidebarPosition === 'left' ? 'Right' : 'Left'}</span>
          </button>
        </div>

        {/* ─── Draggable Resize Handle ─── */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            ...(sidebarPosition === 'left' ? { right: 0 } : { left: 0 }),
            top: 0,
            bottom: 0,
            width: '6px',
            cursor: 'col-resize',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 237, 100, 0.3)';
          }}
          onMouseLeave={(e) => {
            if (!isResizing.current) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <div
            style={{
              width: '2px',
              height: '32px',
              borderRadius: '2px',
              background: 'var(--atlas-green)',
              opacity: 0.6,
            }}
          />
        </div>
      </aside>
    </>
  );
}
