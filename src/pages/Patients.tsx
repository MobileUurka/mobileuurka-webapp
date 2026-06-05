import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatients } from '../store/patientsSlice';
import SearchContainer from "../components/SearchContainer";
import { PATIENT_COLUMNS, type Patient } from '../constants/patientColumns';
import DataTable from '../components/DataTable';
import { patientService } from '../services/patientServices';

const Patients = ({ setActiveItem }: { setActiveItem?: (val: string) => void }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const patients = useAppSelector(s => s.patients.data);
  const status = useAppSelector(s => s.patients.status);
  const [searchTerm, setSearchTerm] = useState('');

  // Archived / discharged view
  const [showArchived, setShowArchived] = useState(false);
  const [archivedPatients, setArchivedPatients] = useState<Patient[]>([]);
  const [archivedStatus, setArchivedStatus] = useState<'idle' | 'loading' | 'failed'>('idle');

  // Load active patients
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPatients());
    }
  }, [status, dispatch]);

  // Load archived patients when tab switches to archived
  useEffect(() => {
    if (!showArchived) return;
    setArchivedStatus('loading');
    patientService.getArchivedPatients({ page: 1, limit: 100 })
      .then((res: any) => {
        const rows: Patient[] = (res?.data?.patients ?? []).map((p: any) => ({
          ...p,
          _archived: true,
        }));
        setArchivedPatients(rows);
        setArchivedStatus('idle');
      })
      .catch(() => setArchivedStatus('failed'));
  }, [showArchived]);

  const activeFiltered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return patients.filter((p) =>
      p.firstName?.toLowerCase().includes(term) ||
      p.name?.toLowerCase().includes(term) ||
      p.lastName?.toLowerCase().includes(term) ||
      p.nationalId?.includes(term) ||
      p.hospital?.toLowerCase().includes(term)
    );
  }, [patients, searchTerm]);

  const archivedFiltered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return archivedPatients.filter((p) =>
      p.firstName?.toLowerCase().includes(term) ||
      p.name?.toLowerCase().includes(term) ||
      p.lastName?.toLowerCase().includes(term) ||
      p.nationalId?.includes(term) ||
      p.hospital?.toLowerCase().includes(term)
    );
  }, [archivedPatients, searchTerm]);

  const displayList = showArchived ? archivedFiltered : activeFiltered;
  const isLoading = showArchived ? archivedStatus === 'loading' : status === 'loading';

  // Extra column for archived view — shows reason + date
  const archivedExtraColumn = {
    label: 'Discharge Reason',
    key: 'dischargeReason',
    width: '200px',
    render: (p: any) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-amber-700 truncate max-w-[180px]">
          {p.dischargeReason || '—'}
        </span>
        {p.dischargeDate && (
          <span className="text-xs text-gray-400">
            {new Date(p.dischargeDate).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </span>
        )}
      </div>
    ),
  };

  const columns = showArchived
    ? [...PATIENT_COLUMNS, archivedExtraColumn]
    : PATIENT_COLUMNS;

  return (
    <div className="w-full pt-4 px-4 sm:pt-6 sm:px-6 h-full flex flex-col bg-white overflow-hidden">

      {/* Header row */}
      <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
          {showArchived ? 'Archived Patients' : 'All Patients'}
          <span className="text-[#a7a18e] font-light">{displayList.length}</span>
        </div>

        <SearchContainer
          placeholder={showArchived ? 'Search archived...' : 'Search patients...'}
          onSearch={setSearchTerm}
          onAdd={() => {
            if (setActiveItem) {
              setActiveItem("PatientIntake");
            } else {
              navigate("/Screening");
            }
          }}
          addButtonText="Add Patient"
          onRefresh={() => {
            if (showArchived) {
              setArchivedStatus('idle');
              setArchivedPatients([]);
              // re-trigger useEffect
              setShowArchived(false);
              setTimeout(() => setShowArchived(true), 0);
            } else {
              dispatch(fetchPatients());
            }
          }}
          showRefresh={true}
          refreshing={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      {/* Active / Archived toggle */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setShowArchived(false); setSearchTerm(''); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !showArchived
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => { setShowArchived(true); setSearchTerm(''); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            showArchived
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Archived
          {archivedPatients.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
              {archivedPatients.length}
            </span>
          )}
        </button>
      </div>

      <DataTable<Patient>
        columns={columns as any}
        data={displayList}
        onRowClick={(patient) => navigate(`/Patient/${patient.id}`)}
        emptyMessage={
          showArchived
            ? (searchTerm ? `No archived matches for "${searchTerm}"` : 'No archived patients.')
            : (searchTerm ? `No matches for "${searchTerm}"` : 'No patients found.')
        }
        initialItemsPerPage={10}
      />
    </div>
  );
};

export default Patients;
