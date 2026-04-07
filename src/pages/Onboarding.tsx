import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { paymentService, type PaymentPlan } from '../services/paymentServices';
import { authService } from '../services/authServices';

type OnboardingStep = 'payment' | 'finish';

function Onboarding() {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('payment');
    const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingUserData, setPendingUserData] = useState<any>(null);
    const [paymentData, setPaymentData] = useState<any>(null);
    // const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';

    const plans: PaymentPlan[] = [
        {
            id: 'basic',
            name: 'Basic',
            price: 1,
            currency: 'KES',
            interval: 'month',
            features: [
                'Up to 50 patients',
                'Basic patient management',
                'Simple reporting',
                'Email support'
            ]
        },
        {
            id: 'professional',
            name: 'Professional',
            price: 5000,
            currency: 'KES',
            interval: 'month',
            features: [
                'Up to 200 patients',
                'Advanced patient management',
                'Detailed analytics',
                'Priority support',
                'Custom forms'
            ],
            popular: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 10000,
            currency: 'KES',
            interval: 'month',
            features: [
                'Unlimited patients',
                'Full feature access',
                'Advanced integrations',
                '24/7 phone support',
                'Custom branding'
            ]
        }
    ];

    useEffect(() => {
        const fetchPendingUserData = async () => {
            if (!email) {
                setError('No email provided. Please start the signup process again.');
                return;
            }

            try {
                const response = await authService.getPendingUserData(email);
                if (response.success) {
                    setPendingUserData(response.data);
                    // Pre-select the Professional plan
                    const professionalPlan = plans.find(plan => plan.id === 'professional');
                    if (professionalPlan) {
                        setSelectedPlan(professionalPlan);
                    }
                    // Carry forward phone number from signup if available
                    if (response.data?.phone) {
                        setPhoneNumber(response.data.phone);
                    }
                } else {
                    setError('Registration session expired. Please start the signup process again.');
                }
            } catch (err: any) {
                console.error('Failed to get pending user data:', err);
                setError('Failed to load registration data. Please try again.');
            }
        };

        fetchPendingUserData();
    }, [email]);

    const handlePlanSelect = (plan: PaymentPlan) => {
        setSelectedPlan(plan);
        setError(null);
        setShowPaymentForm(true);
    };

    const handlePayment = async () => {
        if (!selectedPlan) {
            setError('Please select a plan');
            return;
        }

        if (!phoneNumber) {
            setError('Please enter your M-Pesa phone number');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Step 1: Initiate payment
            const result = await paymentService.processPayment({
                planId: selectedPlan.id,
                paymentMethod: 'mpesa',
                phoneNumber: phoneNumber,
                guestEmail: email, // Link payment to guest
                amount: selectedPlan.price,
                eventName: `${selectedPlan.id}_subscription`,
                description: `Payment for ${selectedPlan.name} plan`,
                userData: pendingUserData
            });

            if (result.success && result.data?.merchantRequestId) {
                const merchantRequestId = result.data.merchantRequestId;

                // Step 2: Check payment status with retries
                let attempts = 0;
                const maxAttempts = 10; // Check for up to 2 minutes (10 attempts * 12 seconds)
                const checkInterval = 12000; // 12 seconds between checks

                const checkPaymentStatus = async (): Promise<void> => {
                    attempts++;
                    console.log(`Checking payment status... Attempt ${attempts}/${maxAttempts}`);

                    try {
                        const statusResult = await paymentService.verifyPaymentForSignup(
                            merchantRequestId,
                            email
                        );

                        if (statusResult.canProceed) {
                            // Payment successful - proceed to finish setup
                            setPaymentData({
                                planId: selectedPlan.id,
                                transactionId: merchantRequestId,
                                amount: selectedPlan.price,
                                currency: selectedPlan.currency,
                                status: 'completed'
                            });

                            setCurrentStep('finish');
                            setLoading(false);
                            return;
                        }

                        if (!statusResult.shouldRetry || statusResult.code === 'PAYMENT_FAILED') {
                            // Payment failed permanently or was cancelled
                            setError(statusResult.message || 'Payment failed. Please try again.');
                            setLoading(false);
                            return;
                        }

                        // Payment still pending - continue retrying
                        if (attempts < maxAttempts) {
                            setTimeout(checkPaymentStatus, checkInterval);
                        } else {
                            // Max attempts reached
                            setError('Payment verification timed out. Please check your M-Pesa messages and contact support if payment was deducted.');
                            setLoading(false);
                        }

                    } catch (statusError: any) {
                        console.error('Payment status check error:', statusError);

                        if (attempts < maxAttempts) {
                            setTimeout(checkPaymentStatus, checkInterval);
                        } else {
                            setError('Unable to verify payment status. Please contact support.');
                            setLoading(false);
                        }
                    }
                };

                // Start checking payment status after a short delay
                setTimeout(checkPaymentStatus, 3000); // Wait 3 seconds before first check

            } else {
                setError(result.message || 'Failed to initiate payment. Please try again.');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Payment failed. Please try again.');
            setLoading(false);
        }
    };

    // Finish setup - create organization without hospital
    const handleFinishSetup = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await authService.completeOrganizationCreation({
                email: email,
                paymentData: paymentData,
                hospitalData: { hospitals: [] } // No hospitals - just create the organization
            });

            if (response.success) {
                navigate('/dashboard', {
                    state: {
                        message: 'Welcome to your dashboard! Your organization has been created successfully.'
                    }
                });
            }
        } catch (err: any) {
            console.error('Organization creation failed:', err);
            setError(err.message || 'Failed to complete setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Payment Panel Component (for half-and-half layout)
    const PaymentPanel = useMemo(() => (
        <div className="form">
            <div className="logo-auth">
                <img src="/images/logo.png" alt="company-logo" />
            </div>

            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Payment</h1>
                <p className="text-gray-600">Enter your payment details to proceed</p>
            </div>

            {selectedPlan && (
                <div className="w-[80%] mx-auto bg-white rounded-lg  p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">Payment Method</h3>

                    <div className="mb-4">
                        <div className="p-4 border-2 border-primary bg-primary/5 text-primary rounded-lg text-center">
                            <div className="font-medium">M-Pesa</div>
                            <div className="text-sm">Mobile Money Payment</div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            M-Pesa Phone Number
                        </label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+254712345678"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setShowPaymentForm(false);
                                setSelectedPlan(null);
                            }}
                            disabled={loading}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            Back to Plans
                        </button>
                        <button
                            onClick={handlePayment}
                            disabled={!selectedPlan || !phoneNumber || loading}
                            className="flex-1 px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            {loading ? 'Processing...' : `Pay KSH ${selectedPlan.price.toLocaleString()}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    ), [selectedPlan, phoneNumber, error, loading, handlePayment]);

    // Finish Setup Panel Component
    const FinishPanel = useMemo(() => (
        <div className="form">
            <div className="logo-auth">
                <img src="/images/logo.png" alt="company-logo" />
            </div>

            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h1>
                <p className="text-gray-600">Your payment was successful. Let's finish setting up your organization.</p>
            </div>

            {pendingUserData && paymentData && (
                <div className="w-[80%] mx-auto bg-green-50 border border-green-200 rounded-md p-6 mb-6">
                    <div className="text-center">
                        <div className="text-green-800 font-medium mb-2">
                            ✅ Payment Successful
                        </div>
                        <p className="text-green-700 text-sm mb-4">
                            <strong>{pendingUserData.firstName} {pendingUserData.lastName}</strong>
                        </p>
                        <p className="text-green-600 text-sm mb-2">
                            Organization: <strong>{pendingUserData.organizationName}</strong>
                        </p>
                        <p className="text-green-600 text-sm">
                            Plan: <strong>{paymentData.currency} {paymentData.amount.toLocaleString()}</strong> - {selectedPlan?.name}
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="w-[80%] mx-auto mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            <div className="w-[80%] mx-auto text-center">
                <button
                    onClick={handleFinishSetup}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-lg font-medium"
                >
                    {loading ? 'Creating Organization...' : 'Finish Setup & Go to Dashboard'}
                </button>
                
                <p className="text-gray-500 text-sm mt-4">
                    You can set up hospitals and clinics later in your dashboard settings.
                </p>
            </div>
        </div>
    ), [pendingUserData, paymentData, selectedPlan, error, loading, handleFinishSetup]);



    const isMobile = window.innerWidth <= 900;

    // Full-width plan selection view
    if (!showPaymentForm && currentStep === 'payment') {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="logo-auth mb-6">
                            <img src="/images/logo.png" alt="company-logo" className="mx-auto" />
                        </div>

                        {/* {pendingUserData && (
                            <div className="mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 max-w-md mx-auto">
                                    <p className="text-blue-800">
                                        Welcome, <strong>{pendingUserData.firstName} {pendingUserData.lastName}</strong>!
                                    </p>
                                    <p className="text-blue-600 text-sm">
                                        Setting up: <strong>{pendingUserData.organizationName}</strong>
                                    </p>
                                </div>
                            </div>
                        )} */}
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
                        <p className="text-gray-600">Select the plan that best fits your practice needs</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all ${selectedPlan?.id === plan.id
                                    ? 'ring-2 ring-primary border-primary'
                                    : 'border border-gray-200 hover:shadow-lg'
                                    } ${plan.popular ? 'ring-2 ring-primary' : ''}`}
                                onClick={() => handlePlanSelect(plan)}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                                    <div className="mt-2">
                                        <span className="text-3xl font-bold text-gray-900">
                                            {plan.currency} {plan.price.toLocaleString()}
                                        </span>
                                        <span className="text-gray-600">/{plan.interval}</span>
                                    </div>
                                </div>

                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-center text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <div className="text-center">
                                    <button
                                        className={`w-full py-2 px-4 rounded-md font-medium transition-colors cursor-pointer ${selectedPlan?.id === plan.id
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 max-w-md mx-auto">
                            <p className="text-red-600 text-sm text-center">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Half-and-half layout for payment form and finish setup
    return isMobile ? (
        <div className="auth">
            {currentStep === 'payment' ? PaymentPanel : FinishPanel}
        </div>
    ) : (
        <div className="flex flex-row h-screen relative">
            {PaymentPanel}
            {FinishPanel}
            {/* Overlay that slides from left to right */}
            <div className={`absolute top-0 w-[50%] h-full bg-gray-200 transition-all duration-500 ease-in-out z-9999 ${currentStep !== 'finish' ? 'left-[50%]' : 'left-0'
                }`}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                        {currentStep === 'payment' ? (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Complete Payment</h2>
                                <p className="text-gray-600">Enter your M-Pesa details to proceed</p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Finish Setup</h2>
                                <p className="text-gray-600">Complete your organization setup</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Onboarding;