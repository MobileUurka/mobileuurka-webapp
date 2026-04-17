import { useEffect, useState, useMemo } from 'react';
import { hospitalService, type Hospital } from '../services/hospitalServices';
import { authService } from '../services/authServices';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchHospitals, invalidateHospitals } from '../store/hospitalsSlice';
import SearchContainer from "../components/SearchContainer";
import { HOSPITAL_COLUMNS } from '../constants/hospitalColumns';
import DataTable from '../components/DataTable';
import HospitalSelector from '../components/HospitalSelector';

const emptyForm = { name: '', address: '', phone: '', email: '', city: '', state: '', type: 'hospital' };

const HospitalPage = () => {
  const dispatch = useAppDispatch();
  const hospitals = useAppSelector(s => s.hospitals.data);
  const status = useAppSelector(s => s.hospitals.status);

  const [searchTerm, setSearchTerm] = useState('');
  const [showHospitalSelector, setShowHospitalSelector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHospitalData, setNewHospitalData] = useState(emptyForm);

  // Hospital.tsx fetches by org ID via a different endpoint — keep that working
  // by seeding the store if it's empty, otherwise use cached data
  useEffect(() => {
    if (status === 'idle') {
      const organization = authService.getOrganization();
      if (!organization?.id) return;
      dispatch(fetchHospitals());
    }
  }, [dispatch, status]);

  const handleHospitalSelected = (hospital: Hospital) => {
    setShowHospitalSelector(false);
    dispatch(invalidateHospitals());
    dispatch(fetchHospitals());
    alert(`${hospital.name} has been linked to your organization!`);
  };

  const handleCreateHospital = async () => {
    try {
      if (!newHospitalData.name.trim()) {
        alert('Hospital name is required');
        return;
      }
      await hospitalService.createHospital(newHospitalData);
      alert('Hospital created successfully!');
      setNewHospitalData(emptyForm);
      setShowCreateModal(false);
      dispatch(invalidateHospitals());
      dispatch(fetchHospitals());
    } catch (error: any) {
      console.error('Hospital creation error:', error);
      alert('Failed to create hospital: ' + (error.message || 'Network error'));
    }
  };

  const filteredHospitals = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return hospitals.filter((h) =>
      h.name?.toLowerCase().includes(term) ||
      h.address?.toLowerCase().includes(term) ||
      h.city?.toLowerCase().includes(term) ||
      h.state?.toLowerCase().includes(term) ||
      h.type?.toLowerCase().includes(term)
    );
  }, [hospitals, searchTerm]);

  return (
    <div className="w-full pt-4 px-4 sm:pt-6 sm:px-6 h-full flex flex-col bg-white overflow-hidden">
      <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
          Hospitals <span className='text-[#a7a18e] font-light'>{filteredHospitals.length}</span>
        </div>

        <SearchContainer
          placeholder="Search hospitals..."
          onSearch={setSearchTerm}
          onAdd={() => setShowHospitalSelector(true)}
          addButtonText="Link Hospital"
          onRefresh={() => { dispatch(invalidateHospitals()); dispatch(fetchHospitals()); }}
          showRefresh={true}
          refreshing={status === 'loading'}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <DataTable<Hospital>
        columns={HOSPITAL_COLUMNS}
        data={filteredHospitals}
        emptyMessage={searchTerm ? `No hospitals found matching "${searchTerm}"` : "No hospitals found."}
        initialItemsPerPage={10}
      />

      {showHospitalSelector && (
        <HospitalSelector
          onHospitalSelected={handleHospitalSelected}
          onCreateNew={() => { setShowHospitalSelector(false); setShowCreateModal(true); }}
          onCancel={() => setShowHospitalSelector(false)}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Hospital</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name *</label>
                <input
                  type="text"
                  value={newHospitalData.name}
                  onChange={(e) => setNewHospitalData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                  placeholder="Enter hospital name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newHospitalData.type}
                  onChange={(e) => setNewHospitalData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                >
                  <option value="hospital">Hospital</option>
                  <option value="clinic">Clinic</option>
                  <option value="health_center">Health Center</option>
                  <option value="pharmacy">Pharmacy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={newHospitalData.address}
                  onChange={(e) => setNewHospitalData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540] resize-none"
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newHospitalData.city}
                    onChange={(e) => setNewHospitalData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={newHospitalData.state}
                    onChange={(e) => setNewHospitalData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newHospitalData.phone}
                    onChange={(e) => setNewHospitalData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newHospitalData.email}
                    onChange={(e) => setNewHospitalData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
                    placeholder="Email address"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
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
    </div>
  );
};

export default HospitalPage;
