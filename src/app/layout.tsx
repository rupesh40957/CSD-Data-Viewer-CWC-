import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBar } from '@/components/layout/StatusBar';
import { SensorMetadataModal } from '@/components/dashboard/SensorMetadataModal';
import { StationDetailsModal } from '@/components/dashboard/StationDetailsModal';
import { UnmappedStationsModal } from '@/components/dashboard/UnmappedStationsModal';
import { FileImportModal } from '@/components/upload/FileImportModal';
import { InsatConfigPanel } from '@/components/dashboard/InsatConfigPanel';
import { DateArchiveModal } from '@/components/archive/DateArchiveModal';

export const metadata: Metadata = {
  title: 'CSD Data Viewer — Hydrometeorological & Industrial AWS Telemetry',
  description:
    'Advanced web-based environmental and hydrometeorological logger data viewer for CSD custom binary formats.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <AppShell>{children}</AppShell>
          <StatusBar />
          <SensorMetadataModal />
          <StationDetailsModal />
          <UnmappedStationsModal />
          <FileImportModal />
          <InsatConfigPanel />
          <DateArchiveModal />
        </div>
      </body>
    </html>
  );
}
