import React from 'react';
import { Bell, Shield, Smartphone, Globe } from 'lucide-react';

export default function SettingsView({ user }) {
  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Platform <span className="text-gradient">Settings</span></h1>
      
      <div className="dashboard-grid">
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} color="var(--primary)" /> Notifications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
              <span>Email alerts for new appointments</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
              <span>SMS alerts for appointment updates</span>
            </label>
            {user?.role !== 'ADMIN' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px' }} />
                <span>In-app secure message notifications</span>
              </label>
            )}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--primary)" /> Privacy & Security
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>Two-Factor Authentication (2FA)</button>
            <button className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>Manage Trusted Devices</button>
            <button className="btn btn-outline" style={{ justifyContent: 'flex-start', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete Account</button>
          </div>
        </div>
        
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={20} color="var(--primary)" /> Preferences
          </h2>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Language</label>
              <select className="input-field">
                <option>English (US)</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Timezone</label>
              <select className="input-field">
                <option>UTC (Default)</option>
                <option>EST (Eastern Standard Time)</option>
                <option>PST (Pacific Standard Time)</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}
