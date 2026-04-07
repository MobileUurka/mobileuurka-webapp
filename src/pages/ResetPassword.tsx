import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PasswordChangeForm from '../components/PasswordChangeForm';
import OTPForm from '../components/OTPForm';
import Overlay from '../components/Overlay';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isOTPVerified, setIsOTPVerified] = useState<boolean>(false);
  const [isMobile] = useState<boolean>(window.innerWidth <= 900);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we came from OTP verification with state data
    const stateEmail = location.state?.email;
    const stateToken = location.state?.token;
    const alreadyVerified = location.state?.verified;

    // Or check URL parameters
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    const finalEmail = stateEmail || emailParam;
    const finalToken = stateToken || tokenParam;

    if (!finalEmail) {
      navigate('/forgot-password');
      return;
    }

    setEmail(finalEmail);
    
    if (finalToken && alreadyVerified) {
      // Token already verified in OTP form, skip to password change
      setToken(finalToken);
      setIsOTPVerified(true);
    } else if (finalToken) {
      // Token provided but not verified, verify it first
      setToken(finalToken);
      verifyResetToken(finalEmail, finalToken);
    }
    // If no token, show OTP form to get one
  }, [searchParams, location.state, navigate]);

  const verifyResetToken = async (email: string, token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1'}/auth/verify-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token })
      });

      const result = await response.json();
      
      if (result.success) {
        setIsOTPVerified(true);
      } else {
        // Invalid token, show OTP form
        setToken('');
        setIsOTPVerified(false);
      }
    } catch (error) {
      // Error verifying token, show OTP form
      setToken('');
      setIsOTPVerified(false);
    }
  };

  const handleVerificationSuccess = useCallback((verifiedToken?: string) => {
    console.log('ResetPassword: handleVerificationSuccess called with token:', verifiedToken);
    console.log('ResetPassword: current isOTPVerified state:', isOTPVerified);
    if (verifiedToken) {
      setToken(verifiedToken);
      setIsOTPVerified(true);
      console.log('ResetPassword: setting isOTPVerified to true');
    }
  }, [isOTPVerified]);

  const handlePasswordChanged = useCallback(() => {
    // Show success and navigate to auth
    navigate('/auth', {
      state: {
        message: 'Password reset successfully! You can now sign in with your new password.',
        type: 'success'
      }
    });
  }, [navigate]);

  const Left = useMemo(
    () => (
      <div className="form">
        <div className="logo-auth">
          <img src="/images/logo.png" alt="company-logo" />
        </div>
        {isOTPVerified && (
          <PasswordChangeForm
            email={email}
            token={token}
            mode="reset"
            onPasswordChanged={handlePasswordChanged}
          />
        )}
      </div>
    ), [isOTPVerified, email, token, handlePasswordChanged]
  );

  const Right = useMemo(
    () => (
      <div className="form">
        <div className="logo-auth">
          <img src="/images/logo.png" alt="company-logo" />
        </div>
        {!isOTPVerified && (
          <OTPForm
            email={email}
            verificationType="password_reset"
            onVerificationSuccess={handleVerificationSuccess}
          />
        )}
      </div>
    ), [email, isOTPVerified, handleVerificationSuccess]
  );

  return isMobile ? (
    <div className="auth">{isOTPVerified ? Left : Right}</div>
  ) : (
    <div className="flex flex-row h-screen relative">
      {Right}
      {Left}
      <Overlay isActive={!isOTPVerified} />
    </div>
  );
};

export default ResetPassword;