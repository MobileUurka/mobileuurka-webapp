import { useState, useEffect } from 'react';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authServices';
import { hospitalService } from '../services/hospitalServices';
import { patientService } from '../services/patientServices';
import HospitalSelector from './HospitalSelector';
import PatientSelector from './PatientSelector';
import { type PatientData } from '../types/patient';

// Simple loading spinner component
const LoadingSpinner = ({ size = 20 }: { size?: number }) => (
  <svg
    className="animate-spin"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      className="opacity-25"
    />
    <path
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      fill="currentColor"
    />
  </svg>
);

// Utility functions for calculations
const calculateBMI = (weight: number, height: number): number => {
  if (!weight || !height || weight <= 0 || height <= 0) return 0;
  const heightInMeters = height / 100; // Convert cm to meters
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10; // Round to 1 decimal
};

const calculateMAP = (systolic: number, diastolic: number): number => {
  if (!systolic || !diastolic || systolic <= 0 || diastolic <= 0) return 0;
  return Math.round(((2 * diastolic) + systolic) / 3);
};

const calculateGestationWeek = (lastVisitDate: string, lastGestationWeek: number): number => {
  if (!lastVisitDate || !lastGestationWeek) return 0;

  try {
    const lastVisit = new Date(lastVisitDate);
    const today = new Date();
    const daysDifference = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDifference = Math.floor(daysDifference / 7);

    return Math.max(0, lastGestationWeek + weeksDifference);
  } catch (error) {
    console.error('Error calculating gestation week:', error);
    return 0;
  }
};

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  readonly?: boolean;
}

interface ScreeningFormProps {
  title: string;
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  isLastStep?: boolean;
}

