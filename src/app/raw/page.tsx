'use client';

import React from 'react';
import { RawInspector } from '@/components/raw/RawInspector';

export default function RawPage() {
  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Raw Frame Stream & Error Log
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Low-level line-by-line inspection of raw 0xBB/0xB8 byte records and error diagnostics
        </span>
      </div>
      <RawInspector />
    </div>
  );
}
