import React, { useState } from 'react';
import axios from 'axios';
import { HeartPulse, Lock, User, Mail, ShieldCheck } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isLogin) {
        // Register flow
        await axios.post('http://localhost:8000/api/register/', {
          username, password, first_name: firstName, last_name: lastName
        });
        // After successful register, switch to login
        setIsLogin(true);
        setError('Account created successfully! Please sign in.');
        setLoading(false);
        return;
      }

      // Login flow
      const tokenRes = await axios.post('http://localhost:8000/api/token/', {
        username,
        password
      });
      const token = tokenRes.data.access;
      localStorage.setItem('token', token);

      const userRes = await axios.get('http://localhost:8000/api/me/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = userRes.data;
      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData);
    } catch (err) {
      setError(isLogin ? 'Invalid username or password.' : 'Failed to create account. Username might be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', color: 'white', marginBottom: '1rem', boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)' }}>
            <HeartPulse size={32} />
          </div>
          <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>NurseConnect</h1>
          <p style={{ color: 'var(--text-muted)' }}>{isLogin ? 'Sign in to coordinate your care.' : 'Create your patient account.'}</p>
        </div>

        {error && (
          <div style={{ background: error.includes('success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: error.includes('success') ? 'var(--success)' : 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">First Name</label>
                <input type="text" className="input-field" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="input-label">Last Name</label>
                <input type="text" className="input-field" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '2.75rem' }} 
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="input-field" 
                style={{ paddingLeft: '2.75rem' }} 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.875rem' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {isLogin && (
          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <p style={{ textAlign: 'center', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><ShieldCheck size={16} /> Demo Accounts (PW: password123)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: 'var(--surface-light)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center' }}>Admin: <strong>admin</strong></div>
              <div style={{ background: 'var(--surface-light)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center' }}>Nurses: <strong>nurse1, nurse2</strong></div>
              <div style={{ background: 'var(--surface-light)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', gridColumn: '1 / -1' }}>Patients: <strong>patient1 - patient6</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
