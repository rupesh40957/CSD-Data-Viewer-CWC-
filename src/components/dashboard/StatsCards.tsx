'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import { selectDetectedSensorsSummary } from '@/store/selectors';
import { formatCsdTimestamp } from '@/lib/parser/timestamp-parser';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
  Calendar,
} from 'lucide-react';

export function StatsCards() {
  const { file } = useAppStore();
  const detectedSensors = useAppStore(selectDetectedSensorsSummary);

  if (!file) return null;

  const { stats } = file;
  const goodPct = ((stats.goodRecords / stats.totalRecords) * 100).toFixed(1);
  const badPct = ((stats.badRecords / stats.totalRecords) * 100).toFixed(1);

  const startStr = stats.startTime ? formatCsdTimestamp(stats.startTime, false) : '--';
  const endStr = stats.endTime ? formatCsdTimestamp(stats.endTime, false) : '--';

  const cards = [
    {
      title: 'TOTAL RECORDS',
      value: stats.totalRecords.toLocaleString(),
      sub: `${(file.fileSize / 1024).toFixed(0)} KB Stream Size`,
      icon: Database,
      accent: 'var(--primary-light)',
      borderGlow: 'rgba(56, 189, 248, 0.25)',
    },
    {
      title: 'VALID RECORDS',
      value: stats.goodRecords.toLocaleString(),
      sub: `${goodPct}% Good Quality (L/U lock)`,
      icon: CheckCircle2,
      accent: 'var(--quality-good)',
      borderGlow: 'rgba(16, 185, 129, 0.3)',
    },
    {
      title: 'INVALID RECORDS',
      value: stats.badRecords.toLocaleString(),
      sub: `${badPct}% $$ corrupted or noise`,
      icon: AlertTriangle,
      accent: 'var(--quality-bad)',
      borderGlow: 'rgba(239, 68, 68, 0.3)',
    },
    {
      title: 'DETECTED SENSORS',
      value: `${detectedSensors.length} Channels`,
      sub: `s00–s17, c1–c3, carrier signal`,
      icon: Cpu,
      accent: 'var(--accent-teal)',
      borderGlow: 'rgba(20, 184, 166, 0.25)',
    },
    {
      title: 'START TIME',
      value: startStr.split(' ')[1] || '--',
      sub: `${startStr.split(' ')[0]} (IST)`,
      icon: Clock,
      accent: '#818cf8',
      borderGlow: 'rgba(129, 140, 248, 0.25)',
    },
    {
      title: 'END TIME',
      value: endStr.split(' ')[1] || '--',
      sub: `${endStr.split(' ')[0]} (IST)`,
      icon: Calendar,
      accent: '#f59e0b',
      borderGlow: 'rgba(245, 158, 11, 0.25)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        width: '100%',
      }}
    >
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="glass-panel"
            style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 4px 20px ${card.borderGlow}`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(90deg, ${card.accent}, transparent)`,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.05em',
                }}
              >
                {card.title}
              </span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} color={card.accent} />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div
                className="mono-font"
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-main)',
                }}
              >
                {card.value}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginTop: '4px',
                }}
              >
                {card.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
