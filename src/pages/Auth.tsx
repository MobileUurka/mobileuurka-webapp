import { useMemo, useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import Overlay from "../components/Overlay";
import LoginForm from "../components/LoginForm";
import { authService } from "../services/authServices";
import { settingsService } from "../services/settingsService";
import SignUpForm from "../components/SignUpForm";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface AuthProps {
    onLoginSuccess: () => Promise<void>;
}

// ── Step types for the staff first-login flow ────────────────────────────────
type Step = 'login' | 'staff-otp' | 'staff-set-password';

interface StaffFlowState {
    email: string;
    setPasswordToken: string;
}

const Auth = ({ onLoginSuccess }: AuthProps) => {
    const [isLogin, setIsLogin] = useState<boolean>(false);
    const [isMobile] = useState<boolean>(window.innerWidth <= 900);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // ── Normal login state ───────────────────────────────────────────────────
    const [loginFormData, setLoginFormData] = useState<{ email: string; password: string; rememberMe?: boolean }>({
        email: "",
        password: "",
        rememberMe: false,
    });
    const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

    // ── Staff first-login flow state ─────────────────────────────────────────
    const [step, setStep] = useState<Step>('login');
    const [staffEmail, setStaffEmail] = useState('');
    const [staffFlow, setStaffFlow] = useState<StaffFlowState | null>(null);

    // OTP inputs (6 digits)
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // New password inputs
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    // Resend timer
    const [resendTimer, setResendTimer] = useState(0);
    useEffect(() => {
        if (resendTimer <= 0) return;
        const t = setInterval(() => setResendTimer(v => Math.max(0, v - 1)), 1000);
        return () => clearInterval(t);
    }, [resendTimer]);

    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const cancelAccount = params.get('cancelDeletion');
        const cancelOrg = params.get('cancelOrgDeletion');
        const cancelToken = cancelAccount || cancelOrg;
        if (!cancelToken) return;

        (async () => {
            try {
                const res = cancelOrg
                    ? await settingsService.cancelOrgDeletion(cancelToken)
                    : await settingsService.cancelDeletion(cancelToken);
                setSuccessMessage(res.message ?? 'Deletion cancelled. You can sign in again.');
            } catch (err: unknown) {
                const msg = err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: string }).message)
                    : 'Invalid or expired cancellation link.';
                setError(msg);
            }
            navigate('/auth', { replace: true });
        })();
    }, [location.search, navigate]);

    // ── Step 1: normal login ─────────────────────────────────────────────────
    const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await authService.signIn({
                email: loginFormData.email,
                password: loginFormData.password,
                rememberMe: loginFormData.rememberMe,
            });

            if (response.mustChangePassword) {
                // Staff first-login — go to OTP step
                setStaffEmail(loginFormData.email);
                setStep('staff-otp');
                setResendTimer(60);
                return;
            }

            if (response.success) {
                await onLoginSuccess();
                navigate('/');
            }
        } catch (err: any) {
            if (err.message === "Please verify your email address before signing in") {
                navigate("/verify", {
                    state: {
                        email: loginFormData.email,
                        type: err.organizationSlug ? 'organization' : 'signup',
                        organizationSlug: err.organizationSlug
                    }
                });
            } else {
                setError(err.message || 'Invalid credentials');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: OTP verification ─────────────────────────────────────────────
    const handleOTPChange = (el: HTMLInputElement, index: number) => {
        const val = el.value.replace(/\D/g, '');
        const next = [...otp];
        next[index] = val;
        setOtp(next);
        if (val && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOTPKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            const next = [...otp];
            if (otp[index]) {
                next[index] = '';
                setOtp(next);
            } else if (index > 0) {
                next[index - 1] = '';
                setOtp(next);
                otpRefs.current[index - 1]?.focus();
            }
        }
    };

    const handleOTPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length !== 6) { setError('Please enter all 6 digits'); return; }

        setLoading(true);
        setError(null);
        try {
            const res = await authService.verifyStaffOTP({ email: staffEmail, otp: code });
            if (res.success && res.data?.setPasswordToken) {
                setStaffFlow({ email: staffEmail, setPasswordToken: res.data.setPasswordToken });
                setStep('staff-set-password');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        setError(null);
        try {
            await authService.resendStaffOTP({ email: staffEmail });
            setOtp(new Array(6).fill(''));
            setResendTimer(60);
            otpRefs.current[0]?.focus();
        } catch (err: any) {
            setError(err.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: set new password ─────────────────────────────────────────────
    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
        if (!staffFlow) return;

        setLoading(true);
        setError(null);
        try {
            const res = await authService.staffSetPassword({
                email: staffFlow.email,
                newPassword,
                setPasswordToken: staffFlow.setPasswordToken,
            });
            if (res.success) {
                await onLoginSuccess();
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to set password');
        } finally {
            setLoading(false);
        }
    };

    // ── Render helpers ───────────────────────────────────────────────────────

    const StaffOTPForm = (
        <form onSubmit={handleOTPSubmit}>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold mb-2">Verify Your Identity</h2>
                <p className="text-gray-600 text-sm">
                    We've sent a 6-digit code to <strong>{staffEmail}</strong>.
                    Enter it below to continue.
                </p>
            </div>

            <div className="flex justify-center gap-2 mb-4">
                {otp.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOTPChange(e.target, i)}
                        onKeyDown={e => handleOTPKeyDown(e, i)}
                        className="w-12 h-12 text-center text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        autoComplete="off"
                    />
                ))}
            </div>

            {error && <p className="text-red-600 text-sm text-center mb-3">{error}</p>}

            <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="w-full p-4 rounded-lg bg-primary text-white font-medium disabled:opacity-50"
            >
                {loading ? 'Verifying…' : 'Verify Code'}
            </button>

            <div className="text-center mt-4 text-sm text-gray-600">
                Didn't get the code?{' '}
                <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendTimer > 0 || loading}
                    className="text-primary disabled:opacity-40"
                >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
                </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
                <span
                    className="text-primary cursor-pointer hover:underline"
                    onClick={() => { setStep('login'); setError(null); setOtp(new Array(6).fill('')); }}
                >
                    ← Back to sign in
                </span>
            </p>
        </form>
    );

    const StaffSetPasswordForm = (
        <form onSubmit={handleSetPassword}>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold mb-2">Set Your Password</h2>
                <p className="text-gray-600 text-sm">
                    Choose a secure password for your account.
                </p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                    <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="At least 8 characters"
                        required
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                        onClick={() => setShowNewPwd(v => !v)}
                    >
                        {showNewPwd ? <FaEyeSlash /> : <FaEye />}
                    </span>
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                    <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="Repeat your new password"
                        required
                    />
                    <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                        onClick={() => setShowConfirmPwd(v => !v)}
                    >
                        {showConfirmPwd ? <FaEyeSlash /> : <FaEye />}
                    </span>
                </div>
            </div>

            {error && <p className="text-red-600 text-sm text-center mb-3">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="w-full p-4 rounded-lg bg-primary text-white font-medium disabled:opacity-50"
            >
                {loading ? 'Saving…' : 'Set Password & Sign In'}
            </button>
        </form>
    );

    const Right = useMemo(
        () => (
            <div className="form">
                <div className="logo-auth">
                    <img src="/images/logo.png" alt="company-logo" />
                </div>
                {step === 'login' && (
                    <>
                        {successMessage && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{successMessage}</span>
                            </div>
                        )}
                        <LoginForm
                            loginFormData={loginFormData}
                            setLoginFormData={setLoginFormData}
                            showPassword={showLoginPassword}
                            setShowPassword={setShowLoginPassword}
                            loading={loading}
                            onSubmit={handleLoginSubmit}
                            setError={setError}
                            error={error}
                            onSwitch={() => setIsLogin(true)}
                        />
                    </>
                )}
                {step === 'staff-otp' && StaffOTPForm}
                {step === 'staff-set-password' && StaffSetPasswordForm}
            </div>
        ),
        [step, loginFormData, showLoginPassword, loading, error, successMessage, otp, newPassword, confirmPassword, showNewPwd, showConfirmPwd, resendTimer]
    );

    const Left = useMemo(
        () => (
            <div className="form">
                <div className="logo-auth">
                    <img src="/images/logo.png" alt="company-logo" />
                </div>
                <SignUpForm onSwitch={() => setIsLogin(false)} />
            </div>
        ), []
    );

    return isMobile ? (
        <div className="auth">{isLogin ? Left : Right}</div>
    ) : (
        <div className="flex flex-row h-screen relative">
            {Right}
            {Left}
            <Overlay isActive={!isLogin} />
        </div>
    );
};

export default Auth;
