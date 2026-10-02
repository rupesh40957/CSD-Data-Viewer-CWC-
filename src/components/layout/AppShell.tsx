'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarPosition } = useAppStore();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: sidebarPosition === 'right' ? 'row-reverse' : 'row',
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg-app)',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          height: 'calc(100vh - 61px - 33px)',
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  );
}
