'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/use-app-store';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  FileCheck,
  FileWarning,
  Layers,
} from 'lucide-react';

export function ArchiveProcessingProgress() {
  const { archiveProcessingStatus, clearArchiveProcessingStatus } = useAppStore();
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  if (!archiveProcessingStatus) return null;

  const {
    isProcessing,
    stage,
    processed,
    total,
    recordsParsed,
    failedCount,
    percentage,
    errors,
  } = archiveProcessingStatus;

  const remaining = Math.max(0, total - processed);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-focus)',
        background: 'var(--bg-card)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isProcessing ? (
            <Loader2 size={16} className="animate-spin" color="var(--primary-light)" />
          ) : failedCount > 0 ? (
            <AlertTriangle size={16} color="#f59e0b" />
          ) : (
            <CheckCircle2 size={16} color="var(--quality-good)" />
          )}

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {isProcessing
                ? 'Processing Multi-Year Archive in Web Workers...'
                : failedCount > 0
                ? `Archive Processing Complete with ${failedCount} Issue${failedCount > 1 ? 's' : ''}`
                : 'Archive Processing Complete'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Stage: <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{stage}</span>
            </div>
          </div>
        </div>

        {/* Right metrics & Close button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="mono-font"
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: isProcessing ? 'var(--primary-light)' : 'var(--quality-good)',
            }}
          >
            {percentage}%
          </span>

          {!isProcessing && (
            <button
              onClick={clearArchiveProcessingStatus}
              className="btn-secondary"
              style={{ padding: '3px 6px', borderRadius: '4px' }}
              title="Dismiss processing status"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: '6px',
          borderRadius: '3px',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: failedCount > 0
              ? 'linear-gradient(90deg, #0284c7, #f59e0b)'
              : 'linear-gradient(90deg, #0284c7, #10b981)',
            transition: 'width 0.25s ease',
          }}
        />
      </div>

      {/* Stats Counter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        <span
          style={{
            padding: '2px 7px',
            borderRadius: '4px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          Total Files: <strong style={{ color: 'var(--text-main)' }}>{total}</strong>
        </span>

        <span
          style={{
            padding: '2px 7px',
            borderRadius: '4px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: 'var(--quality-good)',
          }}
        >
          Processed: <strong>{processed}</strong>
        </span>

        {remaining > 0 && (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
            }}
          >
            Remaining: <strong>{remaining}</strong>
          </span>
        )}

        <span
          style={{
            padding: '2px 7px',
            borderRadius: '4px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: 'var(--primary-light)',
          }}
        >
          Records Parsed: <strong className="mono-font">{recordsParsed.toLocaleString()}</strong>
        </span>

        {failedCount > 0 && (
          <button
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            style={{
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            <FileWarning size={12} />
            <span>{failedCount} Failed Files</span>
            {showErrorDetails ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      {/* Expandable Failed Files List */}
      {showErrorDetails && errors.length > 0 && (
        <div
          style={{
            marginTop: '4px',
            padding: '8px 10px',
            borderRadius: '4px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            maxHeight: '140px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444' }}>
            Skipped Corrupted Files (Valid Files Successfully Loaded):
          </div>
          {errors.map((e, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
              }}
            >
              <AlertCircle size={12} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>{e.filename}:</strong> {e.error}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

