import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Activity, Plus, MessageSquare, ChevronRight, User, Sparkles, X } from 'lucide-react';

const API = `http://${window.location.hostname}:8000/api`;
const CARE_TYPES = [
  'Wound Care', 'IV Therapy', 'General Care', 'Pediatrics', 'Physiotherapy',
  'Post-Op Care', 'Cardiac Care', 'Oncology', 'Respiratory Care', 'Mental Health',
  'Geriatric Care', 'Palliative Care', 'Diabetes Management', 'Neurology', 'Orthopedics',
];

export default function PatientDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState(CARE_TYPES[0]);
  const [newNotes, setNewNotes] = useState('');
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null); // null | 'success' | 'error'
  const [matchMessage, setMatchMessage] = useState('');

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const r = await axios.get(`${API}/appointments/`, { headers: { Authorization: `Bearer ${token}` } });
      setAppointments(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = () => {
    setShowModal(true);
    setMatchResult(null);
    setMatchMessage('');
    setNewDate('');
    setNewNotes('');
    setNewType(CARE_TYPES[0]);
  };

  const handleRequestVisit = async (e) => {
    e.preventDefault();
    setMatching(true);
    setMatchResult(null);
    setMatchMessage('');
    try {
      const r = await axios.post(`${API}/appointments/request/`, {
        care_type: newType,
        date: newDate,
        notes: newNotes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      const appt = r.data;
      const nurseName = `${appt.nurse_details?.user?.first_name || ''} ${appt.nurse_details?.user?.last_name || ''}`.trim();
      setMatchResult('success');
      setMatchMessage(`Matched! ${nurseName} (${appt.nurse_details?.specialisation}) will visit you on ${appt.date} at ${appt.start_time}.`);
      fetchData();
    } catch (err) {
      setMatchResult('error');
      setMatchMessage(err.response?.data?.error || 'No nurse available. Try a different date.');
    } finally {
      setMatching(false);
    }
  };

  const upcoming = appointments.filter(a => ['PENDING', 'CONFIRMED'].includes(a.status));
  const completed = appointments.filter(a => a.status === 'COMPLETED');

  const statusClass = (s) => s === 'CONFIRMED' ? 'badge-confirmed' : s === 'COMPLETED' ? 'badge-success' : 'badge-pending';

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            Welcome back, <span className="text-gradient">{user.first_name}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Here's your care schedule.</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={20} /> Request Visit
        </button>
      </div>

      {/* Smart-match modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Request a Visit</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
              <Sparkles size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Our algorithm will automatically match you to the best available nurse based on specialisation and workload.
              </p>
            </div>

            {matchResult && (
              <div style={{
                padding: '0.875rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.875rem',
                background: matchResult === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                color: matchResult === 'success' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${matchResult === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                {matchMessage}
              </div>
            )}

            {matchResult !== 'success' && (
              <form onSubmit={handleRequestVisit}>
                <div className="input-group">
                  <label className="input-label">Care Type</label>
                  <select className="input-field" value={newType} onChange={e => setNewType(e.target.value)} required>
                    {CARE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Preferred Date</label>
                  <input type="date" className="input-field" value={newDate} onChange={e => setNewDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="input-group">
                  <label className="input-label">Notes (optional)</label>
                  <textarea className="input-field" rows={2} style={{ resize: 'vertical' }} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Any special instructions..." />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={matching}>
                    {matching ? 'Finding best nurse…' : 'Find & Book'}
                  </button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            )}

            {matchResult === 'success' && (
              <button className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setShowModal(false)}>
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div className="stat-title">Upcoming Visits</div><div className="stat-value">{upcoming.length}</div></div>
            <div style={{ padding: '10px', background: 'rgba(14,165,233,0.1)', borderRadius: '10px', color: 'var(--accent)' }}><Calendar size={24} /></div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div className="stat-title">Completed Visits</div><div className="stat-value">{completed.length}</div></div>
            <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', color: 'var(--success)' }}><Activity size={24} /></div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div className="stat-title">Total Visits</div><div className="stat-value">{appointments.length}</div></div>
            <div style={{ padding: '10px', background: 'rgba(79,70,229,0.1)', borderRadius: '10px', color: 'var(--primary)' }}><MessageSquare size={24} /></div>
          </div>
        </div>
      </div>

      {/* Appointment list */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Your Appointments</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {appointments.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>No appointments yet. Request your first visit above.</p>
          )}
          {appointments.map(visit => (
            <div key={visit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{visit.care_type}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Nurse: {visit.nurse_details?.user?.first_name || '—'} {visit.nurse_details?.user?.last_name || ''} &bull; {visit.nurse_details?.specialisation || ''}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {visit.date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {visit.start_time}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge ${statusClass(visit.status)}`}>{visit.status}</span>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
