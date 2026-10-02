'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export function QualityChart() {
  const { file } = useAppStore();
  if (!file) return null;

  const { stats } = file;

  const qualityData = [
    { name: 'Good Quality', value: stats.goodRecords, color: '#10b981' },
    { name: 'Bad / Flagged', value: stats.badRecords, color: '#ef4444' },
  ];

  const statusData = [
    { name: 'L (Locked)', count: stats.statusBreakdown.L, fill: '#06b6d4' },
    { name: 'U (Unlocked)', count: stats.statusBreakdown.U, fill: '#f59e0b' },
    { name: '$ (Corrupted)', count: stats.statusBreakdown.$, fill: '#ef4444' },
  ];

  const hTop = stats.hValues.slice(0, 6).map((h) => ({
    name: `H:${h.code}`,
    count: h.count,
    fill: '#38bdf8',
  }));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        width: '100%',
        marginTop: '16px',
      }}
    >
      {/* 1. Quality Donut Chart */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-dim)',
            letterSpacing: '0.04em',
            marginBottom: '16px',
          }}
        >
          QUALITY ASSURANCE DISTRIBUTION
        </h4>

        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={qualityData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {qualityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px' }}>
          {qualityData.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: d.color,
                }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {d.name}: <strong style={{ color: 'var(--text-main)' }}>{d.value}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Status Mode Breakdown */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-dim)',
            letterSpacing: '0.04em',
            marginBottom: '16px',
          }}
        >
          CARRIER STATUS MODES (L / U / $)
        </h4>

        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '8px' }}>
          L = Locked Carrier | U = Unlocked | $ = Frame Glitch
        </div>
      </div>

      {/* 3. Top H Codes Distribution */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--text-dim)',
            letterSpacing: '0.04em',
            marginBottom: '16px',
          }}
        >
          TOP H-HEADER CODES
        </h4>

        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hTop}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis type="number" stroke="var(--text-dim)" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="var(--text-dim)" fontSize={11} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                }}
              />
              <Bar dataKey="count" fill="var(--primary-light)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '8px' }}>
          Record telemetry header types (H:1007, H:0271, etc.)
        </div>
      </div>
    </div>
  );
}
