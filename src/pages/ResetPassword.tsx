import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PasswordChangeForm from '../components/PasswordChangeForm';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    if (!emailParam || !tokenParam) {
      navigate('/forgot-password');
      return;
    }

    setEmail(emailParam);
    setToken(tokenParam);

    // Verify the reset token
    verifyResetToken(emailParam, tokenParam);
  }, [searchParams, navigate]);

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
      setIsValidToken(result.success);

      if (!result.success) {
        setTimeout(() => navigate('/forgot-password'), 3000);
      }
    } catch (error) {
      setIsValidToken(false);
      setTimeout(() => navigate('/forgot-password'), 3000);
    }
  };

  const handlePasswordChanged = () => {
    // Show success dialog and then navigate
    navigate('/auth', {
      state: {
        message: 'Password reset successfully! You can now sign in with your new password.',
        type: 'success'
      }
    });
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <img src="/images/logo.png" alt="MobileUurka" className="mx-auto h-12 w-auto" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Invalid Reset Link</h2>
          <p className="mt-2 text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
          <p className="mt-4 text-sm text-gray-600">
            Redirecting you to request a new reset link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-md rounded-lg p-8">
          <div className="text-center mb-6">
            <img src="/images/logo.png" alt="MobileUurka" className="mx-auto h-12 w-auto" />
          </div>
          <PasswordChangeForm
            email={email}
            mode="reset"
            onPasswordChanged={handlePasswordChanged}
          />
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;