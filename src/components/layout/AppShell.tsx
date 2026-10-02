'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarPosition } = useAppStore();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('csd_theme') as 'dark' | 'light' | null;
      if (saved && (saved === 'dark' || saved === 'light')) {
        useAppStore.setState({ theme: saved });
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch {}
  }, []);

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
