import { useState } from 'react';
import { MdClose, MdOutlineKeyboardArrowDown } from 'react-icons/md';
import { useEffect } from 'react';
import { hospitalService, type Hospital } from '../services/hospitalServices';
import HospitalSelector from './HospitalSelector';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (staffData: StaffFormData) => Promise<void>;
  organizationId?: string;
}

export interface StaffFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  hospital?: string;
}

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'staff', label: 'Staff / Auditor' }
];

const AddStaffModal = ({ isOpen, onClose, onSubmit }: AddStaffModalProps) => {
  const [formData, setFormData] = useState<StaffFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: '',
    phone: '',
    hospital: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  // Load hospitals on mount
  useEffect(() => {
    const loadHospitals = async () => {
      setLoadingHospitals(true);
      try {
        const availableHospitals = await hospitalService.getAvailableHospitals();
        setHospitals(availableHospitals);
      } catch (error) {
        console.error('Failed to load hospitals:', error);
      } finally {
        setLoadingHospitals(false);
      }
    };
    if (isOpen) {
      loadHospitals();
    }
  }, [isOpen]);

  // Hospital management
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [showHospitalSelector, setShowHospitalSelector] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.role) newErrors.role = 'Role is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Phone validation (if provided)
    if (formData.phone && formData.phone.trim() && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: '',
        phone: '',
        hospital: ''
      });
      onClose();
    } catch (error) {
      console.error('Failed to add staff member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Staff Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 w-full min-w-2xl">
          <div className="grid grid-cols-2 gap-6 w-full ">
            {/* Left column */}
            <div className="space-y-6">
              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  First Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                />
                {errors.firstName && <span className="text-red-500 text-xs mt-1">{errors.firstName}</span>}
              </div>

              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Email Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter email address"
                  disabled={isSubmitting}
                />
                {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email}</span>}
              </div>

              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Role
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className={`w-full px-3 py-3 pr-10 border rounded-lg appearance-none focus:outline-none focus:ring-0 focus:ring-[#008540] ${errors.role ? 'border-red-500' : 'border-gray-300'
                      }`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Role</option>
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  <MdOutlineKeyboardArrowDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                </div>
                {errors.role && <span className="text-red-500 text-xs mt-1">{errors.role}</span>}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Last Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${errors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                />
                {errors.lastName && <span className="text-red-500 text-xs mt-1">{errors.lastName}</span>}
              </div>

              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Enter phone number"
                  disabled={isSubmitting}
                />
                {errors.phone && <span className="text-red-500 text-xs mt-1">{errors.phone}</span>}
              </div>

              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Hospital
                  {(formData.role === 'doctor' || formData.role === 'nurse') && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <select
                      value={formData.hospital}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '__add_new__') {
                          setShowHospitalSelector(true);
                        } else {
                          handleInputChange('hospital', value);
                          const hospital = hospitals.find(h => h.id === value);
                          setSelectedHospital(hospital || null);
                        }
                      }}
                      className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-0 focus:ring-[#008540] disabled:opacity-50"
                      disabled={isSubmitting || loadingHospitals || (formData.role !== 'doctor' && formData.role !== 'nurse')}
                    >
                      <option value="">
                        {loadingHospitals ? 'Loading hospitals...' : 'Select Hospital'}
                      </option>
                      {hospitals.map(hospital => (
                        <option key={hospital.id} value={hospital.name}>
                          {hospital.name}
                        </option>
                      ))}
                      <option value="__add_new__" className="font-semibold">+ Add New Hospital</option>
                    </select>
                    <MdOutlineKeyboardArrowDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  </div>
                </div>
                {selectedHospital && (
                  <p className="text-xs text-gray-500 mt-1">{selectedHospital.address || selectedHospital.city || ''}</p>
                )}
                {(formData.role === 'doctor' || formData.role === 'nurse') && !formData.hospital && (
                  <p className="text-xs text-gray-500 mt-1">Required for clinical staff</p>
                )}
              </div>
            </div>

            {/* Password section - full width */}
            <div className="col-span-2 w-[97.5%] flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">
                Password
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isSubmitting}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Generate
                </button>
              </div>
              {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password}</span>}
              <p className="text-xs text-gray-500 mt-1">
                A temporary password. The staff member will be prompted to change it on first login.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Staff Member'
              )}
            </button>
          </div>
        </form>

        {/* Hospital Selector Modal */}
        {showHospitalSelector && (
          <HospitalSelector
            onHospitalSelected={(hospital) => {
              setSelectedHospital(hospital);
              handleInputChange('hospital', hospital.name);
              setShowHospitalSelector(false);
              // Reload hospitals list
              hospitalService.getAvailableHospitals()
                .then(setHospitals)
                .catch(console.error);
            }}
            onCreateNew={() => {
              // For now, just close - hospital creation happens in separate Hospital management page
              setShowHospitalSelector(false);
              alert('Please create the hospital from the Hospitals management page first, then select it here.');
            }}
            onCancel={() => setShowHospitalSelector(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AddStaffModal;