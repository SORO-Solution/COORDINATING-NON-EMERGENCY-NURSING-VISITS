import React from 'react';
import { User, Mail, Shield, Activity } from 'lucide-react';

export default function ProfileView({ user }) {
  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>My <span className="text-gradient">Profile</span></h1>
      
      <div className="card" style={{ maxWidth: '600px', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <User size={48} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{user.first_name} {user.last_name}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>@{user.username}</p>
          <span className="badge badge-confirmed">{user.role}</span>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Account Details</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16}/> First Name</div>
          <div>{user.first_name}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16}/> Last Name</div>
          <div>{user.last_name}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16}/> Email Address</div>
          <div>{user.email || 'No email provided'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={16}/> Privilege Level</div>
          <div>{user.role}</div>
        </div>
        
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary">Edit Profile</button>
          <button className="btn btn-outline">Change Password</button>
        </div>
      </div>
    </div>
  );
}
