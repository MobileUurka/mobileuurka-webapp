import React, { useEffect, useRef, useState } from 'react';
import { LuChevronDown, LuHistory } from 'react-icons/lu';
import type { SymptomReportVersion } from '../utils/symptomReportVersions';
import { formatVersionLabel } from '../utils/symptomReportVersions';

interface ReportVersionPickerProps {
  versions: SymptomReportVersion[];
  selectedVersionId: string;
  commentCounts: Map<string, number>;
  onSelect: (versionId: string) => void;
}

const CommentCountBadge: React.FC<{ count: number; active?: boolean }> = ({ count, active }) => {
  if (count <= 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        background: active ? '#008540' : '#f0fdf4',
        color: active ? '#fff' : '#008540',
        border: active ? 'none' : '1px solid #bbf7d0',
      }}
    >
      {count}
    </span>
  );
};

const ReportVersionPicker: React.FC<ReportVersionPickerProps> = ({
  versions,
  selectedVersionId,
  commentCounts,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedIndex = versions.findIndex((v) => v.id === selectedVersionId);
  const selectedVersion = selectedIndex >= 0 ? versions[selectedIndex] : versions[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (versions.length <= 1 || !selectedVersion) return null;

  const selectedCount = commentCounts.get(selectedVersion.id) ?? 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-200 bg-white text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <LuHistory size={14} className="text-gray-500 shrink-0" />
        <span className="font-medium text-gray-500 hidden sm:inline">Version</span>
        <span className="font-medium text-gray-800 max-w-[220px] truncate">
          {formatVersionLabel(selectedVersion, selectedIndex, versions.length)}
        </span>
        <CommentCountBadge count={selectedCount} />
        <LuChevronDown
          size={14}
          className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[320px] max-w-[420px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          {versions.map((version, index) => {
            const count = commentCounts.get(version.id) ?? 0;
            const isSelected = version.id === selectedVersionId;
            return (
              <button
                key={version.id}
                type="button"
                onClick={() => {
                  onSelect(version.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] hover:bg-gray-50 transition-colors"
                style={{
                  background: isSelected ? '#f0fdf4' : undefined,
                  borderBottom: index < versions.length - 1 ? '1px solid #f3f4f6' : undefined,
                }}
              >
                <span className="flex-1 min-w-0">
                  <span
                    className="block font-medium truncate"
                    style={{ color: isSelected ? '#14532d' : '#111827' }}
                  >
                    {formatVersionLabel(version, index, versions.length)}
                  </span>
                </span>
                <CommentCountBadge count={count} active={isSelected} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportVersionPicker;
