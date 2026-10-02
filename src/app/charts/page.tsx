'use client';

import React from 'react';
import { TelemetryCharts } from '@/components/charts/TelemetryCharts';

export default function ChartsPage() {
  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Visual Telemetry & Graphs
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Real-time curve visualization, sensor trend comparison, and RF carrier signal analysis
        </span>
      </div>
      <TelemetryCharts />
    </div>
  );
}
