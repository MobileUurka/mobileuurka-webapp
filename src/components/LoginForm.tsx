import { useCallback } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type LoginFormData = {
    email: string;
    password: string;
    rememberMe?: boolean;
}

type Props = {
    loginFormData: LoginFormData;
    setLoginFormData: React.Dispatch<React.SetStateAction<LoginFormData>>;
    showPassword: boolean;
    setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
    loading: boolean;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    error: string | null;
    onSwitch: () => void;
}

const LoginForm = ({ loginFormData, setLoginFormData, showPassword, setShowPassword, loading, onSubmit, error, onSwitch
}: Props) => {
    const navigate = useNavigate();

    const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLoginFormData((prev) => ({ ...prev, email: value }));
    }, [setLoginFormData]);

    const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLoginFormData((prev) => ({ ...prev, password: value }));
    }, [setLoginFormData]);

    const handleRememberMeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginFormData((prev) => ({ ...prev, rememberMe: e.target.checked }));
    }, [setLoginFormData]);

    const togglePassword = useCallback(() => {
        setShowPassword((prev) => !prev);
    }, [setShowPassword]);

    return (
        <form onSubmit={onSubmit}>
            <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
                    placeholder="Enter your email"
                    value={loginFormData.email}
                    onChange={handleEmailChange}
                    autoComplete="email"
                />
            </div>
            <div className="input-group">
                <label htmlFor="password-login">Password</label>
                <div className="password-input">
                    <input
                        type={showPassword ? "text" : "password"}
                        id="password-login"
                        required
                        value={loginFormData.password}
                        onChange={handlePasswordChange}
                        autoComplete="current-password"
                        placeholder="Enter your password"

                    />
                    <span
                        className="password-toggle"
                        onClick={togglePassword}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                togglePassword();
                            }
                        }}
                    >
                        {showPassword ? (
                            <FaEyeSlash className="icon" />
                        ) : (
                            <FaEye className="icon" />
                        )}
                    </span>
                </div>
            </div>
            <div className="form-actions">
                <label className="remember-me">
                    <input
                        type="checkbox"
                        checked={loginFormData.rememberMe}
                        onChange={handleRememberMeChange}
                    />
                    <span>Remember me</span>
                </label>
                <button 
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-primary hover:underline text-sm"
                >
                    Forgot password?
                </button>
            </div>

            {error && <p className="text-red-500 text-[0.9rem] text-center mt-2">{error}</p>}

            <button type="submit" className="p-4 rounded-[8px] border-0 cursor-pointer bg-primary text-white mt-1" disabled={loading}>
                {loading ? "Loading..." : "Sign In"}
            </button>
            <p className="text-center decoration-0 text-[0.8rem] mt-3">
                Don't have an account? <span onClick={onSwitch} className="text-primary cursor-pointer">Signup</span>
            </p>

        </form>
    )
}

export default LoginForm