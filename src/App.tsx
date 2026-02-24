import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';

function AppContent() {
  const { user, profile, loading, isAdmin } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      setView('register');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return view === 'register' ? <RegisterForm /> : <LoginForm />;
  }

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
