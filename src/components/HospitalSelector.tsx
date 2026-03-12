
import { useState, useEffect } from 'react';
import { hospitalService, type Hospital } from '../services/hospitalServices';

interface HospitalSelectorProps {
  onHospitalSelected: (hospital: Hospital) => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

const HospitalSelector = ({ onHospitalSelected, onCreateNew, onCancel }: HospitalSelectorProps) => {
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    loadAllHospitals();
  }, []);

  const loadAllHospitals = async () => {
    setLoading(true);
    try {
      const hospitals = await hospitalService.getAllHospitals();
      setAllHospitals(hospitals);
    } catch (error) {
      console.error('Failed to load hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      setLoading(true);
      try {
        const hospitals = await hospitalService.getAllHospitals(term);
        setAllHospitals(hospitals);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    } else {
      loadAllHospitals();
    }
  };

  const handleLinkHospital = async (hospital: Hospital) => {
    setLinking(hospital.id);
    try {
      await hospitalService.linkHospitalToOrganization(hospital.id);
      onHospitalSelected(hospital);
    } catch (error: any) {
      console.error('Failed to link hospital:', error);
      alert('Failed to link hospital: ' + (error.message || 'Network error'));
    } finally {
      setLinking(null);
    }
  };

  const filteredHospitals = allHospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Select Hospital</h3>
          <p className="text-gray-600 text-sm mb-4">
            Choose an existing hospital from the registry or create a new one if yours isn't listed.
          </p>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search hospitals by name, city, or state..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008540]"
            />
          </div>
        </div>

        {/* Hospital List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading hospitals...</div>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                {searchTerm ? `No hospitals found matching "${searchTerm}"` : 'No hospitals found'}
              </div>
              <button
                onClick={onCreateNew}
                className="px-4 py-2 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors"
              >
                Create New Hospital
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className="border-b border-gray-200  p-3 hover:border-b-[#008540] transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="font-medium text-gray-900 truncate min-w-0 flex-1">
                          {hospital.name}
                        </div>

                        <div className="text-gray-600 shrink-0">
                          {hospital.address
                            ? hospital.address
                            : hospital.city || hospital.state || 'Location not specified'
                          }
                        </div>
                        {hospital.phone && (
                          <div className="text-gray-500 shrink-0">
                            {hospital.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLinkHospital(hospital)}
                      disabled={linking === hospital.id}
                      className="shrink-0 px-4 py-2 bg-[#008540] text-white rounded-lg hover:bg-[#007235] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linking === hospital.id ? 'Linking...' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onCreateNew}
              className="px-4 py-2 border border-[#008540] text-[#008540] rounded-lg hover:bg-[#008540] hover:text-white transition-colors"
            >
              Create New Hospital
            </button>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalSelector;