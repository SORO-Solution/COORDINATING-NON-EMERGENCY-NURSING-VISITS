import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { HeartPulse, Bell, User, Settings, LogOut, Sun, Moon, Shield, MessageSquare, LayoutDashboard, Calendar } from 'lucide-react';

const API = 'http://localhost:8000/api';
import PatientDashboard from './components/PatientDashboard';
import NurseDashboard from './components/NurseDashboard';
import AdminDashboard from './components/AdminDashboard';
import Messaging from './components/Messaging';
import AvailabilityManager from './components/AvailabilityManager';
import Login from './components/Login';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [activeView, setActiveView] = useState('dashboard');
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // Poll for unread message counts every 30 seconds
  const refreshUnread = useCallback(async (currentUser) => {
    if (!currentUser) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`${API}/messages/thread-summary/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const summary = res.data;
      const lastSeen = JSON.parse(localStorage.getItem('nc_last_seen') || '{}');
      let count = 0;
      for (const [apptId, info] of Object.entries(summary)) {
        if (!info.last_message_at) continue;
        if (info.last_sender_id === currentUser.id) continue;
        const seenAt = lastSeen[apptId];
        if (!seenAt || new Date(info.last_message_at) > new Date(seenAt)) count++;
      }
      setTotalUnread(count);
    } catch { /* token may be expired */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshUnread(user);
    const iv = setInterval(() => refreshUnread(user), 30000);
    return () => clearInterval(iv);
  }, [user, refreshUnread]);

  // Re-check immediately when switching to messages view (mark handled by Messaging)
  useEffect(() => {
    if (activeView === 'messages' && user) {
      // Small delay so Messaging can mark threads as read first
      const t = setTimeout(() => refreshUnread(user), 800);
      return () => clearTimeout(t);
    }
  }, [activeView, user, refreshUnread]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTotalUnread(0);
  };

  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  const role = user.role;

  const renderDashboard = () => {
    if (activeView === 'profile') return <ProfileView user={user} />;
    if (activeView === 'settings') return <SettingsView user={user} />;
    if (activeView === 'messages') return <Messaging user={user} />;
    if (activeView === 'availability') return <AvailabilityManager user={user} />;
    if (role === 'PATIENT') return <PatientDashboard user={user} />;
    if (role === 'NURSE') return <NurseDashboard user={user} onNavigate={setActiveView} />;
    if (role === 'ADMIN') return <AdminDashboard user={user} />;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'messages', label: 'Secure Messages', icon: MessageSquare, badge: totalUnread },
    ...(role === 'NURSE' || role === 'ADMIN'
      ? [{ id: 'availability', label: 'Availability', icon: Calendar }]
      : []),
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
        <aside style={{ width: '250px', background: 'var(--surface)', borderRight: '1px solid var(--glass-border)', padding: '2rem 1rem', transition: 'background-color 0.3s ease', position: 'relative' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: activeView === id ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                  color: activeView === id ? 'var(--primary)' : 'var(--text-muted)',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: '500', width: '100%', textAlign: 'left',
                  transition: 'all 0.2s', fontSize: '1rem',
                }}
              >
                <Icon size={20} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    background: 'var(--danger)', color: 'white', borderRadius: '10px',
                    minWidth: '20px', height: '20px', fontSize: '0.65rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '700', padding: '0 5px', flexShrink: 0,
                  }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            ))}
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
