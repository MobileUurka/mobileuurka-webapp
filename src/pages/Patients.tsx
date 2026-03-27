import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { patientService } from '../services/patientServices';
import SearchContainer from "../components/SearchContainer";
import { PATIENT_COLUMNS, type Patient,  } from '../constants/patientColumns';
import DataTable from '../components/DataTable';

const Patients = ({ setActiveItem }: { setActiveItem?: (val: string) => void }) => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await patientService.getPatientsRiskOverview({ page: 1, limit: 100 });
      if (response.success) {
        // Flatten the data so DataTable sees everything at the top level
        console.log("API Response:", response.data);
        const flattenedData = response.data.map((item: any) => ({
          ...item.patient,       
          diagnosis: item.diagnosis,
          riskLevel: item.riskLevel,
          nextVisit: item.nextVisit,
          lastVisitDate: item.lastVisitDate,
          // Keep the original nested structure just in case
          originalData: item 
        }));
      
        setPatients(flattenedData);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const filteredPatients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return patients.filter((p) =>
      p.firstName?.toLowerCase().includes(term) ||
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
          onRefresh={fetchPatients}
          showRefresh={true}
          refreshing={loading}
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