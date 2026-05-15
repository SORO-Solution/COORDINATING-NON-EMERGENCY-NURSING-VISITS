import React, { useState } from 'react';
import axios from 'axios';
import { HeartPulse, Lock, User, Mail, ShieldCheck, ArrowRight, Eye, EyeOff, Stethoscope, Clock, Shield } from 'lucide-react';

export default function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!isLogin) {
        await axios.post('http://localhost:8000/api/register/', {
          username, password, first_name: firstName, last_name: lastName
        });
        setIsLogin(true);
        setError('__success__Account created! Please sign in.');
        setLoading(false);
        return;
      }
      const tokenRes = await axios.post('http://localhost:8000/api/token/', { username, password });
      const token = tokenRes.data.access;
      localStorage.setItem('token', token);
      const userRes = await axios.get('http://localhost:8000/api/me/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem('user', JSON.stringify(userRes.data));
      onLogin(userRes.data);
    } catch (err) {
      setError(isLogin ? 'Invalid username or password. Please try again.' : 'Failed to create account. That username may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Admin', value: 'admin', color: '#10b981' },
    { label: 'Nurse 1', value: 'nurse1', color: '#6366f1' },
    { label: 'Nurse 2', value: 'nurse2', color: '#6366f1' },
    { label: 'Patient', value: 'patient1', color: '#0ea5e9' },
  ];

  const isSuccess = error.startsWith('__success__');
  const displayError = isSuccess ? error.replace('__success__', '') : error;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-color)',
    }}>
      {/* Left Branding Panel */}
      <div style={{
        display: 'none',
        flex: '1',
        background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 100%)',
        padding: '3rem',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="login-panel-left"
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-80px', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(14,165,233,0.12)', filter: 'blur(80px)' }} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <HeartPulse size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>NurseConnect</span>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '2.75rem', fontWeight: '700', color: 'white', lineHeight: '1.2', marginBottom: '1.5rem' }}>
            Coordinating Care,<br />
            <span style={{ color: '#93c5fd' }}>Wherever You Are.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', lineHeight: '1.7', maxWidth: '420px' }}>
            A secure, role-based platform for patients, nurses, and administrators to coordinate non-emergency healthcare visits with clarity.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '3rem' }}>
            {[
              { icon: <Stethoscope size={18} />, text: 'Book specialized nurses with real-time availability' },
              { icon: <Shield size={18} />, text: 'AES-256 encrypted messaging and health records' },
              { icon: <Clock size={18} />, text: 'Smart scheduling with constraint-satisfaction logic' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.75)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '0.925rem' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>© 2026 NurseConnect · All rights reserved.</p>
      </div>

      {/* Right Form Panel */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        maxWidth: '560px',
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Mobile Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 20px rgba(79,70,229,0.35)' }}>
              <HeartPulse size={22} />
            </div>
            <span style={{ fontSize: '1.375rem', fontWeight: '700' }}>NurseConnect</span>
          </div>

          {/* Header Text */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.975rem' }}>
              {isLogin
                ? 'Sign in to access your care dashboard.'
                : 'Register as a patient to book nursing visits.'}
            </p>
          </div>

          {/* Alert Banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              background: isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              color: isSuccess ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              padding: '0.875rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem',
            }}>
              <ShieldCheck size={18} style={{ marginTop: '1px', flexShrink: 0 }} />
              {displayError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {!isLogin && (
              <div style={{ display: 'flex', gap: '0.875rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '0.35rem' }}>First Name</label>
                  <input type="text" className="input-field" placeholder="Alex" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '0.35rem' }}>Last Name</label>
                  <input type="text" className="input-field" placeholder="Johnson" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>
            )}

            <div>
              <label className="input-label" style={{ marginBottom: '0.35rem' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label" style={{ marginBottom: '0.35rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', justifyContent: 'center', fontSize: '1rem', gap: '0.5rem' }}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Toggle */}
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Demo Accounts */}
          {isLogin && (
            <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={14} /> Demo Accounts · password: <strong style={{ color: 'var(--text-main)' }}>password123</strong>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {demoAccounts.map(acc => (
                  <button
                    key={acc.value}
                    type="button"
                    onClick={() => { setUsername(acc.value); setPassword('password123'); }}
                    style={{
                      background: 'var(--surface-light)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = acc.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: acc.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{acc.label}:</span>
                    <strong>{acc.value}</strong>
                  </button>
                ))}
              </div>
              <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Click any account to auto-fill, then press Sign In.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .login-panel-left { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
