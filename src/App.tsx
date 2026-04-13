import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import './hamburger.css';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Screening from './pages/Screening';
import Patients from './pages/Patients';
import Patient from './pages/Patient';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import { useEffect, useState, useCallback } from 'react';
import { authService } from './services/authServices';
import Hospital from './pages/Hospital';
import { ToastProvider } from './contexts/ToastContext';
import Verify from './pages/Verify';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // We use useCallback so this function doesn't change on every render
  const checkAuth = useCallback(async () => {
    // 1. Initialize encryption keys first
    const hasKeys = await authService.initializeEncryption();
    
    // const data = await authService.getUser();

    // 2. Check if we actually have a valid token (decrypted)
    const hasToken = authService.isAuthenticated();

    setIsAuthenticated(hasKeys && hasToken);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    checkAuth();

    // OPTIONAL: Listen for a "logout" event if triggered by the apiClient
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth-logout', handleUnauthorized);
    return () => window.removeEventListener('auth-logout', handleUnauthorized);
  }, [checkAuth]);

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Initializing Secure Session...</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {!isAuthenticated ? (
            // Use a specific path for Auth and redirect all others to it
            <>
              <Route path="/auth" element={<Auth onLoginSuccess={checkAuth} />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </>
          ) : 
          (
            <Route element={<Layout />}>
              <Route path="/Dashboard" element={<Dashboard />} />
              <Route path="/Staff" element={<Staff />} />
              <Route path="/Screening" element={<Screening />} />
              <Route path="/Screening/:tabId" element={<Screening />} />
              <Route path="/Patients" element={<Patients />} />
              <Route path="/" element={<Patients />} />
              <Route path="/Hospital" element={<Hospital />} />
              <Route path="/Patient/:id" element={<Patient />} />
              <Route path="/Alerts" element={<Alerts />} />
              <Route path="/Settings" element={<Settings />} />
              {/* Redirect /auth to dashboard if already logged in */}
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route path="*" element={<div>Page not found</div>} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;