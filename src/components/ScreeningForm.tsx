import { useState, useEffect } from 'react';
import { MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';
import { hospitalService } from '../services/hospitalServices';
import { patientService } from '../services/patientServices';
import HospitalSelector from './HospitalSelector';
import PatientSelector from './PatientSelector';
import { usePerformanceTimer } from '../hooks/usePerformanceTimer';
import { useAuth } from '../contexts/AuthContext';

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

// ── Chip state: unset (= uncertain by default) → yes → no → unset
// Stored as: '' | 'yes' | 'no'   ('' is treated as 'unknown' on submit)
type ChipValue = '' | 'yes' | 'no';

const CHIP_CYCLE: ChipValue[] = ['', 'yes', 'no'];

interface ChipOption {
  /** The field name in formData this chip controls */
  field: string;
  /** Display label on the chip */
  label: string;
  /** If yes, show a number input beneath with this field name */
  countField?: string;
  /** Label for the count input */
  countLabel?: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'chip-group';
  required?: boolean;
  options?: string[];
  /** chip-group: list of chips in this group */
  chips?: ChipOption[];
  placeholder?: string;
  readonly?: boolean;

  // NEW
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  max?: string | number;
  min?: string | number;

  dependsOn?: {
    field: string;
    value: any | any[];
  };
}

type LastVisitData = {
  visitNumber: number;
  gestationWeek: number;
};

interface ScreeningFormProps {
  title: string;
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  initialData?: Record<string, any>;
  isLastStep?: boolean;
}

const ScreeningForm = ({ title, fields, onSubmit, initialData = {}, isLastStep = false }: ScreeningFormProps) => {
  const navigate = useNavigate();
  const { user, isReady } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Performance timer — starts when the form mounts, stops on successful submit
  const perfTimer = usePerformanceTimer(title);
  useEffect(() => {
    perfTimer.start();
    return () => perfTimer.cancel(); // clean up if user navigates away
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  const location = useLocation();

  useEffect(() => {
    // Access the state object
    const state = location.state;

    if (state) {
      console.log("Patient ID:", state.patientId);
      console.log("Patient Name:", state.patientName);

      handlePatientSelection(state.patientId, state.patientName)
      // You can also initialize local state here if needed
      // setLocalPatient(state.patientData);
    } else {
      console.warn("No navigation state found. Handle redirect or fallback.");
    }
  }, [location]); // Re-run if location changes


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

  // Populate editor field once the auth context is ready (encryption key is in memory)
  useEffect(() => {
    if (!isReady || !user) return;
    const hasEditorField = fields.some(f => f.name === 'editor');
    if (!hasEditorField) return;

    const editorName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.name || user.email || '';

    setFormData(prev => ({
      ...prev,
      user_id: user.id,
      editor: editorName,
    }));
  }, [isReady, user, fields]);

  useEffect(() => {
    if (formData.gestationWeek > 0) {
      const getTrimester = (gestationWeek: number): number => {
        if (gestationWeek <= 0) return 0;
        if (gestationWeek <= 12) return 1;
        if (gestationWeek <= 26) return 2;
        return 3;
      };

      const weekNumber = Number(formData.gestationWeek);

      setFormData(prev => ({
        ...prev,
        trimester: getTrimester(weekNumber) // Call the function here
      }));
    }
  }, [formData.gestationWeek])


  // Split fields into pages:
  // – Each chip-group field gets its own dedicated page
  // – Regular fields are grouped up to 10 per page
  const pages: FormField[][] = (() => {
    const result: FormField[][] = [];
    let regularBuffer: FormField[] = [];

    const flushBuffer = () => {
      if (regularBuffer.length === 0) return;
      // Slice into chunks of 10
      for (let i = 0; i < regularBuffer.length; i += 10) {
        result.push(regularBuffer.slice(i, i + 10));
      }
      regularBuffer = [];
    };

    for (const field of fields) {
      if (field.type === 'chip-group') {
        flushBuffer();
        result.push([field]);
      } else {
        regularBuffer.push(field);
      }
    }
    flushBuffer();

    return result;
  })();

  const totalPages = pages.length;
  const currentFields = pages[currentPage] ?? [];
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [lastVisitData, setLastVisitData] = useState<LastVisitData | null>(null);

  // Handle patient selection and auto-fill gestation week
  const handlePatientSelection = async (patientId: string, patientName: string) => {
    handleInputChange('patientId', patientId);
    setFormData(prev => ({ ...prev, patientName }));

    // Auto-fill gestation week based on last visit
    if (patientId) {
      setIsAutoFilling(true);

      try {
        // Get complete patient profile to access visit history
        const response = await patientService.getPatientCompleteProfile(patientId);
        if (response.success && response.data?.visits && response.data.visits.length > 0) {
          // Find the most recent visit
          const visits = response.data.visits.sort((a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const lastVisit = visits[0];

          setLastVisitData({
            visitNumber: lastVisit.visitNumber,
            gestationWeek: lastVisit.gestationWeek
          });

          if (lastVisit.gestationWeek && lastVisit.date) {
            const currentGestationWeek = calculateGestationWeek(lastVisit.date, lastVisit.gestationWeek);
            if (currentGestationWeek > 0) {
              // Auto-fill gestation week fields

              setIsAutoFilling(false)

              setFormData(prev => ({
                ...prev,
                gestationWeek: currentGestationWeek,
                visitNumber: lastVisit.visitNumber,
                gestationweek: currentGestationWeek // Handle both naming conventions
              }));
            }
          }
        }
        else{
            setIsAutoFilling(false)
            setFormData(prev => ({
                ...prev,
                gestationWeek: 1,
                visitNumber: 1,
                gestationweek: 1// Handle both naming conventions
              }));
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

    // Auto-calculate EDD when last menstrual period is entered
    if (name === 'lastPeriodDate' && value) {
      try {
        const lmpDate = new Date(value);
        // Add 280 days (40 weeks) to LMP to get EDD
        const eddDate = new Date(lmpDate.getTime() + (280 * 24 * 60 * 60 * 1000));
        const eddString = eddDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

        setFormData(prev => ({
          ...prev,
          [name]: value,
          estimatedDueDate: eddString
        }));
      } catch (error) {
        console.error('Error calculating EDD:', error);
        setFormData(prev => ({ ...prev, [name]: value }));
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

  const isFieldVisible = (field: FormField) => {
    if (!field.dependsOn) return true;
    const dependentFieldValue = formData[field.dependsOn.field];
    if (Array.isArray(field.dependsOn.value)) {
      return field.dependsOn.value.includes(dependentFieldValue);
    }
    return dependentFieldValue === field.dependsOn.value;
  };

  const validateFields = (fieldsToValidate: FormField[]) => {
    const newErrors: Record<string, string> = {};

    fieldsToValidate.forEach(field => {
      // chip-group fields are containers — validate their individual chips instead
      if (field.type === 'chip-group') return;

      if (!isFieldVisible(field)) return;

      const value = formData[field.name];

      // REQUIRED VALIDATION
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        newErrors[field.name] = `${field.label} is required`;
        return;
      }

      // Skip further validation if empty
      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return;
      }

      const stringValue = String(value);

      // -----------------------------
      // STRING LENGTH VALIDATION
      // -----------------------------
      if (
        field.minLength &&
        stringValue.length < field.minLength
      ) {
        newErrors[field.name] =
          `${field.label} must be at least ${field.minLength} characters`;
      }

      if (
        field.maxLength &&
        stringValue.length > field.maxLength
      ) {
        newErrors[field.name] =
          `${field.label} must not exceed ${field.maxLength} characters`;
      }

      // -----------------------------
      // PATTERN VALIDATION (REGEX)
      // -----------------------------
      if (
        field.pattern &&
        !field.pattern.test(stringValue)
      ) {
        newErrors[field.name] =
          field.patternMessage || `Invalid ${field.label}`;
      }

      // -----------------------------
      // NUMBER VALIDATION (MIN / MAX)
      // -----------------------------
      if (field.type === 'number') {
        const numericValue = Number(value);

        if (isNaN(numericValue)) {
          newErrors[field.name] = `${field.label} must be a number`;
          return;
        }

        if (
          field.min !== undefined &&
          numericValue < Number(field.min)
        ) {
          newErrors[field.name] =
            `${field.label} must be at least ${field.min}`;
        }

        if (
          field.max !== undefined &&
          numericValue > Number(field.max)
        ) {
          newErrors[field.name] =
            `${field.label} must not exceed ${field.max}`;
        }
      }
    });

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const validateCurrentPage = () => {
    return validateFields(currentFields);
  };

  const validateAllFields = () => {
    return validateFields(fields);
  };

  const handleNext = () => {
    if (validateCurrentPage() && validateBusinessRules()) {
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
    if (validateAllFields() && validateBusinessRules()) {
      setIsSubmitting(true);
      try {
        const cleanedFormData = { ...formData };
        fields.forEach(field => {
          if (field.type === 'chip-group') {
            // Remove the synthetic group key — it's not a DB column
            delete cleanedFormData[field.name];
            // Any chip left unset (= Uncertain) maps to 'unknown' for the backend
            field.chips?.forEach(chip => {
              if (!cleanedFormData[chip.field]) {
                cleanedFormData[chip.field] = 'unknown';
              }
            });
            return;
          }
          if (!isFieldVisible(field)) {
            if (field.type === 'number') {
              cleanedFormData[field.name] = 0;
            } else {
              cleanedFormData[field.name] = '';
            }
          }
        });

        await onSubmit(cleanedFormData);
        perfTimer.stop(); // record duration on success
      } catch (error) {
        console.error('Form submission error:', error);
        // The error handling is done in the parent component
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ── Chip group renderer ──────────────────────────────────────────────────
  const renderChipGroup = (field: FormField) => {
    const chips = field.chips ?? [];

    return (
      <div key={field.name} className="col-span-1 lg:col-span-2">
        {/* Label — stacked on mobile, inline on desktop */}
        <div className="mb-1">
          <p className="text-sm font-medium text-gray-700">{field.label}</p>
          <p className="text-xs text-gray-400 my-2">(optional — Unselected defaults to Uncertain)</p>
        </div>

        {/* Compact legend */}
        <div className="flex items-center gap-4 mb-3">
          {([
            ['bg-[#008540]', 'Yes'],
            ['bg-red-400',   'No'],
            ['bg-gray-300',  'Uncertain'],
          ] as const).map(([dot, lbl]) => (
            <span key={lbl} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {lbl}
            </span>
          ))}
        </div>

        {/* Card list — 2 columns on desktop to use the full width */}
        <div className="rounded-xl border border-gray-200 bg-[#F6F6F6] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
          {chips.map((chip) => {
            const current = (formData[chip.field] ?? '') as ChipValue;
            const isYes = current === 'yes';
            const isNo  = current === 'no';

            const handleChipClick = () => {
              const next = CHIP_CYCLE[(CHIP_CYCLE.indexOf(current) + 1) % CHIP_CYCLE.length];
              handleInputChange(chip.field, next);
              if (next !== 'yes' && chip.countField) {
                handleInputChange(chip.countField, '');
              }
            };

            const dotColor =
              isYes ? 'bg-[#008540]' :
              isNo  ? 'bg-red-400'   :
              'bg-gray-300';

            const rowBg =
              isYes ? 'bg-green-50' :
              isNo  ? 'bg-red-50'   :
              'bg-white';

            const stateLabel =
              isYes ? 'Yes' :
              isNo  ? 'No'  :
              'Uncertain';

            const stateLabelColor =
              isYes ? 'text-[#008540]' :
              isNo  ? 'text-red-500'   :
              'text-gray-400';

            return (
              <div key={chip.field} className={`border-b border-gray-200 ${rowBg}`}>
                {/* Toggle row */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent focus stealing
                    handleChipClick();
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 text-left
                    transition-colors duration-100 active:opacity-70 cursor-pointer
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                    <span className="text-sm text-gray-700 truncate">{chip.label}</span>
                  </div>

                  <span className={`text-xs font-medium shrink-0 ml-3 ${stateLabelColor}`}>
                    {stateLabel}
                  </span>
                </button>

                {/* Count input — shown below the row when Yes and a countField exists */}
                {isYes && chip.countField && (
                  <div className="px-4 pb-3 lg:px-6 lg:pb-4">
                    <label className="block text-xs text-gray-500 mb-1">
                      {chip.countLabel ?? 'Enter count'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData[chip.countField] ?? ''}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        handleInputChange(
                          chip.countField!,
                          e.target.value === '' || n <= 0 ? '' : n
                        );
                      }}
                      placeholder="Enter number"
                      className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#008540]"
                    />
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  const renderField = (field: FormField) => {
    if (!isFieldVisible(field)) return null;

    // Chip-group fields span full width — rendered differently
    if (field.type === 'chip-group') return renderChipGroup(field);

    const hasError = errors[field.name];
    const isReadonly = field.readonly || field.name === 'editor';

    // Use dynamic hospital options for hospital field
    const fieldOptions = field.name === 'hospital' ? hospitalOptions : field.options;

    return (
      <div key={field.name} className="w-full lg:w-[95%] flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
          {(field.name === 'bmi' || field.name === 'map') && (
            <span className="text-xs text-green-600 ml-2 font-normal">
              (Auto-calculated)
            </span>
          )}

          {(field.name === 'gestationWeek' || field.name === 'gestationweek' || field.name == 'visitNumber') && (
            <span className="text-xs text-green-600 ml-2 font-normal">
              {isAutoFilling ? "(Auto-filling from last visit...)" :
                formData[field.name] != 0 ? "(Auto-filled from last visit)" : "(No previous Visits)"}
            </span>
          )}
          {field.name === 'estimatedDueDate' && formData.lastPeriodDate && formData[field.name] && (
            <span className="text-xs text-green-600 ml-2 font-normal">
              (Auto-calculated from LMP)
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
              className={`capitalize w-full px-3 py-3 pr-10 border rounded-lg appearance-none focus:outline-none focus:ring-0 focus:ring-[#008540] ${hasError ? 'border-red-500' : 'border-gray-300'
                } ${isReadonly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="" className='capitalize'>
                {field.name === 'hospital' && loadingHospitals
                  ? 'Loading hospitals...'
                  : `Select ${field.label}`}
              </option>
              {fieldOptions?.map(option => (
                <option className='capitalize' key={option} value={option}>{option}</option>
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
            value={formData[field.name] ?? ''}
            onChange={(e) => {
              let value: any = e.target.value;

              // PHONE VALIDATION
              if (
                field.name === 'phone' ||
                field.name === 'emergencyContactPhone'
              ) {
                value = value.replace(/\D/g, '').slice(0, 10);
              }

              // NATIONAL ID VALIDATION
              if (field.name === 'nationalId') {
                value = value.replace(/\D/g, '').slice(0, 8);
              }

              if (field.type === 'number') {
                value = value === '' ? '' : Number(value);
              }

              handleInputChange(field.name, value);
            }}
            placeholder={
              field.placeholder ||
              (
                field.name === 'bmi'
                  ? 'Will calculate automatically'
                  : field.name === 'map'
                    ? 'Will calculate automatically'
                    : ''
              )
            }
            readOnly={isReadonly}
            min={field.min}
            max={field.max}
            maxLength={field.maxLength}
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

  const validateBusinessRules = () => {
    const newErrors: Record<string, string> = {};

    // Visit-progression rules only apply to the Visits form, which is the only
    // form that has both visitNumber and gestationWeek together. Other forms
    // (Allergy, Triage, Lab, etc.) that share gestationWeek should not be
    // blocked by these sequential constraints.
    const hasVisitNumberField = fields.some(f => f.name === 'visitNumber');

    if (hasVisitNumberField && lastVisitData?.visitNumber != null) {
      const visitNumber = Number(formData.visitNumber);
      if (visitNumber <= lastVisitData.visitNumber) {
        newErrors.visitNumber =
          `Visit number must be greater than last visit (${lastVisitData.visitNumber})`;
      }
    }

    if (hasVisitNumberField && lastVisitData?.gestationWeek != null) {
      const gestationWeek = Number(formData.gestationWeek);
      if (gestationWeek <= lastVisitData.gestationWeek) {
        newErrors.gestationWeek =
          `Gestation week must be greater than last recorded (${lastVisitData.gestationWeek})`;
      }
    }

    setErrors(prev => ({ ...prev, ...newErrors }));

    return Object.keys(newErrors).length === 0;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {currentFields.map(field =>
          field.type === 'chip-group'
            ? renderChipGroup(field)
            : renderField(field)
        )}
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