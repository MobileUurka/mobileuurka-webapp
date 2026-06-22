import { useNavigate } from 'react-router-dom';
import { LuClipboardList } from 'react-icons/lu';

interface OverviewEmptyStateProps {
  title?: string;
  description?: string;
  screeningTab: string;
  patientId: string;
  patientName: string;
}

const OverviewEmptyState = ({
  title = 'No data recorded',
  description = 'This information has not been captured for this patient yet.',
  screeningTab,
  patientId,
  patientName,
}: OverviewEmptyStateProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center px-4 py-5">
      <div className="w-11 h-11 rounded-full bg-[#008540]/10 flex items-center justify-center mb-3">
        <LuClipboardList className="text-[#008540] text-lg" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-500 mt-1.5 max-w-[240px] leading-relaxed">{description}</p>
      <button
        type="button"
        onClick={() =>
          navigate(`/Screening/${screeningTab}`, {
            state: { patientId, patientName },
          })
        }
        className="mt-4 px-4 py-2 text-xs font-medium bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors shadow-sm"
      >
        Add in Screening
      </button>
    </div>
  );
};

export default OverviewEmptyState;
