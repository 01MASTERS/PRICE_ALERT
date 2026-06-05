import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { Home } from './pages/Home';
import { SettingsPage } from './pages/SettingsPage';
import { Onboarding } from './pages/Onboarding';
import { fetchMe } from './services/api';
import type { AuthResponse, User } from './types/user';

function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('price_alert_token');
    if (!token) {
      setCheckingSession(false);
      return;
    }

    fetchMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('price_alert_token'))
      .finally(() => setCheckingSession(false));
  }, []);

  const handleAuthenticated = (auth: AuthResponse, isNewUser?: boolean) => {
    localStorage.setItem('price_alert_token', auth.access_token);
    setUser(auth.user);
    if (isNewUser) {
      setShowOnboarding(true);
    }
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('price_alert_token');
    setUser(null);
    setShowOnboarding(false);
    navigate('/login');
  };

  if (checkingSession) {
    return <div className="min-h-screen grid place-items-center text-gray-500">Loading...</div>;
  }

  return (
    <>
      {showOnboarding && user && (
        <Onboarding 
          user={user} 
          onComplete={(u) => { 
            setUser(u); 
            setShowOnboarding(false); 
          }} 
        />
      )}
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <AuthPage onAuthenticated={handleAuthenticated} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/settings" 
          element={user ? <SettingsPage user={user} onUserChange={setUser} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={user ? <Home user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;