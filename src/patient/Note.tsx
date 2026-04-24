import React from 'react';
import { IoArrowBackOutline } from 'react-icons/io5';

interface NoteDetailProps {
  note: any;
  user: any;
  onBack?: () => void;
}

const formatDate = (iso?: string, format: 'long' | 'short' = 'long') => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const Note: React.FC<NoteDetailProps> = ({ note, user, onBack }) => {
  if (!note || typeof note !== 'object') return null;

  const authorName = user
    ? `Dr. ${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    : 'Clinical Staff';

  const title = note.title || 'Clinical Note';
  const content = note.notes || note.content || '';
  const createdAt = formatDate(note.createdAt ?? note.date, 'long');
  const createdAtShort = formatDate(note.createdAt ?? note.date, 'short');
  const gestationWeek = note.gestationWeek ? `${note.gestationWeek} weeks` : '—';

  return (
    <>
      {/* Controls */}
      <div className="mb-3 flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-[13px] font-medium transition-colors flex items-center gap-1.5"
          >
            <IoArrowBackOutline size={14} />
            Back
          </button>
        )}
      </div>

      {/* Document card */}
      <div
        className="mt-5 w-full max-w-[210mm] p-8 rounded-lg"
        style={{
          fontSize: '13px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          color: '#000000',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Mobileuurka" className="w-12 h-12" />
            <div>
              <h1 className="text-base font-bold" style={{ color: '#111827' }}>Mobileuurka</h1>
              <p className="text-[13px]" style={{ color: '#4b5563' }}>Healthcare Services</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold" style={{ color: '#111827' }}>Clinical Note</h2>
            <p className="text-[13px]" style={{ color: '#4b5563' }}>Date: {createdAt}</p>
          </div>
        </div>

        {/* Note Info */}
        <div className="mb-5">
          <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Note Information</h3>
          <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>TITLE</p>
              <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{title}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>AUTHOR</p>
              <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{authorName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#6b7280' }}>GESTATION</p>
              <p className="text-[13px] font-medium" style={{ color: '#111827' }}>{gestationWeek}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '1.25rem' }} />

        {/* Note Content */}
        <div className="mb-4">
          <h3 className="text-[13px] font-bold mb-1.5" style={{ color: '#111827' }}>Note</h3>
          <p
            className="text-[13px] leading-relaxed whitespace-pre-wrap"
            style={{ color: content ? '#374151' : '#9ca3af', fontStyle: content ? 'normal' : 'italic' }}
          >
            {content || 'No content available.'}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
          <p className="text-[10px] text-center mb-1" style={{ color: '#6b7280' }}>
            This document is confidential and contains protected health information.
          </p>
          <p className="text-[10px] text-center" style={{ color: '#9ca3af' }}>
            Generated on {createdAtShort}
          </p>
        </div>
      </div>
    </>
  );
};

export default Note;
