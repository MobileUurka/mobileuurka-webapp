import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { paymentService, type PaymentPlan } from '../services/paymentServices';
import { authService } from '../services/authServices';

type OnboardingStep = 'payment' | 'finish';

function Onboarding() {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('payment');
    const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingUserData, setPendingUserData] = useState<any>(null);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [selectedMethod, setSelectedMethod] = useState<"mpesa" | "card">("mpesa");    // const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

    const location = useLocation();
    const email = location.state?.email
        || new URLSearchParams(location.search).get('email') || '';
    const phone = location.state?.phone || new URLSearchParams(location.search).get('phone') || '';
    const [phoneNumber, setPhoneNumber] = useState(phone || '');

    // Add these
    const stepParam = new URLSearchParams(location.search).get('step');
    const planParam = new URLSearchParams(location.search).get('plan');
    const errorParam = new URLSearchParams(location.search).get('error');
    // const methodParam = new URLSearchParams(location.search).get('method');
    const navigate = useNavigate();

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
        setLoading(false)

        if (errorParam) {
            setError(
                errorParam === 'payment_incomplete' ? 'Payment was not completed. Please try again.' :
                    errorParam === 'missing_session' ? 'Invalid payment session.' :
                        'Payment verification failed. Please contact support.'
            );
        }

        // Coming back from Stripe success redirect
        if (stepParam === 'finish' && planParam) {
            const plan = plans.find(p => p.id === planParam);
            if (plan) {
                setSelectedPlan(plan);
                setPaymentData({
                    planId: plan.id,
                    transactionId: new URLSearchParams(location.search).get('session_id') || '',
                    amount: plan.price,
                    currency: plan.currency,
                    status: 'completed',
                });
                setCurrentStep('finish');
            }
        }
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
            setError("Please select a plan");
            return;
        }

        if (selectedMethod === "mpesa" && !phoneNumber) {
            setError("Please enter your M-Pesa phone number");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await paymentService.processPayment({
                paymentMethod: selectedMethod,
                planId: selectedPlan.id,
                phoneNumber: selectedMethod === "mpesa" ? phoneNumber : undefined,
                guestEmail: email,
                userData: pendingUserData,
                features: selectedPlan.features,   // ← add this
            });
            if (!res.success || !res.data) {
                setError(res.message || "Payment failed");
                setLoading(false);
                return;
            }

            const { provider, stripeUrl, merchantRequestId } = res.data;

            /**
             * =========================
             * STRIPE FLOW
             * =========================
             */
            if (provider === "stripe") {
                // redirect to Stripe checkout
                if (stripeUrl) {
                    window.location.href = stripeUrl;
                    return;
                }

                setError("Stripe payment URL missing");
                setLoading(false);
                return;
            }

            /**
             * =========================
             * MPESA FLOW
             * =========================
             */
            if (provider === "mpesa") {
                if (!merchantRequestId) {
                    setError("Payment reference missing");
                    setLoading(false);
                    return;
                }

                setLoading(true); // UI: "waiting for payment"

                // optional: start polling
                const result = await paymentService.pollPaymentStatus(
                    merchantRequestId,
                    30,
                    3000
                );

                if (result.success) {
                    setPaymentData({
                        planId: selectedPlan.id,
                        transactionId: merchantRequestId,
                        amount: selectedPlan.price,
                        currency: selectedPlan.currency,
                        status: "completed",
                    });

                    setCurrentStep("finish");
                } else {
                    setError(result.message || "Payment failed");
                }

                setLoading(false);
                return;
            }

            /**
             * =========================
             * UNKNOWN PROVIDER (SAFETY)
             * =========================
             */
            setError("Unknown payment provider");
            setLoading(false);
        } catch (err: any) {
            setError(err.message || "Payment failed");
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
                <div className="w-full lg:w-[80%] mx-auto bg-white rounded-lg  lg:p-6 mb-6">
                    <div className='mb-8'>
                        <h3 className="text-lg font-semibold mb-4">
                            Select Payment Method
                        </h3>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                            {/* Option 1: M-Pesa */}
                            <label
                                onClick={() => setSelectedMethod('mpesa')}
                                className={`relative flex cursor-pointer rounded-xl border-2 p-4 shadow-sm transition-all duration-200 
                                    ${selectedMethod === 'mpesa'
                                        ? 'border-primary bg-primary/[0.02]'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                                    }`}
                            >
                                <span className="flex flex-1 items-start gap-4">
                                    {/* M-Pesa Styling Accent */}
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
                                        <img src="/images/mpesa.png" className='w-[90%] mx-auto' alt="" />
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="block text-sm font-semibold text-zinc-900">M-Pesa</span>
                                        <span className="mt-0.5 block text-xs text-zinc-500">Mobile Money Payment</span>
                                    </span>
                                </span>

                                {/* Active / Inactive Check Indicator */}
                                {selectedMethod === 'mpesa' ? (
                                    <span className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                                            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 7.586 3.707 5.293z" />
                                        </svg>
                                    </span>
                                ) : (
                                    <span className="absolute top-4 right-4 h-5 w-5 rounded-full border border-zinc-300" />
                                )}
                            </label>

                            {/* Option 2: Credit/Debit Card */}
                            <label
                                onClick={() => setSelectedMethod('card')}
                                className={`relative flex cursor-pointer rounded-xl border-2 p-4 shadow-sm transition-all duration-200 
                                ${selectedMethod === 'card'
                                        ? 'border-primary bg-primary/[0.02]'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                                    }`}
                            >
                                <span className="flex flex-1 items-start gap-4">
                                    {/* Modern Card Icon */}
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="block text-sm font-semibold text-zinc-900">Card Payment</span>
                                        <span className="mt-0.5 block text-xs text-zinc-500">Visa, Mastercard, Amex</span>
                                    </span>
                                </span>

                                {/* Active / Inactive Check Indicator */}
                                {selectedMethod === 'card' ? (
                                    <span className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 12 12">
                                            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 7.586 3.707 5.293z" />
                                        </svg>
                                    </span>
                                ) : (
                                    <span className="absolute top-4 right-4 h-5 w-5 rounded-full border border-zinc-300" />
                                )}
                            </label>

                        </div>
                    </div>

                    {selectedMethod === 'mpesa' ?
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    M-Pesa Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="254712345678"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>


                            <div className="flex flex-col md:flex-row gap-4">
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
                        </>
                        :
                        <div className="flex flex-col md:flex-row gap-4">

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
                                disabled={!selectedPlan || loading}
                                className="w-full flex-1 px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                {loading ? 'Processing...' : `Next (Kshs ${selectedPlan.price.toLocaleString()})`}
                            </button>
                        </div>
                    }
                    {error && (
                        <div className="mt-5 bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}



                </div>
            )}
        </div>
    ), [selectedPlan, phoneNumber, error, loading, handlePayment]);

    const FinishPanel = useMemo(() => (
        <div className="form flex flex-col items-center justify-center min-h-screen px-4 py-10">
            <div className="w-full max-w-sm">

                {/* Logo */}
                <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white flex items-center justify-center mx-auto mb-6">
                    <img src="/images/logo.png" alt="logo" className="w-9 h-9 object-contain" />
                </div>

                {/* Success icon */}
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                {/* Heading */}
                <div className="text-center mb-6">
                    <h1 className="text-xl font-medium text-gray-900 mb-1">Payment confirmed</h1>
                    <p className="text-sm text-gray-500">
                        Your subscription is active. Finish setting up your organization below.
                    </p>
                </div>

                {/* Details card */}
                {pendingUserData && paymentData && (
                    console.log(paymentData),
                    <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-5">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                            <span className="text-sm text-gray-500 flex-1">Account</span>
                            <span className="text-sm font-medium text-gray-900">{pendingUserData.firstName} {pendingUserData.lastName}</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                            <span className="text-sm text-gray-500 flex-1">Organization</span>
                            <span className="text-sm font-medium text-gray-900">{pendingUserData.organizationName}</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                            <span className="text-sm text-gray-500 flex-1">Plan</span>
                            <span className="text-sm font-medium text-gray-900 capitalize">{paymentData?.planId}</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                            <span className="text-sm text-gray-500 flex-1">Amount paid</span>
                            <span className="text-sm font-medium text-gray-900">
                                {paymentData.currency} {paymentData.amount.toLocaleString()}
                            </span>
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Paid</span>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* CTA */}
                <button
                    onClick={handleFinishSetup}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                    {loading ? 'Creating organization...' : 'Go to dashboard'}
                    {!loading && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    )}
                </button>

                <p className="text-xs text-gray-400 text-center mt-3">
                    You can add hospitals and clinics from your dashboard settings.
                </p>
            </div>
        </div>
    ), [pendingUserData, paymentData, selectedPlan, error, loading, handleFinishSetup]);
    // Finish Setup Panel Component

    


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
                                className={`w-[90%] md:w-full mx-auto relative bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all ${selectedPlan?.id === plan.id
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
                     <img src="/images/auth-image.jpg" alt="" className="w-full h-full object-cover"/>
            </div>
        </div>
    );
}

export default Onboarding;