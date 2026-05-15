import React, { useState, useEffect } from 'react';
import { HeartPulse, Bell, User, Settings, LogOut, Sun, Moon, Shield } from 'lucide-react';
import PatientDashboard from './components/PatientDashboard';
import NurseDashboard from './components/NurseDashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [activeView, setActiveView] = useState('dashboard');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  const role = user.role;

  const renderDashboard = () => {
    if (activeView === 'profile') return <ProfileView user={user} />;
    if (activeView === 'settings') return <SettingsView user={user} />;

    // Default to Dashboard
    if (role === 'PATIENT') return <PatientDashboard user={user} />;
    if (role === 'NURSE') return <NurseDashboard user={user} />;
    if (role === 'ADMIN') return <AdminDashboard user={user} />;
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="brand">
          <HeartPulse className="brand-icon" size={32} />
          NurseConnect
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }} title="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', position: 'relative' }}>
            <Bell size={20} />
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--surface)' }}></span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.5rem', borderLeft: '1px solid var(--glass-border)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: role === 'ADMIN' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              {role === 'ADMIN' ? <Shield size={18} /> : <User size={18} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user.first_name} {user.last_name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{role}</span>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{ width: '250px', background: 'var(--surface)', borderRight: '1px solid var(--glass-border)', padding: '2rem 1rem', transition: 'background-color 0.3s ease' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={() => setActiveView('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: activeView === 'dashboard' ? 'rgba(79, 70, 229, 0.1)' : 'transparent', color: activeView === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left', transition: 'all 0.2s', fontSize: '1rem' }}>
              <HeartPulse size={20} />
              Dashboard
            </button>
            <button onClick={() => setActiveView('profile')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: activeView === 'profile' ? 'rgba(79, 70, 229, 0.1)' : 'transparent', color: activeView === 'profile' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left', transition: 'all 0.2s', fontSize: '1rem' }}>
              <User size={20} />
              My Profile
            </button>
            <button onClick={() => setActiveView('settings')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: activeView === 'settings' ? 'rgba(79, 70, 229, 0.1)' : 'transparent', color: activeView === 'settings' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', width: '100%', textAlign: 'left', transition: 'all 0.2s', fontSize: '1rem' }}>
              <Settings size={20} />
              Settings
            </button>
          </nav>
          
          <div style={{ position: 'absolute', bottom: '2rem', width: 'calc(250px - 2rem)' }}>
            <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: 'var(--danger)', background: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' }}>
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </aside>
        
        <main className="main-content">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
}

export default App;
