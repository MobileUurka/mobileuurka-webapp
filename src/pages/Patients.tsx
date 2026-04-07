import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { patientService } from '../services/patientServices';
import SearchContainer from "../components/SearchContainer";
import { PATIENT_COLUMNS, type Patient, formatDiagnosis } from '../constants/patientColumns';
import DataTable from '../components/DataTable';
import { IoIosWarning } from 'react-icons/io';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

// Mobile Patient Card Component
const PatientCard = ({ patient, onClick }: { patient: Patient; onClick: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  const getRiskColor = (risk: string) => {
    const riskLower = risk?.toLowerCase();
    switch (riskLower) {
      case 'high':
        return { text: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-600' };
      case 'mid':
        return { text: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-600' };
      case 'low':
        return { text: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-600' };
      default:
        return { text: 'text-gray-600', bg: 'bg-gray-50', dot: 'bg-gray-600' };
    }
  };

  const formatNextVisit = (nextVisit?: string) => {
    if (!nextVisit) return '—';
    try {
      const date = new Date(nextVisit);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });

      let colorClass = 'text-gray-700 bg-gray-50';
      if (diffDays < 0) colorClass = 'text-red-700 bg-red-50';
      else if (diffDays <= 7) colorClass = 'text-orange-700 bg-orange-50';
      else if (diffDays <= 30) colorClass = 'text-blue-700 bg-blue-50';

      return { date: formattedDate, colorClass };
    } catch {
      return { date: 'Invalid date', colorClass: 'text-gray-400' };
    }
  };

  const riskColors = getRiskColor(patient.riskLevel);
  const nextVisitInfo = formatNextVisit(patient.nextVisit);
  const diagnosis = formatDiagnosis(patient.diagnosis);
  const hasValidDiagnosis = diagnosis &&
    diagnosis !== "No diagnosis records" &&
    diagnosis !== "No diagnosis data found" &&
    diagnosis !== "Suspected to have ";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
      {/* Main card content - always visible */}
      <div className="flex items-center justify-between" onClick={onClick}>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-[#e5decb] flex items-center justify-center text-sm text-gray-700 shrink-0">
            {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">
              {patient.firstName} {patient.lastName}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              ID: *****{String(patient.nationalId || "").slice(-4)}
            </p>
          </div>
        </div>

        {/* Risk badge */}
        {patient.riskLevel && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${riskColors.text} ${riskColors.bg}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${riskColors.dot}`} />
            {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)}
          </div>
        )}
      </div>

      {/* Expandable section toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="flex items-center justify-center w-full mt-3 pt-3 border-t border-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="text-xs mr-1">
          {expanded ? 'Less details' : 'More details'}
        </span>
        {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hospital</label>
            <p className="text-sm text-gray-900 mt-1">{patient.hospital || '—'}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next Visit</label>
            <div className="mt-1">
              {typeof nextVisitInfo === 'object' ? (
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${nextVisitInfo.colorClass}`}>
                  {nextVisitInfo.date}
                </span>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suspected Diseases</label>
            <div className="flex items-start gap-2 mt-1">
              {hasValidDiagnosis && (
                <IoIosWarning
                  className="text-orange-500 bg-orange-100 rounded-full p-0.5 mt-0.5 shrink-0"
                  size={16}
                />
              )}
              <p className="text-sm text-gray-900 leading-relaxed">
                {hasValidDiagnosis ? diagnosis : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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