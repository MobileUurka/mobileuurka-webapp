import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPatients } from '../store/patientsSlice';
import SearchContainer from "../components/SearchContainer";
import { PATIENT_COLUMNS, type Patient } from '../constants/patientColumns';
import DataTable from '../components/DataTable';

const Patients = ({ setActiveItem }: { setActiveItem?: (val: string) => void }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const patients = useAppSelector(s => s.patients.data);
  const status = useAppSelector(s => s.patients.status);
  const [searchTerm, setSearchTerm] = useState('');

  // Fires on mount (status starts as 'idle') and again whenever a socket event
  // calls invalidatePatients() which resets status back to 'idle'.
  // Existing rows stay visible during background re-fetches — no flicker.
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPatients());
    }
  }, [status, dispatch]);

  const filteredPatients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return patients.filter((p) =>
      p.firstName?.toLowerCase().includes(term) ||
      p.name?.toLowerCase().includes(term) ||
      p.lastName?.toLowerCase().includes(term) ||
      p.nationalId?.includes(term) ||
      p.hospital?.toLowerCase().includes(term)
    );
  }, [patients, searchTerm]);

  return (
    <div className="w-full pt-4 px-4 sm:pt-6 sm:px-6 h-full flex flex-col bg-white overflow-hidden">
      <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
          All Patients <span className='text-[#a7a18e] font-light'>{filteredPatients.length}</span>
        </div>

        <SearchContainer
          placeholder="Search patients..."
          onSearch={setSearchTerm}
          onAdd={() => {
            if (setActiveItem) {
              setActiveItem("PatientIntake");
            } else {
              navigate("/Screening");
            }
          }}
          addButtonText="Add Patient"
          onRefresh={() => dispatch(fetchPatients())}
          showRefresh={true}
          refreshing={status === 'loading'}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <DataTable<Patient>
        columns={PATIENT_COLUMNS}
        data={filteredPatients}
        onRowClick={(patient) => navigate(`/Patient/${patient.id}`)}
        emptyMessage={searchTerm ? `No matches for "${searchTerm}"` : "No patients found."}
        initialItemsPerPage={10}
      />
    </div>
  );
};

export default Patients;
