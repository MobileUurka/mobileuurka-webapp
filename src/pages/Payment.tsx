import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { paymentService, type PaymentPlan } from '../services/paymentServices';
import { authService } from '../services/authServices';

function Payment() {
    const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingUserData, setPendingUserData] = useState<any>(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Get email from navigation state or URL params
    const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';

    useEffect(() => {
        // Get pending user data when component mounts
        const fetchPendingUserData = async () => {
            if (!email) {
                setError('No email provided. Please start the signup process again.');
                return;
            }

            try {
                const response = await authService.getPendingUserData(email);
                if (response.success) {
                    setPendingUserData(response.data);
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

    const plans: PaymentPlan[] = [
        {
            id: 'basic',
            name: 'Basic',
            price: 2000,
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

    const handlePlanSelect = (plan: PaymentPlan) => {
        setSelectedPlan(plan);
        setError(null);
    };

    const handlePayment = async () => {
        if (!selectedPlan) {
            setError('Please select a plan');
            return;
        }

        if (paymentMethod === 'mpesa' && !phoneNumber) {
            setError('Please enter your M-Pesa phone number');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // For testing purposes, auto-pass payment
            const result = await paymentService.processPayment({
                planId: selectedPlan.id,
                paymentMethod,
                phoneNumber: paymentMethod === 'mpesa' ? phoneNumber : undefined
            });

            if (result.success) {
                // Store payment completion status and user data
                localStorage.setItem('paymentCompleted', 'true');
                localStorage.setItem('paymentTransactionId', result.data?.transactionId || '');
                localStorage.setItem('paymentPlan', selectedPlan.id);
                
                console.log('✅ Payment completed successfully');
                
                // Payment successful, go to hospital setup with user data
                navigate('/hospital-setup', {
                    state: {
                        email: email,
                        pendingUserData: pendingUserData,
                        paymentData: {
                            planId: selectedPlan.id,
                            transactionId: result.data?.transactionId,
                            amount: selectedPlan.price,
                            currency: selectedPlan.currency
                        }
                    }
                });
            }
        } catch (err: any) {
            setError(err.message || 'Payment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // For testing, allow skipping payment
        navigate('/hospital-setup', {
            state: {
                email: email,
                pendingUserData: pendingUserData,
                paymentData: null // No payment data when skipped
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* {pendingUserData && (
                    <div className="text-center mb-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <p className="text-blue-800">
                                Welcome, <strong>{pendingUserData.firstName} {pendingUserData.lastName}</strong>!
                            </p>
                            <p className="text-blue-600 text-sm">
                                Setting up: <strong>{pendingUserData.organizationName}</strong>
                            </p>
                        </div>
                    </div>
                )} */}
                
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
                    <p className="text-gray-600">Select the plan that best fits your practice needs</p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all ${
                                selectedPlan?.id === plan.id
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
                                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                                        selectedPlan?.id === plan.id
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

                {/* Payment Method */}
                {selectedPlan && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button
                                className={`p-4 border rounded-lg text-center transition-colors ${
                                    paymentMethod === 'mpesa'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setPaymentMethod('mpesa')}
                            >
                                <div className="font-medium">M-Pesa</div>
                                <div className="text-sm text-gray-600">Mobile Money</div>
                            </button>
                            
                            <button
                                className={`p-4 border rounded-lg text-center transition-colors ${
                                    paymentMethod === 'card'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setPaymentMethod('card')}
                            >
                                <div className="font-medium">Credit Card</div>
                                <div className="text-sm text-gray-600">Visa, Mastercard</div>
                            </button>
                        </div>

                        {paymentMethod === 'mpesa' && (
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
                        )}

                        {paymentMethod === 'card' && (
                            <div className="text-center py-4 text-gray-500">
                                Credit card payment coming soon
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleSkip}
                        className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Skip for Now
                    </button>
                    
                    <button
                        onClick={handlePayment}
                        disabled={!selectedPlan || loading}
                        className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Processing...' : `Pay ${selectedPlan?.currency} ${selectedPlan?.price.toLocaleString()}`}
                    </button>
                </div>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                        Secure payment powered by M-Pesa and Stripe
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Payment;