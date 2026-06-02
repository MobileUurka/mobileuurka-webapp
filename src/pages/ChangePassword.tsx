import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { authService } from '../services/authServices';
import Overlay from '../components/Overlay';

const ChangePassword = ({ onPasswordChanged }: { onPasswordChanged: () => Promise<void> }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile] = useState<boolean>(window.innerWidth <= 900);

  const email = location.state?.email || '';

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: if we arrived here without an email something is wrong
  if (!email) {
    navigate('/auth', { replace: true });
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1'}/auth/set-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: formData.newPassword }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update password');
      }

      // Store auth data so the user is immediately logged in
      if (result.data) {
        const { encryption } = await import('../utils/encryption');
        encryption.setKey(result.data.encryptionKey);
        authService.setTokens(result.data.accessToken, result.data.refreshToken);
        authService.setUser(result.data.user);
        authService.setUserType(result.data.userType);
        if (result.data.sessionId) authService.setSessionId(result.data.sessionId);
        if (result.data.organization) authService.setOrganization(result.data.organization);
      }

      // Unlock the app
      await onPasswordChanged();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Form = useMemo(
    () => (
      <div className="form">
        <div className="logo-auth">
          <img src="/images/logo.png" alt="company-logo" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Set Your Password</h2>
          <p className="text-gray-600 text-sm">
            Welcome! Your account was created by an admin. Please set your own password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* New password */}
          <div className="input-group mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNew ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="At least 8 characters"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              />
              <span
                role="button"
                tabIndex={0}
                onClick={() => setShowNew(v => !v)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
          </div>

          {/* Confirm password */}
          <div className="input-group mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              />
              <span
                role="button"
                tabIndex={0}
                onClick={() => setShowConfirm(v => !v)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-[#514334] text-[0.9rem] text-center mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="p-4 rounded-[8px] border-0 cursor-pointer bg-primary text-white w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Set Password & Sign In'}
          </button>
        </form>
      </div>
    ),
    [formData, showNew, showConfirm, loading, error]
  );

  // Right panel — decorative info panel
  const Info = useMemo(
    () => (
      <div className="form flex flex-col justify-center items-center text-center gap-4">
        <div className="logo-auth">
          <img src="/images/logo.png" alt="company-logo" />
        </div>
        <h3 className="text-lg font-semibold">One last step</h3>
        <p className="text-gray-600 text-sm max-w-xs">
          You're almost there. Choose a strong password you'll remember — you'll use it every time you sign in.
        </p>
      </div>
    ),
    []
  );

  return isMobile ? (
    <div className="auth">{Form}</div>
  ) : (
    <div className="flex flex-row h-screen relative">
      {Form}
      {Info}
      <Overlay isActive={false} />
    </div>
  );
};

export default ChangePassword;
