import { useMemo, useState } from "react"
import Overlay from "../components/Overlay";
import LoginForm from "../components/LoginForm";
import { authService } from "../services/authServices";
import { useNavigate } from "react-router-dom";

interface AuthProps {
    onLoginSuccess: () => Promise<void>; // Add this prop
}

const Auth = ({ onLoginSuccess }: AuthProps) => {
    const [isLogin, setIsLogin] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 900);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [loginFormData, setLoginFormData] = useState<{ email: string; password: string }>({ email: "", password: "" });
    const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

    // In your Auth component

    const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError(null);

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
            setError(err.message || 'Invalid credentials');
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
            </div>
        ), [

    ]
    )

    const Right = useMemo(
        () => (
            <div className="form">
                <div className="logo-auth">
                    <img src="/images/logo.png" alt="company-logo" />
                </div>
                <LoginForm
                    loginFormData={loginFormData}
                    setLoginFormData={setLoginFormData}
                    showPassword={showLoginPassword}
                    setShowPassword={setShowLoginPassword}
                    loading={loading}
                    onSubmit={handleLoginSubmit}
                    setError={setError}
                    error={error}
                    onSwitch={() => setIsLogin(false)}
                />
            </div>
        ), [

        loginFormData,
        showLoginPassword,
        loading,
        error,
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