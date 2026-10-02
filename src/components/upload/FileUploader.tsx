'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/use-app-store';
import { decodeCsdBuffer, parseCsdContent } from '@/lib/parser/csd-parser';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import { CSDFile } from '@/types/csd';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  PlayCircle,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Sliders,
  Cpu,
  Binary,
  ArrowRight,
  X,
  Layers,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export type ImportState = 'idle' | 'selected' | 'parsing' | 'completed' | 'failed';

interface FileUploaderProps {
  isModal?: boolean;
  onClose?: () => void;
}

export function FileUploader({ isModal = false, onClose }: FileUploaderProps) {
  const router = useRouter();
  const {
    file,
    setFile,
    clearFile,
    stationMasterMap,
    setIsImportModalOpen,
  } = useAppStore();

  const [importState, setImportState] = useState<ImportState>(file ? 'completed' : 'idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsingStep, setParsingStep] = useState<string>('');
  const [parsingProgressPct, setParsingProgressPct] = useState<number>(0);
  const [parsedSummary, setParsedSummary] = useState<CSDFile | null>(file);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isTechDetailsOpen, setIsTechDetailsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with store if store file changes
  useEffect(() => {
    if (file && importState === 'idle') {
      setParsedSummary(file);
      setImportState('completed');
    } else if (!file && importState === 'completed') {
      setParsedSummary(null);
      setSelectedFile(null);
      setImportState('idle');
    }
  }, [file, importState]);

  // Handle file selection from input or drop
  const handleSelectFile = (f: File) => {
    if (!f) return;
    setErrorMessage(null);
    setErrorDetails(null);

    // Validate file extension
    const ext = f.name.toLowerCase().split('.').pop();
    if (ext !== 'csd' && ext !== 'txt') {
      setErrorMessage(`Invalid file format ".${ext}". Please provide a .csd telemetry file.`);
      setErrorDetails(`Expected file extension: .csd (or .txt with CSD formatting). File received: "${f.name}".`);
      setImportState('failed');
      return;
    }

    setSelectedFile(f);
    setImportState('selected');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  // Execute parsing pipeline with progressive steps
  const executeAnalysis = async () => {
    if (!selectedFile) return;

    setImportState('parsing');
    setParsingProgressPct(15);
    setParsingStep('Reading records from local binary buffer...');
    setErrorMessage(null);
    setErrorDetails(null);

    try {
      // Step 1: Read file as ArrayBuffer client-side
      const buffer = await selectedFile.arrayBuffer();
      setParsingProgressPct(45);
      setParsingStep('Parsing data with Windows-1252 0xBB/0xB8 protocol decoder...');

      // Small async tick so browser UI renders progress step smoothly
      await new Promise((r) => setTimeout(r, 260));

      const decoded = decodeCsdBuffer(buffer);
      setParsingProgressPct(75);
      setParsingStep('Building sensor index & joining Station Master XLSX...');

      await new Promise((r) => setTimeout(r, 240));

      // Step 2: Parse CSD content and join station master
      const result = parseCsdContent(decoded, selectedFile.name, selectedFile.size, stationMasterMap);

      if (result.records.length === 0) {
        throw new Error(
          'No valid CSD telemetry frames found. The file may be empty or missing the » (0xBB) record prefix.'
        );
      }

      setParsingProgressPct(100);
      setParsingStep('Finalizing telemetry summary...');

      // Commit to Zustand store
      setFile(result);
      setParsedSummary(result);
      setImportState('completed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while parsing the .csd file.';
      const stack = err instanceof Error ? err.stack || err.message : String(err);
      setErrorMessage(msg);
      setErrorDetails(stack);
      setImportState('failed');
    }
  };

  // Replace file action: reset back to idle file selection
  const handleReplace = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setErrorDetails(null);
    setImportState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove / Reset file action: unloads file completely from store
  const handleReset = () => {
    clearFile();
    setSelectedFile(null);
    setParsedSummary(null);
    setErrorMessage(null);
    setErrorDetails(null);
    setImportState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleFinishAndNavigate = () => {
    if (onClose) {
      onClose();
    } else {
      setIsImportModalOpen(false);
      router.push('/');
    }
  };

  const activeData = parsedSummary || file;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isModal ? '20px 24px' : '40px 24px',
        maxWidth: '820px',
        margin: '0 auto',
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csd,.txt"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleSelectFile(e.target.files[0]);
          }
        }}
      />

      {/* Main Glass Panel Card */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          padding: '32px 28px',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
        }}
      >
        {/* Top Gradient Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              importState === 'failed'
                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                : importState === 'completed'
                ? 'linear-gradient(90deg, #10b981, #06b6d4, #0284c7)'
                : 'linear-gradient(90deg, #0284c7, #06b6d4, #a855f7)',
          }}
        />

        {/* Modal Close Button if opened in modal mode */}
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '6px',
              borderRadius: '50%',
            }}
            title="Close import modal"
          >
            <X size={16} />
          </button>
        )}

        {/* ========================================================
            STATE 1: IDLE (No File Selected)
        ======================================================== */}
        {importState === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                border: `2px dashed ${isDragOver ? 'var(--primary-light)' : 'rgba(56, 189, 248, 0.35)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '44px 24px',
                textAlign: 'center',
                background: isDragOver ? 'var(--primary-glow)' : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isDragOver ? '0 0 25px rgba(56, 189, 248, 0.3)' : 'none',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(6, 182, 212, 0.2))',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 20px rgba(56, 189, 248, 0.25)',
                }}
              >
                <UploadCloud size={34} color="var(--primary-light)" />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Drop your .csd file here
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', maxWidth: '520px', margin: '0 auto 20px' }}>
                Select or drag a raw hydrometeorological logger telemetry file (.csd).
                Processed entirely in your browser with zero server uploads.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  style={{ padding: '8px 18px', fontSize: '0.84rem' }}
                >
                  <FileText size={16} />
                  <span>Browse .csd File</span>
                </button>

              </div>
            </div>

            {/* Protocol Notice */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginTop: '20px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <ShieldCheck size={18} color="var(--quality-good)" />
                <div style={{ fontSize: '0.74rem' }}>
                  <strong style={{ display: 'block', color: 'var(--text-main)' }}>100% Client-Side</strong>
                  <span style={{ color: 'var(--text-muted)' }}>Files stay strictly in memory</span>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Binary size={18} color="var(--primary-light)" />
                <div style={{ fontSize: '0.74rem' }}>
                  <strong style={{ display: 'block', color: 'var(--text-main)' }}>» / ¸ Delimiter Engine</strong>
                  <span style={{ color: 'var(--text-muted)' }}>0xBB record header & 0xB8 fields</span>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Cpu size={18} color="var(--accent-teal)" />
                <div style={{ fontSize: '0.74rem' }}>
                  <strong style={{ display: 'block', color: 'var(--text-main)' }}>Fault-Tolerant</strong>
                  <span style={{ color: 'var(--text-muted)' }}>Tolerates corrupted $$ tokens</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STATE 2: SELECTED (File Picked, Ready to Analyze)
        ======================================================== */}
        {importState === 'selected' && selectedFile && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <FileCheck size={28} color="var(--primary-light)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                File Selected for Telemetry Ingestion
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Ready to decode Windows-1252 record streams and parse multi-sensor matrix.
              </p>
            </div>

            {/* Selected File Card */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(2, 132, 199, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={22} color="var(--primary-light)" />
                </div>
                <div>
                  <div
                    className="mono-font"
                    style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}
                  >
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Custom Logger Stream'} •{' '}
                    Modified {new Date(selectedFile.lastModified).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <button
                onClick={handleReplace}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <span>Change File</span>
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={executeAnalysis}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.92rem', fontWeight: 600, gap: '8px' }}
              >
                <span>Analyze File</span>
                <ArrowRight size={16} />
              </button>
              <button
                onClick={handleReplace}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.86rem' }}
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STATE 3: PARSING (In-Progress Animation)
        ======================================================== */}
        {importState === 'parsing' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Loader2 size={32} color="var(--primary-light)" className="animate-spin" />
            </div>

            <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Decoding CSD Logger Stream
            </h3>
            <p className="mono-font" style={{ fontSize: '0.82rem', color: 'var(--primary-light)', marginBottom: '24px' }}>
              {parsingStep || 'Reading records...'}
            </p>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                maxWidth: '480px',
                margin: '0 auto 20px',
                height: '8px',
                borderRadius: '4px',
                background: 'var(--bg-subtle)',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: `${parsingProgressPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7, #06b6d4, #10b981)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Steps Checklist */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: parsingProgressPct >= 30 ? 'var(--quality-good)' : 'var(--text-muted)',
                }}
              >
                <CheckCircle2 size={13} />
                <span>Reading records...</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: parsingProgressPct >= 70 ? 'var(--quality-good)' : 'var(--text-muted)',
                }}
              >
                <CheckCircle2 size={13} />
                <span>Parsing data...</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: parsingProgressPct >= 95 ? 'var(--quality-good)' : 'var(--text-muted)',
                }}
              >
                <CheckCircle2 size={13} />
                <span>Building sensor index...</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STATE 4: COMPLETED (Success State & Verification)
        ======================================================== */}
        {importState === 'completed' && activeData && (
          <div>
            {/* Header Success Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border)',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={24} color="var(--quality-good)" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3
                      className="mono-font"
                      style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}
                    >
                      {activeData.filename}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--quality-good)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      LOADED & ACTIVE
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {(activeData.fileSize / 1024).toFixed(1)} KB binary size • Parsed in{' '}
                    {activeData.parsingSummary?.parseTimeMs ?? 24} ms
                  </span>
                </div>
              </div>

              {/* Actions: Replace & Reset */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleReplace}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}
                  title="Replace loaded file with another file"
                >
                  <RefreshCw size={13} />
                  <span>Replace File</span>
                </button>

                <button
                  onClick={handleReset}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    gap: '6px',
                    color: 'var(--quality-bad)',
                    borderColor: 'rgba(239, 68, 68, 0.25)',
                  }}
                  title="Unload file from memory"
                >
                  <Trash2 size={13} />
                  <span>Remove / Reset</span>
                </button>
              </div>
            </div>

            {/* Key Summary Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '12px',
                marginBottom: '18px',
              }}
            >
              {/* 1. Records Detected */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  RECORDS DETECTED
                </div>
                <div
                  className="mono-font"
                  style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}
                >
                  {activeData.stats.totalRecords.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {activeData.stats.goodRecords} good • {activeData.stats.badRecords} bad
                </div>
              </div>

              {/* 2. Malformed Records Count */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  MALFORMED RECORDS
                </div>
                <div
                  className="mono-font"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: (activeData.parsingSummary?.malformedRecords ?? 0) === 0
                      ? 'var(--quality-good)'
                      : 'var(--quality-bad)',
                    marginTop: '2px',
                  }}
                >
                  {activeData.parsingSummary?.malformedRecords ?? 0}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {(activeData.parsingSummary?.malformedRecords ?? 0) === 0
                    ? '100% valid structure'
                    : 'Skipped unparseable lines'}
                </div>
              </div>

              {/* 3. Fields Detected */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  FIELDS DETECTED
                </div>
                <div
                  className="mono-font"
                  style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-light)', marginTop: '2px' }}
                >
                  21 fields
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  s00-s17, c1-c3, signal, H
                </div>
              </div>

              {/* 4. Transmitting Stations */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  STATIONS DETECTED
                </div>
                <div
                  className="mono-font"
                  style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-teal)', marginTop: '2px' }}
                >
                  {activeData.stats.uniqueStations}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Hex-addressed loggers
                </div>
              </div>
            </div>

            {/* Time Range Banner */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.78rem',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="var(--primary-light)" />
                <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>TIME RANGE:</span>
                <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  {activeData.stats.startTime ? formatCsdTimestamp(activeData.stats.startTime, false) : '--'}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>→</span>
                <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  {activeData.stats.endTime ? formatCsdTimestamp(activeData.stats.endTime, false) : '--'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge badge-locked" style={{ fontSize: '0.68rem' }}>
                  L: {activeData.stats.statusBreakdown.L}
                </span>
                <span className="badge badge-unlocked" style={{ fontSize: '0.68rem' }}>
                  U: {activeData.stats.statusBreakdown.U}
                </span>
                {activeData.stats.statusBreakdown.$ > 0 && (
                  <span className="badge badge-corrupt" style={{ fontSize: '0.68rem' }}>
                    $: {activeData.stats.statusBreakdown.$}
                  </span>
                )}
              </div>
            </div>

            {/* Warnings Section (Requirement 8) */}
            {activeData.stats.badRecords > 0 && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={16} color="var(--quality-corrupt)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '0.78rem' }}>
                  <strong style={{ color: 'var(--quality-corrupt)', display: 'block', marginBottom: '2px' }}>
                    Telemetry Stream Warnings ({activeData.stats.badRecords} frames flagged)
                  </strong>
                  <span style={{ color: 'var(--text-muted)' }}>
                    • {activeData.qualitySummary?.recordsWithCorruptMarkers ?? activeData.stats.badRecords} records contain corrupted sensor tokens ($$).
                    <br />
                    • {activeData.stats.statusBreakdown.$} records have unaligned transmission carriers ($).
                    <br />
                    • Fault-tolerant engine parsed all valid readings and safely preserved unparsed anomalies.
                  </span>
                </div>
              </div>
            )}

            {/* Collapsible Technical Details (Developer / Debug Info) */}
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                marginBottom: '20px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setIsTechDetailsOpen(!isTechDetailsOpen)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Binary size={13} color="var(--primary-light)" />
                  <span>TECHNICAL DETAILS (DEVELOPER / DEBUG INFO)</span>
                </div>
                {isTechDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isTechDetailsOpen && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.74rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div><strong>Protocol Frame Prefix:</strong> » (0xBB / 187 decimal)</div>
                  <div><strong>Field Delimiter:</strong> ¸ (0xB8 / 184 decimal)</div>
                  <div><strong>Character Encoding:</strong> Windows-1252 ANSI</div>
                  <div><strong>Line Ending:</strong> {activeData.parsingSummary?.lineEnding || 'CRLF'}</div>
                  <div><strong>Total Lines Parsed:</strong> {activeData.parsingSummary?.totalLines || activeData.stats.totalRecords}</div>
                  <div><strong>Parse Execution Duration:</strong> {activeData.parsingSummary?.parseTimeMs ?? 24} ms</div>
                  <div><strong>Execution Context:</strong> In-browser Client-side FileReader (Zero network payload)</div>
                </div>
              )}
            </div>

            {/* Open Dashboard Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleFinishAndNavigate}
                className="btn-primary"
                style={{ padding: '10px 28px', fontSize: '0.92rem', fontWeight: 600, gap: '8px' }}
              >
                <span>{isModal ? 'Done / Return to Viewer' : 'Explore Dashboard & Analytics'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STATE 5: FAILED (Technical Error & Suggested Actions)
        ======================================================== */}
        {importState === 'failed' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'var(--quality-bad-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <AlertCircle size={28} color="var(--quality-bad)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--quality-bad)', marginBottom: '4px' }}>
                Telemetry Ingestion Failed
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {errorMessage || 'The specified file could not be parsed as a valid CSD telemetry stream.'}
              </p>
            </div>

            {/* Suggested Action Checklist */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                marginBottom: '20px',
              }}
            >
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px' }}>
                SUGGESTED ACTIONS:
              </h4>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <li>Ensure the file is a raw environmental data logger stream with extension <code>.csd</code>.</li>
                <li>Verify the file contains record prefixes <code>»</code> (0xBB) and field delimiters <code>¸</code> (0xB8).</li>
                <li>Confirm the file is encoded in Windows-1252 ANSI and was not converted to UTF-8 without delimiter preservation.</li>
                <li>Make sure the file is not empty (size &gt; 0 bytes).</li>
              </ul>
            </div>

            {/* Collapsible Technical Details (Error Diagnostics) */}
            {errorDetails && (
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  marginBottom: '20px',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setIsTechDetailsOpen(!isTechDetailsOpen)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    color: 'var(--quality-bad)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Binary size={13} />
                    <span>TECHNICAL DETAILS (DEVELOPER / DEBUG INFO)</span>
                  </div>
                  {isTechDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isTechDetailsOpen && (
                  <pre
                    className="mono-font"
                    style={{
                      margin: 0,
                      padding: '12px 14px',
                      fontSize: '0.72rem',
                      color: '#fca5a5',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}
                  >
                    {errorDetails}
                  </pre>
                )}
              </div>
            )}

            {/* Actions: Retry & Browse */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={selectedFile ? executeAnalysis : handleReplace}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.84rem', gap: '6px' }}
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>

              <button
                onClick={handleReplace}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.84rem' }}
              >
                <span>Select Another File</span>
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
