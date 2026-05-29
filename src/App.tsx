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
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import { useEffect, useState, useCallback } from 'react';
import { authService } from './services/authServices';
import Hospital from './pages/Hospital';
import Feedback from './pages/Feedback';
import { ToastProvider } from './contexts/ToastContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import Verify from './pages/Verify';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import LoadingSpinner from './components/LoadingSpinner';
import { useAppDispatch } from './store/hooks';
import { resetStore } from './store';
import { socketService } from './services/socketService';
import { fetchNotifications } from './store/notificationsSlice';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useAppDispatch();

  const checkAuth = useCallback(async () => {
    const hasKeys = await authService.initializeEncryption();
    const hasToken = authService.isAuthenticated();
    setIsAuthenticated(hasKeys && hasToken);
    setIsInitialized(true);
  }, []);

  

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      dispatch(resetStore());
      socketService.disconnect();
      setIsAuthenticated(false);
    };
    window.addEventListener('auth-logout', handleUnauthorized);
    return () => window.removeEventListener('auth-logout', handleUnauthorized);
  }, [checkAuth, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
    }
  }, [isAuthenticated, dispatch]);

  if (!isInitialized) {
    return (
      <div className="loading-screen m-auto h-screen flex items-center justify-center">
        <LoadingSpinner message="Initializing secure session..." size="lg" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <FeedbackProvider>
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
              <Route path="/Notifications" element={<Notifications />} />
              <Route path="/Settings" element={<Settings />} />
              <Route path="/Feedback" element={<Feedback />} />
              {/* Redirect /auth to dashboard if already logged in */}
              <Route path="/auth" element={<Navigate to="/" replace />} />
              <Route path="*" element={<div>Page not found</div>} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
      </FeedbackProvider>
    </ToastProvider>
  );
}

export default App;