const ScreeningForm = ({ fields, onSubmit, initialData = {}, isLastStep = false }: ScreeningFormProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hospitalOptions, setHospitalOptions] = useState<string[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [showHospitalSelector, setShowHospitalSelector] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [newHospitalData, setNewHospitalData] = useState({
    name: '',
    address: '',
    phone: '',
    city: '',
    state: ''
  });

  // Load hospital options for hospital dropdown
  useEffect(() => {
    const loadHospitals = async () => {
      const hospitalField = fields.find(field => field.name === 'hospital');
      if (hospitalField && hospitalField.type === 'select') {
        setLoadingHospitals(true);
        try {
          const hospitals = await hospitalService.getAvailableHospitals();
          const hospitalNames = hospitals.map(h => h.name);
          setHospitalOptions(hospitalNames);
        } catch (error) {
          console.error('Failed to load hospitals:', error);
          setHospitalOptions([]);
        } finally {
          setLoadingHospitals(false);
        }
      }
    };

    loadHospitals();
  }, [fields]);

  // Get current user data for editor fields
  useEffect(() => {
    const currentUser = authService.getUser();
    if (currentUser) {
      // Pre-populate editor fields with current user's name
      const editorFields = fields.filter(field => field.name === 'editor');
      if (editorFields.length > 0) {
        setFormData(prev => ({
          ...prev,
          editor: currentUser.name || currentUser.firstName + ' ' + currentUser.lastName || currentUser.email
        }));
      }
    }
  }, [fields]);

  // Split fields into pages (2 columns, 5 rows max = 10 fields per page)
  const fieldsPerPage = 10;
  const totalPages = Math.ceil(fields.length / fieldsPerPage);
  const currentFields = fields.slice(currentPage * fieldsPerPage, (currentPage + 1) * fieldsPerPage);

  // Handle patient selection and auto-fill gestation week
  const handlePatientSelection = async (patientId: string, patientName: string, patientData?: PatientData) => {
    handleInputChange('patientId', patientId);
    setFormData(prev => ({ ...prev, patientName }));

    // Auto-fill gestation week based on last visit
    if (patientData) {
      try {
        // Get complete patient profile to access visit history
        const response = await patientService.getPatientCompleteProfile(patientId);
        if (response.success && response.data?.visits && response.data.visits.length > 0) {
          // Find the most recent visit
          const visits = response.data.visits.sort((a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const lastVisit = visits[0];

          if (lastVisit.gestationWeek && lastVisit.date) {
            const currentGestationWeek = calculateGestationWeek(lastVisit.date, lastVisit.gestationWeek);
            if (currentGestationWeek > 0) {
              // Auto-fill gestation week fields
              setFormData(prev => ({
                ...prev,
                gestationWeek: currentGestationWeek,
                gestationweek: currentGestationWeek // Handle both naming conventions
              }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch patient visit history:', error);
      }
    }
  };

  const handleInputChange = (name: string, value: any) => {
    // Handle hospital selection trigger
    if (name === 'hospital' && value === '__SELECT_HOSPITAL__') {
      setShowHospitalSelector(true);
      return;
    }

    // Handle hospital creation trigger
    if (name === 'hospital' && value === '__CREATE_NEW__') {
      setShowHospitalModal(true);
      return;
    }

    // Update form data
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    // Auto-calculate BMI when height or weight changes
    if (name === 'height' || name === 'weight') {
      const height = name === 'height' ? value : newFormData.height;
      const weight = name === 'weight' ? value : newFormData.weight;

      if (height && weight) {
        const bmi = calculateBMI(Number(weight), Number(height));
        if (bmi > 0) {
          setFormData(prev => ({ ...prev, [name]: value, bmi }));
        }
      }
    }

    // Auto-calculate MAP when systolic or diastolic changes
    if (name === 'systolic' || name === 'diastolic') {
      const systolic = name === 'systolic' ? value : newFormData.systolic;
      const diastolic = name === 'diastolic' ? value : newFormData.diastolic;

      if (systolic && diastolic) {
        const map = calculateMAP(Number(systolic), Number(diastolic));
        if (map > 0) {
          setFormData(prev => ({ ...prev, [name]: value, map }));
        }
      }
    }

    // Clear errors for the field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleHospitalSelected = (hospital: any) => {
    // Add to options and select it
    setHospitalOptions(prev => {
      const newOptions = [...prev];
      if (!newOptions.includes(hospital.name)) {
        newOptions.push(hospital.name);
      }
      return newOptions;
    });
    setFormData(prev => ({ ...prev, hospital: hospital.name }));
    setShowHospitalSelector(false);
  };

  const handleCreateNewFromSelector = () => {
    setShowHospitalSelector(false);
    setShowHospitalModal(true);
  };

  const handleCreateHospital = async () => {
    try {
      if (!newHospitalData.name.trim()) {
        alert('Hospital name is required');
        return;
      }

      const newHospital = await hospitalService.createHospital(newHospitalData);

      // Add to options and select it
      setHospitalOptions(prev => [...prev, newHospital.name]);
      setFormData(prev => ({ ...prev, hospital: newHospital.name }));

      // Reset modal
      setShowHospitalModal(false);
      setNewHospitalData({
        name: '',
        address: '',
        phone: '',
        city: '',
        state: ''
      });
    } catch (error) {
      console.error('Failed to create hospital:', error);
      alert('Failed to create hospital. Please try again.');
    }
  };

  const validateCurrentPage = () => {
    const newErrors: Record<string, string> = {};

    currentFields.forEach(field => {
      if (field.required && (!formData[field.name] || formData[field.name] === '')) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllFields = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      if (field.required && (!formData[field.name] || formData[field.name] === '')) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentPage()) {
      if (currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (validateAllFields()) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
        // The error handling is done in the parent component
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const renderField = (field: FormField) => {
    const hasError = errors[field.name];
    const isReadonly = field.readonly || field.name === 'editor';

    // Use dynamic hospital options for hospital field
    const fieldOptions = field.name === 'hospital' ? hospitalOptions : field.options;

    return (
      <div key={field.name} className="w-[95%] flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
          {(field.name === 'bmi' || field.name === 'map') && (
            <span className="text-xs text-green-600 ml-2 font-normal">
              (Auto-calculated)
            </span>
          )}
          {(field.name === 'gestationWeek' || field.name === 'gestationweek') && formData[field.name] && (
            <span className="text-xs text-green-600 ml-2 font-normal">
              (Auto-filled from last visit)
            </span>
          )}
        </label>

        {/* Special handling for patientId field */}
        {field.name === 'patientId' ? (
          <PatientSelector
            value={formData[field.name] || ''}
            onChange={handlePatientSelection}
            placeholder={field.placeholder || 'Select Patient'}
            required={field.required}
            error={hasError}
          />
        ) : field.type === 'select' ? (
          <div className="relative">
            <select
              value={formData[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              disabled={isReadonly || (field.name === 'hospital' && loadingHospitals)}
              className={`w-full px-3 py-3 pr-10 border rounded-lg appearance-none focus:outline-none focus:ring-0 focus:ring-[#008540] ${hasError ? 'border-red-500' : 'border-gray-300'
                } ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {field.name === 'hospital' && loadingHospitals
                  ? 'Loading hospitals...'
                  : `Select ${field.label}`}
              </option>
              {fieldOptions?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
              {field.name === 'hospital' && (
                <>
                  <option value="__SELECT_HOSPITAL__">+ Select from Registry</option>
                  <option value="__CREATE_NEW__">+ Create New Hospital</option>
                </>
              )}
            </select>

            {/* Custom icon */}
            <MdOutlineKeyboardArrowDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={20}
            />
          </div>
        ) : field.type === 'textarea' ? (
          <textarea
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            readOnly={isReadonly}
            rows={3}
            className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] resize-none ${hasError ? 'border-red-500' : 'border-gray-300'
              } ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        ) : (

          <input
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder || (field.name === 'bmi' ? 'Will calculate automatically' : field.name === 'map' ? 'Will calculate automatically' : '')}
            readOnly={isReadonly}
            className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${hasError ? 'border-red-500' : 'border-gray-300'
              } ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        )}

        {hasError && (
          <span className="text-red-500 text-xs mt-1">{hasError}</span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#008540] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
            />
          </div>
        </div>
      </div> */}

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Left column - first 5 fields */}
        <div className="space-y-6">
          {currentFields.slice(0, Math.ceil(currentFields.length / 2)).map(renderField)}
        </div>

        {/* Right column - remaining fields */}
        <div className="space-y-6">
          {currentFields.slice(Math.ceil(currentFields.length / 2)).map(renderField)}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6">
        <button
          onClick={() => navigate('/Screening')}
          disabled={isSubmitting}
          className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>

        <div className="flex gap-3">
          {currentPage > 0 && (
            <button
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
          )}

          {currentPage < totalPages - 1 ? (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size={16} />
                  Submitting...
                </>
              ) : (
                isLastStep ? 'Submit' : 'Save & Continue'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hospital Creation Modal */}
      {showHospitalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Hospital</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hospital Name *
                </label>
                <input
                  type="text"
                  value={newHospitalData.name}
                  onChange={(e) => setNewHospitalData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                  placeholder="Enter hospital name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newHospitalData.address}
                  onChange={(e) => setNewHospitalData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                  placeholder="Enter address"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newHospitalData.city}
                    onChange={(e) => setNewHospitalData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={newHospitalData.state}
                    onChange={(e) => setNewHospitalData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                    placeholder="State"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={newHospitalData.phone}
                  onChange={(e) => setNewHospitalData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowHospitalModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHospital}
                className="flex-1 px-4 py-2 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors"
              >
                Create Hospital
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Selector Modal */}
      {showHospitalSelector && (
        <HospitalSelector
          onHospitalSelected={handleHospitalSelected}
          onCreateNew={handleCreateNewFromSelector}
          onCancel={() => setShowHospitalSelector(false)}
        />
      )}
    </div>
  );
};

export default ScreeningForm;