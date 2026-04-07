import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Overlay from '../components/Overlay';
import OTPForm from '../components/OTPForm';
import PasswordChangeForm from '../components/PasswordChangeForm';

function Verify() {
  const [isMobile] = useState<boolean>(window.innerWidth <= 900);
  const [isOTPVerified, setIsOTPVerified] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [verificationToken, setVerificationToken] = useState<string>('');

  const location = useLocation();
  const navigate = useNavigate();

  // Get email and verification type from navigation state or URL params
  const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';
  const verificationType = location.state?.type || new URLSearchParams(location.search).get('type') || 'signup';
  const organizationSlug = location.state?.organizationSlug || new URLSearchParams(location.search).get('organizationSlug') || '';

  const handleVerificationSuccess = (token?: string) => {
    if (verificationType === 'organization') {
      // Store the email for password change
      setUserEmail(email);
      // Move to password change step
      setIsOTPVerified(true);
    } else if (verificationType === 'password_reset') {
      // For password reset, also move to password change step and store token
      setUserEmail(email);
      setVerificationToken(token || '');
      setIsOTPVerified(true);
    } else {
      // For signup, navigation is handled by OTPForm (goes to payment)
      console.log('Signup verification successful - navigation handled by OTPForm');
    }
  };

  const handlePasswordChanged = () => {
    if (verificationType === 'password_reset') {
      // For password reset, navigate to auth page with success message
      navigate('/auth', {
        state: {
          message: 'Password reset successfully! You can now sign in with your new password.',
          type: 'success'
        }
      });
    } else {
      // For organization setup, navigate to dashboard
      navigate('/dashboard', {
        state: {
          message: 'Password changed successfully! Welcome to your dashboard.'
        }
      });
    }
  };

  const Left = useMemo(
    () => (
      <div className="form">
        <div className="logo-auth">
          <img src="/images/logo.png" alt="company-logo" />
        </div>
        {isOTPVerified && (
          <PasswordChangeForm
            email={userEmail}
            token={verificationType === 'password_reset' ? verificationToken : undefined}
            mode={verificationType === 'password_reset' ? 'reset' : 'setup'}
            onPasswordChanged={handlePasswordChanged}
          />
        )}
      </div>
    ), [isOTPVerified, userEmail, verificationToken, verificationType, handlePasswordChanged]
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
            verificationType={verificationType}
            organizationSlug={organizationSlug}
            onVerificationSuccess={handleVerificationSuccess}
          />
        )}
      </div>
    ), [email, verificationType, organizationSlug, isOTPVerified, handleVerificationSuccess]
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
}

export default Verify;