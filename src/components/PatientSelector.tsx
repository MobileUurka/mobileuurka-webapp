import { useState, useEffect } from 'react';
import { MdOutlineKeyboardArrowDown, MdSearch, MdClose } from 'react-icons/md';
import { patientService } from '../services/patientServices';
import { type PatientData } from '../types/patient';

interface PatientSelectorProps {
  value?: string; // patientId
  onChange: (patientId: string, patientName: string, patientData?: PatientData) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const PatientSelector = ({
  value,
  onChange,
  placeholder = "Select Patient",
  required = false,
  error
}: PatientSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);

  // Load patients on component mount
  useEffect(() => {
    loadPatients();
  }, []);

  // Find selected patient when value changes
  useEffect(() => {
    if (value && patients.length > 0) {
      const patient = patients.find(p => p.id === value);
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [value, patients]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      // Use the same endpoint as the Patients page for consistency
      const response = await patientService.getPatientsRiskOverview({ page: 1, limit: 100 });
      console.log('Patient API response:', response); // Debug log

      if (response.success && response.data) {
        // Handle the risk overview response structure
        const patientData = response.data.map((item: any) => ({
          id: item.patient.id,
          name: `${item.patient.firstName} ${item.patient.lastName}`,
          firstName: item.patient.firstName,
          lastName: item.patient.lastName,
          nationalId: item.patient.nationalId,
          hospital: item.patient.hospital,
          // Include other fields that might be useful
          ...item.patient
        }));

        setPatients(patientData);
      } else {
        console.error('Failed to load patients:', response);
        setPatients([]);
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const maskNationalId = (nationalId: string | number | undefined) => {
    if (!nationalId) return 'N/A';
    const idStr = nationalId.toString();
    if (idStr.length < 4) return idStr;
    const lastFour = idStr.slice(-4);
    const masked = '*'.repeat(Math.max(0, idStr.length - 4));
    return masked + lastFour;
  };

  const filteredPatients = Array.isArray(patients) ? patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.name?.toLowerCase().includes(searchLower) ||
      patient.firstName?.toLowerCase().includes(searchLower) ||
      patient.lastName?.toLowerCase().includes(searchLower) ||
      patient.nationalId?.toString().includes(searchTerm)
    );
  }) : [];

  const handlePatientSelect = (patient: PatientData) => {
    setSelectedPatient(patient);
    onChange(patient.id, patient.name || `${patient.firstName} ${patient.lastName}`, patient);
    setIsOpen(false);
    setSearchTerm('');
  };

  const displayText = selectedPatient
    ? `${selectedPatient.name || `${selectedPatient.firstName} ${selectedPatient.lastName}`} (${maskNationalId(selectedPatient.nationalId)})`
    : placeholder;

  return (
    <div className="relative w-full">
      {/* Main selector button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-3 pr-10 border rounded-lg cursor-pointer flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#008540] ${error ? 'border-red-500' : 'border-gray-300'
          } ${isOpen ? 'ring-2 ring-[#008540]' : ''}`}
        aria-required={required}
      >
        <span className={selectedPatient ? 'text-gray-900' : 'text-gray-500'}>
          {displayText}
        </span>
        <MdOutlineKeyboardArrowDown
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          size={20}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients..."
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#008540]"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <MdClose size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Patient list */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading patients...
              </div>
            ) : filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {patient.name || `${patient.firstName} ${patient.lastName}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {maskNationalId(patient.nationalId)} • {patient.hospital || 'No hospital assigned'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No patients found matching your search' : 'No patients available'}
              </div>
            )}
          </div>

          {/* Refresh button */}
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                loadPatients();
                setSearchTerm('');
              }}
              className="w-full text-sm text-[#008540] hover:text-[#007235] font-medium"
            >
              Refresh Patient List
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <span className="text-red-500 text-xs mt-1 block">{error}</span>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default PatientSelector;