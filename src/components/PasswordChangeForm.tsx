import { useCallback, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface PasswordChangeFormProps {
  email: string;
  token?: string;
  mode?: 'setup' | 'reset';
  onPasswordChanged?: () => void;
}

const PasswordChangeForm = ({ email, token, mode = 'setup', onPasswordChanged }: PasswordChangeFormProps) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };


  const validateForm = () => {
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // For setup mode (first time), we'll use a different endpoint
      if (mode === 'setup') {
        // This will be a new endpoint for setting password after email verification
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1'}/auth/set-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            newPassword: formData.newPassword
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to set password');
        }

        // Store the auth data for immediate login
        if (result.data) {
          // Set encryption key and tokens for immediate login
          const { authService } = await import('../services/authServices');
          authService.setTokens(result.data.accessToken, result.data.refreshToken);
          authService.setUser(result.data.user);
          authService.setUserType(result.data.userType);
          if (result.data.sessionId) {
            authService.setSessionId(result.data.sessionId);
          }
          if (result.data.organization) {
            authService.setOrganization(result.data.organization);
          }
        }
      } else {
        // For reset mode, use the token prop
        if (!token) {
          throw new Error('Reset token not found');
        }

        console.log('PasswordChangeForm: Attempting password reset with email:', email, 'token:', token);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1'}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            token,
            newPassword: formData.newPassword
          })
        });

        const result = await response.json();
        console.log('PasswordChangeForm: Reset password response:', result);

        if (!response.ok) {
          throw new Error(result.message || 'Failed to reset password');
        }
      }

      // Password set/changed successfully
      if (onPasswordChanged) {
        onPasswordChanged();
      } else {
        navigate('/dashboard', {
          state: {
            message: mode === 'setup'
              ? 'Password set successfully! Welcome to your dashboard.'
              : 'Password reset successfully! Welcome back.'
          }
        });
      }

    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'reset':
        return 'Reset Your Password';
      default:
        return 'Set Your Password';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'reset':
        return `Please enter a new password for your account: ${email}`;
      default:
        return `Please set a password for your account: ${email}`;
    }
  };

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">{getTitle()}</h2>
        <p className="text-gray-600 text-sm">
          {getDescription()}
        </p>
      </div>

      <div className="input-group mb-4">
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
          New Password
        </label>
        <div className="relative">
          <input
            type={showPasswords.new ? 'text' : 'password'}
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter your new password"
            required
          />
          <span
            className="password-toggle absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 "
            onClick={() => togglePasswordVisibility('new')}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePasswordVisibility('new');
              }
            }}
          >
            {showPasswords.new ? (
              <FaEyeSlash className="icon" />
            ) : (
              <FaEye className="icon" />
            )}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Password must be at least 8 characters long
        </p>
      </div>

      <div className="input-group mb-6">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            type={showPasswords.confirm ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Confirm your new password"
            required
          />
          <span
            className="password-toggle absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1 "
            onClick={() => togglePasswordVisibility('confirm')}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePasswordVisibility('confirm');
              }
            }}
          >
            {showPasswords.confirm ? (
              <FaEyeSlash className="icon" />
            ) : (
              <FaEye className="icon" />
            )}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full p-4 rounded-lg border-0 cursor-pointer bg-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? 'Setting Password...' : mode === 'reset' ? 'Reset Password' : 'Set Password'}
      </button>

      <p className="text-center text-sm text-gray-600 mt-4">
        Need help?{' '}
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

export default PasswordChangeForm;