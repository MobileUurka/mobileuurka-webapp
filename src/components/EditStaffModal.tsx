import { useState, useEffect } from 'react';
import { MdClose, MdOutlineKeyboardArrowDown } from 'react-icons/md';
import type { User } from '../services/userServices';
import { hospitalService, type Hospital } from '../services/hospitalServices';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (staffData: EditStaffFormData) => Promise<void>;
  staff: User | null;
}

export interface EditStaffFormData {
  firstName?: string;
  lastName?: string;
  role?: string;
  hospitalId?: string;
  phone?: string;
}

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'staff', label: 'Staff / Auditor' }
];

const EditStaffModal = ({ isOpen, onClose, onSubmit, staff }: EditStaffModalProps) => {
  const [formData, setFormData] = useState<EditStaffFormData>({
    firstName: '',
    lastName: '',
    role: '',
    phone: '',
    hospitalId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Initialize form with staff data
  useEffect(() => {
    if (isOpen && staff) {
      setFormData({
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
        role: staff.role || '',
        phone: (staff as any).phone || '',
        hospitalId: (staff as any).hospitalId || (staff as any).hospital_id || ''
      });
      
      // Load hospital if clinical staff
      if (staff.role === 'doctor' || staff.role === 'nurse') {
        const hospital = hospitals.find(h => h.id === ((staff as any).hospitalId || (staff as any).hospital_id));
        setSelectedHospital(hospital || null);
      }
    }
  }, [isOpen, staff, hospitals]);

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

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate role change - hospital required for doctor/nurse
    if (formData.role && (formData.role === 'doctor' || formData.role === 'nurse')) {
      if (!formData.hospitalId) {
        newErrors.hospitalId = 'Hospital is required for clinical staff';
      }
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
      // Only send changed fields
      const updateData: EditStaffFormData = {};
      
      if (formData.firstName !== (staff?.firstName || '')) {
        updateData.firstName = formData.firstName;
      }
      if (formData.lastName !== (staff?.lastName || '')) {
        updateData.lastName = formData.lastName;
      }
      if (formData.role !== (staff?.role || '')) {
        updateData.role = formData.role;
      }
      if (formData.hospitalId !== ((staff as any).hospitalId || (staff as any).hospital_id || '')) {
        updateData.hospitalId = formData.hospitalId;
      }
      if (formData.phone !== ((staff as any).phone || '')) {
        updateData.phone = formData.phone;
      }

      // Only submit if there are changes
      if (Object.keys(updateData).length > 0) {
        await onSubmit(updateData);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to update staff member:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Staff Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className=" p-6 w-full !max-w-none" >
          <div className="grid grid-cols-2 gap-6 w-full">
            {/* Left column */}
            <div className="space-y-6">
              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                  disabled={isSubmitting}
                />
                {errors.firstName && <span className="text-red-500 text-xs mt-1">{errors.firstName}</span>}
              </div>

              <div className="w-[95%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="relative">
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className={`w-full px-3 py-3 pr-10 border rounded-lg appearance-none focus:outline-none focus:ring-0 focus:ring-[#008540] ${
                      errors.role ? 'border-red-500' : 'border-gray-300'
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
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
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
                  className={`px-3 py-3 border rounded-lg focus:outline-none focus:ring-0 focus:ring-[#008540] ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                  disabled={isSubmitting}
                />
                {errors.phone && <span className="text-red-500 text-xs mt-1">{errors.phone}</span>}
              </div>
            </div>

            {/* Hospital - only for clinical staff */}
            {(formData.role === 'doctor' || formData.role === 'nurse') && (
              <div className="col-span-2 w-[97.5%] flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Hospital
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <select
                      value={formData.hospitalId}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleInputChange('hospitalId', value);
                        const hospital = hospitals.find(h => h.id === value);
                        setSelectedHospital(hospital || null);
                      }}
                      className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-0 focus:ring-[#008540] disabled:opacity-50"
                      disabled={isSubmitting || loadingHospitals}
                    >
                      <option value="">
                        {loadingHospitals ? 'Loading hospitals...' : 'Select Hospital'}
                      </option>
                      {hospitals.map(hospital => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                    <MdOutlineKeyboardArrowDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  </div>
                </div>
                {selectedHospital && (
                  <p className="text-xs text-gray-500 mt-1">{selectedHospital.address || selectedHospital.city || ''}</p>
                )}
                {!formData.hospitalId && (
                  <p className="text-xs text-gray-500 mt-1">Required for clinical staff</p>
                )}
                {errors.hospitalId && <span className="text-red-500 text-xs mt-1">{errors.hospitalId}</span>}
              </div>
            )}
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
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStaffModal;
