'use client';

import React from 'react';
import { DataTable } from '@/components/table/DataTable';

export default function TablePage() {
  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Data Report & Log Records
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tabular telemetry stream view inspired by AMPL AWS Data Viewer with column filtering & Excel export
        </span>
      </div>
      <DataTable />
    </div>
  );
}
