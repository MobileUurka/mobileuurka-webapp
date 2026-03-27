import { useMemo, useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom";
import Overlay from "../components/Overlay";
import LoginForm from "../components/LoginForm";
import { authService } from "../services/authServices";
import SignUpForm from "../components/SignUpForm";

interface AuthProps {
    onLoginSuccess: () => Promise<void>; // Add this prop
}

const Auth = ({ onLoginSuccess }: AuthProps) => {
    const [isLogin, setIsLogin] = useState<boolean>(false);
    const [isMobile] = useState<boolean>(window.innerWidth <= 900);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const [loginFormData, setLoginFormData] = useState<{ email: string; password: string }>({ email: "", password: "" });
    const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

    // Check for success message from navigation state
    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            // Clear the message from navigation state
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await authService.signIn({
                email: loginFormData.email,
                password: loginFormData.password,
            });

            if (response.success) {
                // IMPORTANT: Tell App.tsx that we have a key and session now
                await onLoginSuccess();

                // Now navigate will work because the Route guard is "unlocked"
                navigate('/');
            }
        } catch (err: any) {
            if (err.message === "Please verify your email address before signing in") {
                // Navigate to verify page with email and organization info
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
    }

    const Left = useMemo(
        () => (
            <div className="form">
                <div className="logo-auth">
                    <img src="/images/logo.png" alt="company-logo" />
                </div>
                <SignUpForm onSwitch={() => setIsLogin(false)} />
            </div>
        ), []
    )

    const Right = useMemo(
        () => (
            <div className="form">
                <div className="logo-auth">
                    <img src="/images/logo.png" alt="company-logo" />
                </div>
                {successMessage && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{successMessage}</span>
                        </div>
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
            </div>
        ), [
        loginFormData,
        showLoginPassword,
        loading,
        error,
        successMessage,
        setLoginFormData,
        setError,
        handleLoginSubmit,
    ]
    )

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

export default Auth