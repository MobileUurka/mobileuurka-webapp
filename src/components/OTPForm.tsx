import { useState, useRef, useEffect, useCallback } from 'react';
import { authService } from '../services/authServices';
import { useNavigate } from 'react-router-dom';

interface OTPFormProps {
  email?: string;
  verificationType?: 'signup' | 'organization' | 'password_reset';
  organizationSlug?: string;
  onVerificationSuccess?: (token?: string) => void;
  isOTP?: boolean;
}

const OTPForm = ({ email, verificationType = 'signup', organizationSlug, onVerificationSuccess }: OTPFormProps) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [canResend, setCanResend] = useState<boolean>(true);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Timer for resend functionality
  useEffect(() => {
    let interval: number;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = useCallback((element: HTMLInputElement, index: number) => {
    const value = element.value;

    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Move to next input if current field is filled
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      const newOtp = [...otp];

      if (otp[index]) {
        // Clear current field
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous field and clear it
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        const newOtp = new Array(6).fill('');
        for (let i = 0; i < digits.length; i++) {
          newOtp[i] = digits[i];
        }
        setOtp(newOtp);

        // Focus the next empty field or the last field
        const nextIndex = Math.min(digits.length, 5);
        inputRefs.current[nextIndex]?.focus();
      });
    }
  }, [otp]);

  const handleVerify = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      console.log(verificationType)

      if (verificationType === 'organization') {
        // Use organization verification endpoint
        response = await authService.verifyOrganizationEmail({
          email: email || '',
          otp: otpCode,
          organizationSlug: organizationSlug || ''
        });
      } else if (verificationType === 'password_reset') {
        // For password reset, don't verify the token separately
        // Just pass the OTP directly to be used for password reset
        console.log('OTPForm: password_reset - skipping verification, passing OTP directly');
        response = { success: true }; // Fake success to proceed
      } else {
        // Use new signup verification endpoint (just verifies OTP, doesn't create organization)
        response = await authService.completeSignupWithOTP({
          email: email || '',
          otp: otpCode
        });
      }

      if (response.success) {
        if (verificationType === 'signup') {
          // For signup, navigate to onboarding page with email in state
          navigate('/onboarding', {
            state: {
              email: email,
              signupData: response.data
            }
          });
        } else if (verificationType === 'password_reset') {
          // For password reset, call success callback with token if provided, otherwise navigate
          console.log('OTPForm: password_reset verification successful, onVerificationSuccess:', !!onVerificationSuccess);
          if (onVerificationSuccess) {
            console.log('OTPForm: calling onVerificationSuccess with token:', otpCode);
            onVerificationSuccess(otpCode);
          } else {
            console.log('OTPForm: no callback, navigating to reset-password');
            navigate('/reset-password', {
              state: {
                email: email,
                token: otpCode,
                verified: true
              }
            });
          }
        } else {
          // For organization, call success callback
          if (onVerificationSuccess) {
            onVerificationSuccess();
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);
    setError(null);

    try {
      let response;

      if (verificationType === 'organization') {
        // Use organization resend verification endpoint
        response = await authService.resendOrganizationVerification({
          email: email || '',
          organizationSlug: organizationSlug || ''
        });
      } else if (verificationType === 'password_reset') {
        // For password reset, resend the forgot password request
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1'}/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email || ''
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to resend reset code');
        }
        
        response = result;
      } else {
        // Use signup resend OTP endpoint
        response = await authService.resendSignupOTP({
          email: email || ''
        });
      }

      if (response.success) {
        setCanResend(false);
        setResendTimer(60);
        setOtp(new Array(6).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          {verificationType === 'organization' 
            ? 'Verify Organization Email' 
            : verificationType === 'password_reset'
            ? 'Enter Reset Code'
            : 'Verify Your Email'}
        </h2>
        <p className="text-gray-600 text-sm">
          {verificationType === 'password_reset' 
            ? `We've sent a 6-digit reset code to ${email || 'your email'}`
            : `We've sent a 6-digit code to ${email || 'your email'}`}
          {verificationType === 'organization' && organizationSlug && (
            <span className="block mt-1 text-xs">for organization: {organizationSlug}</span>
          )}
        </p>
      </div>

      <div className="input-group">
        <div className="w-full justify-center flex flex-row gap-[0.5rem] mx-auto lg:otp-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-12 text-center text-[16px] lg:otp-input"
              autoComplete="off"
            />
          ))}
        </div>
      </div>

      {error && <p className="text-[#514334] text-[0.9rem] text-center mt-2">{error}</p>}

      <button
        type="submit"
        className="p-4 rounded-[8px] border-0 cursor-pointer bg-primary text-white mt-4 w-full"
        disabled={loading || otp.join('').length !== 6}
      >
        {loading ? "Verifying..." : verificationType === 'password_reset' ? "Verify Reset Code" : "Verify Code"}
      </button>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend || loading}
            className={`text-primary ${canResend && !loading ? 'cursor-pointer hover:underline' : 'cursor-not-allowed opacity-50'}`}
          >
            {canResend ? (verificationType === 'password_reset' ? 'Resend Reset Code' : 'Resend OTP') : `Resend in ${resendTimer}s`}
          </button>
        </p>
      </div>

      <p className="text-center decoration-0 text-[0.8rem] mt-6">
        Remember your password?{' '}
        <span
          onClick={() => navigate('/auth')}
          className="text-primary cursor-pointer hover:underline"
        >
          Back to Sign In
        </span>
      </p>
    </form>
  );
};

export default OTPForm;