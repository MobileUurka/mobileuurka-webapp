import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hospitalService, type Hospital } from '../services/hospitalServices';
import { authService } from '../services/authServices';

function HospitalSetup() {
    const [setupType, setSetupType] = useState<'join' | 'create' | null>(null);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingUserData, setPendingUserData] = useState<any>(null);
    const [paymentData, setPaymentData] = useState<any>(null);

    // New hospital form data
    const [newHospital, setNewHospital] = useState({
        name: '',
        type: 'private' as 'private' | 'public',
        address: '',
        phone: '',
        email: ''
    });

    const navigate = useNavigate();
    const location = useLocation();

    // Get data from navigation state
    const email = location.state?.email || '';
    
    useEffect(() => {
        // Get data from navigation state
        if (location.state?.pendingUserData) {
            setPendingUserData(location.state.pendingUserData);
        }
        if (location.state?.paymentData) {
            setPaymentData(location.state.paymentData);
        }

        // If no email or pending user data, redirect to signup
        if (!email) {
            navigate('/auth', {
                state: { message: 'Please complete the signup process first.' }
            });
        }
    }, [email, location.state, navigate]);

    const handleSearch = async (term: string) => {
        if (term.length < 2) {
            setHospitals([]);
            return;
        }

        setLoading(true);
        try {
            const results = await hospitalService.searchHospitals(term);
            setHospitals(results);
        } catch (err) {
            console.error('Search failed:', err);
            setHospitals([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        handleSearch(term);
    };

    const handleHospitalSelect = (hospital: Hospital) => {
        setSelectedHospital(hospital);
        setError(null);
    };

    const handleNewHospitalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewHospital(prev => ({
            ...prev,
            [name]: value
        }));
        setError(null);
    };

    const handleComplete = async () => {
        setLoading(true);
        setError(null);

        try {
            let hospitalData: any = { hospitals: [] };

            if (setupType === 'join') {
                if (!selectedHospital) {
                    setError('Please select a hospital');
                    return;
                }
                
                hospitalData.hospitals.push({
                    id: selectedHospital.id,
                    action: 'join'
                });
                
            } else if (setupType === 'create') {
                if (!newHospital.name || !newHospital.address) {
                    setError('Please fill in all required fields');
                    return;
                }
                
                hospitalData.hospitals.push({
                    action: 'create',
                    data: {
                        name: newHospital.name,
                        type: newHospital.type,
                        address: newHospital.address,
                        phone: newHospital.phone,
                        email: newHospital.email
                    }
                });
            }

            // Now create the organization with all the collected data
            const response = await authService.completeOrganizationCreation({
                email: email,
                paymentData: paymentData,
                hospitalData: hospitalData
            });

            if (response.success) {
                console.log('✅ Organization created successfully');

                // Navigate to dashboard after successful setup
                navigate('/dashboard', {
                    state: {
                        message: 'Organization created successfully! Welcome to your dashboard.'
                    }
                });
            }

        } catch (err: any) {
            console.error('❌ Organization creation failed:', err);
            setError(err.message || 'Setup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        // Allow skipping hospital setup - create organization without hospitals
        setLoading(true);
        setError(null);

        try {
            const response = await authService.completeOrganizationCreation({
                email: email,
                paymentData: paymentData,
                hospitalData: { hospitals: [] } // No hospitals
            });

            if (response.success) {
                navigate('/dashboard', {
                    state: {
                        message: 'Welcome to your dashboard! You can set up your hospital later in settings.'
                    }
                });
            }
        } catch (err: any) {
            console.error('❌ Organization creation failed:', err);
            setError(err.message || 'Failed to complete setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!setupType) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                    {pendingUserData && (
                        <div className="text-center mb-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                <p className="text-blue-800">
                                    <strong>{pendingUserData.firstName} {pendingUserData.lastName}</strong>
                                </p>
                                <p className="text-blue-600 text-sm">
                                    Setting up: <strong>{pendingUserData.organizationName}</strong>
                                </p>
                                {paymentData && (
                                    <p className="text-green-600 text-xs mt-1">
                                        ✅ Payment completed ({paymentData.currency} {paymentData.amount})
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hospital Setup</h1>
                        <p className="text-gray-600">How would you like to set up your hospital?</p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => setSetupType('join')}
                            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                            <div className="font-medium text-gray-900">Join Existing Hospital</div>
                            <div className="text-sm text-gray-600 mt-1">
                                Connect to a hospital that's already registered in our system
                            </div>
                        </button>

                        <button
                            onClick={() => setSetupType('create')}
                            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                            <div className="font-medium text-gray-900">Create New Hospital</div>
                            <div className="text-sm text-gray-600 mt-1">
                                Register a new hospital or clinic in our system
                            </div>
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <button
                            onClick={handleSkip}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {pendingUserData && (
                    <div className="text-center mb-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <p className="text-blue-800">
                                <strong>{pendingUserData.firstName} {pendingUserData.lastName}</strong>
                            </p>
                            <p className="text-blue-600 text-sm">
                                Setting up: <strong>{pendingUserData.organizationName}</strong>
                            </p>
                            {paymentData && (
                                <p className="text-green-600 text-xs mt-1">
                                    ✅ Payment completed ({paymentData.currency} {paymentData.amount})
                                </p>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {setupType === 'join' ? 'Join Hospital' : 'Create Hospital'}
                    </h1>
                    <p className="text-gray-600">
                        {setupType === 'join' 
                            ? 'Search and select your hospital from our verified list'
                            : 'Enter your hospital details to get started'
                        }
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    {setupType === 'join' ? (
                        <div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Hospitals
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    placeholder="Enter hospital name or location..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            {loading && (
                                <div className="text-center py-4">
                                    <div className="spinner mx-auto"></div>
                                    <p className="text-gray-500 mt-2">Searching...</p>
                                </div>
                            )}

                            {hospitals.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-3">Search Results</h3>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {hospitals.map((hospital) => (
                                            <div
                                                key={hospital.id}
                                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                                    selectedHospital?.id === hospital.id
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                onClick={() => handleHospitalSelect(hospital)}
                                            >
                                                <div className="font-medium text-gray-900">{hospital.name}</div>
                                                <div className="text-sm text-gray-600">{hospital.address}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {hospital.type} • {hospital.city}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchTerm.length >= 2 && hospitals.length === 0 && !loading && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No hospitals found matching "{searchTerm}"</p>
                                    <button
                                        onClick={() => setSetupType('create')}
                                        className="text-primary hover:underline mt-2"
                                    >
                                        Create a new hospital instead
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Hospital Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={newHospital.name}
                                    onChange={handleNewHospitalChange}
                                    placeholder="e.g. City General Hospital"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Hospital Type
                                </label>
                                <select
                                    name="type"
                                    value={newHospital.type}
                                    onChange={handleNewHospitalChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="private">Private Hospital</option>
                                    <option value="public">Public Hospital</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Address *
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={newHospital.address}
                                    onChange={handleNewHospitalChange}
                                    placeholder="e.g. 123 Main Street, Nairobi"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={newHospital.phone}
                                    onChange={handleNewHospitalChange}
                                    placeholder="+254712345678"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={newHospital.email}
                                    onChange={handleNewHospitalChange}
                                    placeholder="info@hospital.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4 justify-between mt-8">
                        <button
                            onClick={() => setSetupType(null)}
                            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Back
                        </button>

                        <div className="flex gap-4">
                            <button
                                onClick={handleSkip}
                                className="px-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Skip for Now
                            </button>
                            
                            <button
                                onClick={handleComplete}
                                disabled={loading || (setupType === 'join' && !selectedHospital) || (setupType === 'create' && (!newHospital.name || !newHospital.address))}
                                className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Setting up...' : 'Complete Setup'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HospitalSetup;