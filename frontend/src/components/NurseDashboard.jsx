import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, MapPin, Activity, CheckCircle, MessageSquare, ChevronRight, User } from 'lucide-react';

export default function NurseDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availDate, setAvailDate] = useState('');
  const [availStart, setAvailStart] = useState('');
  const [availEnd, setAvailEnd] = useState('');
  
  // Since user from /me/ is CustomUser, we would fetch NurseProfile normally
  // For the MVP, we just show their name.

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/appointments/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateAvailability = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // For MVP, we'll just mock this success since we need the exact NurseProfile ID 
      // which we'd get from a /api/nurses/me/ endpoint ideally.
      alert(`Availability set for ${availDate} from ${availStart} to ${availEnd}!`);
      setShowAvailabilityModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update availability');
    }
  };

  const handleStartVisit = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:8000/api/appointments/${id}/`, 
        { status: 'COMPLETED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAppointments();
      alert('Visit marked as COMPLETED!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome, <span className="text-gradient">{user.first_name}</span></h1>
          <p style={{ color: 'var(--text-muted)' }}>You have {appointments.filter(a => a.status !== 'COMPLETED').length} active patient visits assigned.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAvailabilityModal(true)}>
          <Calendar size={20} />
          Update Availability
        </button>
      </div>

      {showAvailabilityModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', transform: 'scale(1)', animation: 'fadeIn 0.2s ease-out' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Set Availability</h2>
            <form onSubmit={handleUpdateAvailability}>
              <div className="input-group">
                <label className="input-label">Date</label>
                <input type="date" className="input-field" value={availDate} onChange={e => setAvailDate(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Start Time</label>
                  <input type="time" className="input-field" value={availStart} onChange={e => setAvailStart(e.target.value)} required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">End Time</label>
                  <input type="time" className="input-field" value={availEnd} onChange={e => setAvailEnd(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAvailabilityModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Assigned Visits</div>
              <div className="stat-value">{appointments.filter(a => a.status !== 'COMPLETED').length}</div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '10px', color: 'var(--accent)' }}>
              <Activity size={24} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Completed Visits</div>
              <div className="stat-value">{appointments.filter(a => a.status === 'COMPLETED').length}</div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: 'var(--success)' }}>
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>My Schedule</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setActiveTab('today')}
                style={{ background: 'none', border: 'none', color: activeTab === 'today' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: activeTab === 'today' ? '600' : '400', paddingBottom: '0.25rem', borderBottom: activeTab === 'today' ? '2px solid var(--primary)' : '2px solid transparent' }}
              >
                All Assigned
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {appointments.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No assigned visits.</p> : appointments.map(visit => (
              <div key={visit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{visit.patient_details?.first_name} {visit.patient_details?.last_name} <span style={{fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:'normal'}}>({visit.care_type})</span></h3>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {visit.date}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {visit.start_time}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <span className={`badge ${visit.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-pending'}`}>
                    {visit.status}
                  </span>
                  {visit.status !== 'COMPLETED' && (
                    <button onClick={() => handleStartVisit(visit.id)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      Complete Visit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>My Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px' }}>
             <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
             <p><strong>Username:</strong> {user.username}</p>
             <p><strong>Email:</strong> {user.email}</p>
             <p><strong>Role:</strong> {user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
