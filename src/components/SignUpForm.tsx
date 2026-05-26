import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { authService, type SignupInitiateData } from '../services/authServices';

interface SignUpFormProps {
    onSwitch: () => void;
}

function SignUpForm({ onSwitch }: SignUpFormProps) {
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [formData, setFormData] = useState<SignupInitiateData>({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        licenseNumber: '',
        organizationName: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: value
            };

            // Auto-generate organization name when firstName changes
            if (name === 'firstName' && value.trim()) {
                newData.organizationName = `${value.trim()}'s clinic`;
            }

            return newData;
        });
        setError(null);
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    const validateStep1 = (): boolean => {
        if (!formData.email || !formData.firstName || !formData.lastName || !formData.phone || !formData.organizationName) {
            setError('Please fill in all required fields');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }

        const phoneRegex = /^\+254[0-9]{9}$/;
        if (!phoneRegex.test(formData.phone)) {
            setError('Please enter a valid Kenyan phone number (+254XXXXXXXXX)');
            return false;
        }

        return true;
    };

    const validateStep2 = (): boolean => {
        if (!formData.password) {
            setError('Please enter a password');
            return false;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return false;
        }

        return true;
    };

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep1()) return;

        setCurrentStep(2);
        setError(null);
    };

    const handlePreviousStep = () => {
        setCurrentStep(1);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log(formData)

        if (!validateStep2()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await authService.initiateSignup(formData);

            if (response.success) {
                // Navigate to verification page
                navigate('/verify', {
                    state: {
                        email: formData.email,
                        phone: formData.phone,
                        type: 'signup'
                    }
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Basic Information
    if (currentStep === 1) {
        return (
            <form onSubmit={handleNextStep}>
                {/* <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold mb-2">Create Account</h2>
                    <p className="text-gray-600 text-sm">Step 1 of 2: Basic Information</p>
                </div> */}

                <div className="input-group">
                    <label htmlFor="email">Email *</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        autoComplete="email"
                        required
                    />
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
                    <div className="input-group">
                        <label htmlFor="firstName">First Name *</label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            autoComplete="given-name"
                            placeholder="e.g John"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="lastName">Last Name *</label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            placeholder="e.g Doe"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            autoComplete="family-name"
                            required
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        placeholder="+254712345678"
                        value={formData.phone}
                        onChange={handleInputChange}
                        autoComplete="tel"
                        required
                    />
                </div>



                {error && <p className="text-red-500 text-[0.9rem] text-center mt-2">{error}</p>}

                <button
                    type="submit"
                    className="p-4 rounded-[8px] border-0 cursor-pointer bg-primary text-white mt-4 w-full"
                >
                    Next
                </button>

                <p className="text-center decoration-0 text-[0.8rem] mt-3">
                    Already have an account? <span
                        onClick={onSwitch}
                        className="text-primary cursor-pointer hover:underline"
                    >
                        Sign In
                    </span>
                </p>
            </form>
        );
    }

    // Step 2: License and Password
    return (
        <form onSubmit={handleSubmit}>
            {/* <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2">Create Account</h2>
                <p className="text-gray-600 text-sm">Step 2 of 2: License & Security</p>
            </div> */}

            <div className="input-group">
                <label htmlFor="organizationName">Clinic/Organization Name *</label>
                <input
                    type="text"
                    id="organizationName"
                    name="organizationName"
                    placeholder="e.g John's clinic"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    required
                />
                <small className="text-gray-500 text-xs mt-1 block">
                    This will be your clinic/organization name. You can change this later.
                </small>
            </div>


            {/* <div className="input-group">
                <label htmlFor="licenseNumber">KMPDC License Number (Optional - Testing Mode)</label>
                <input
                    type="text"
                    id="licenseNumber"
                    name="licenseNumber"
                    placeholder="e.g MD12345 (or leave blank for testing)"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                />
                <small className="text-gray-500 text-xs mt-1 block">
                    License verification is disabled for testing. You can leave this blank or enter any value.
                </small>
            </div> */}

            <div className="input-group">
                <label htmlFor="password">Password *</label>
                <div className="password-input">
                    <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        placeholder="Enter your password"
                    />
                    <span
                        className="password-toggle"
                        onClick={togglePassword}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                togglePassword();
                            }
                        }}
                    >
                        {showPassword ? (
                            <FaEyeSlash className="icon" />
                        ) : (
                            <FaEye className="icon" />
                        )}
                    </span>
                </div>
                <small className="text-gray-500 text-xs mt-1 block">
                    Must be at least 8 characters long
                </small>
            </div>

            {error && <p className="text-red-500 text-[0.9rem] text-center mt-2">{error}</p>}

            <div className="flex flex-col lg:flex-row gap-3 mt-4">
                <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="flex-1 p-4 rounded-[8px] border border-gray-300 cursor-pointer bg-white text-gray-700 hover:bg-gray-50"
                >
                    Back
                </button>
                <button
                    type="submit"
                    className="flex-1 p-4 rounded-[8px] border-0 cursor-pointer bg-primary text-white hover:bg-primary/90"
                    disabled={loading}
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>
            </div>

            <p className="text-center decoration-0 text-[0.8rem] mt-3">
                Already have an account? <span
                    onClick={onSwitch}
                    className="text-primary cursor-pointer hover:underline"
                >
                    Sign In
                </span>
            </p>
        </form>
    );
}

export default SignUpForm;