'use client';

import React from 'react';
import { useAppStore } from '@/store/use-app-store';
import { FileUploader } from './FileUploader';

export function FileImportModal() {
  const { isImportModalOpen, setIsImportModalOpen } = useAppStore();

  if (!isImportModalOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={() => setIsImportModalOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <FileUploader isModal={true} onClose={() => setIsImportModalOpen(false)} />
      </div>
    </div>
  );
}
