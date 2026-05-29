import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Overlay from '../components/Overlay';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(true);
  const [isMobile] = useState<boolean>(window.innerWidth <= 900);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1'}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send reset email');
      }

      // Navigate directly to verify page for password reset
      navigate('/verify', {
        state: {
          email: email.trim().toLowerCase(),
          type: 'password_reset'
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Left side - Forgot Password Form
  const Left = useMemo(
    () => (
      <div className="form">
        <div className="logo-auth">
          <img src="/images/logo.png" alt="company-logo" />
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Forgot Password?</h2>
          <p className="text-gray-600 text-sm">Enter your email to reset your password</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
            />
          </div>

          {error && (
            <p className="text-[#514334] text-[0.9rem] text-center mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="p-4 rounded-[8px] border-0 cursor-pointer bg-primary text-white mt-4 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p className="text-center decoration-0 text-[0.8rem] mt-3">
            Remember your password?{' '}
            <span
              onClick={() => navigate('/auth')}
              className="text-primary cursor-pointer hover:underline"
            >
              Sign In
            </span>
          </p>
        </form>
      </div>
    ), [email, loading, error, handleSubmit, navigate]
  );

  // Right side - Success Message
  const Right = useMemo(
    () => (
      <div className="form">
        <div className="logo-auth">
          <img src="/images/logo.png" alt="company-logo" />
        </div>
        
        <div className="text-center">
          <div className="mb-6">
           
            <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
            <p className="text-gray-600 text-sm mb-4">
              We've sent a password reset link to <span className='font-bold'>{email}</span>
            </p>
            <p className="text-gray-600 text-sm">
              Didn't receive the email? Check your spam folder
            </p>
          </div>

          <div className="space-y-3 flex flex-col lg:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setSuccess(false)}
              className="w-full p-4 rounded-[8px] border border-gray-300 cursor-pointer bg-white text-gray-700 hover:bg-gray-50"
            >
              Try Again
            </button>
            
            <button
              onClick={() => navigate('/auth')}
              className="w-full p-4 rounded-[8px] border-0 cursor-pointer bg-primary text-white hover:bg-primary/90"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    ), [email, navigate]
  );

  return isMobile ? (
    <div className="auth">{success ? Right : Left}</div>
  ) : (
    <div className="flex flex-row h-screen relative">
      {Left}
      {Right}
      <Overlay isActive={success} />
    </div>
  );
};

export default ForgotPassword;