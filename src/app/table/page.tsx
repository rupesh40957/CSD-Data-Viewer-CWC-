'use client';

import React from 'react';
import { DataTable } from '@/components/table/DataTable';
import { DateArchiveNavigator } from '@/components/archive/DateArchiveNavigator';

export default function TablePage() {
  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ marginBottom: '4px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Data Report & Log Records
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tabular telemetry stream view inspired by AMPL AWS Data Viewer with column filtering, multi-year date archive & Excel export
        </span>
      </div>

      {/* Multi-Year CSD Date Archive Dynamic Navigator */}
      <DateArchiveNavigator />

      {/* Main Records Data Table */}
      <DataTable />
    </div>
  );
}

