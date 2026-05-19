import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, Activity, CheckCircle, User, X, Download, FileText, RefreshCw } from 'lucide-react';

const API = `http://${window.location.hostname}:8000/api`;
const SPECIALISATIONS = [
  'Wound Care', 'IV Therapy', 'General Care', 'Pediatrics', 'Physiotherapy',
  'Post-Op Care', 'Cardiac Care', 'Oncology', 'Respiratory Care', 'Mental Health',
  'Geriatric Care', 'Palliative Care', 'Diabetes Management', 'Neurology', 'Orthopedics',
];

export default function NurseDashboard({ user, onNavigate }) {
  const [appointments, setAppointments] = useState([]);
  const [nurseProfile, setNurseProfile] = useState(null);
  const [myAvailabilities, setMyAvailabilities] = useState([]);
  const [specRequests, setSpecRequests] = useState([]);

  // Spec change request modal
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [newSpec, setNewSpec] = useState('');
  const [specReason, setSpecReason] = useState('');
  const [specSubmitting, setSpecSubmitting] = useState(false);
  const [specError, setSpecError] = useState('');

  const token = localStorage.getItem('token');

  const fetchAll = async () => {
    try {
      const [apptRes, profileRes, availRes, specRes] = await Promise.all([
        axios.get(`${API}/appointments/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/nurses/me/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/availabilities/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/spec-requests/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setAppointments(apptRes.data);
      setNurseProfile(profileRes.data);
      setMyAvailabilities(availRes.data);
      setSpecRequests(specRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCompleteVisit = async (id) => {
    try {
      await axios.patch(`${API}/appointments/${id}/`, { status: 'COMPLETED' }, { headers: { Authorization: `Bearer ${token}` } });
      fetchAll();
    } catch { alert('Failed to update visit status.'); }
  };

  const handleConfirmVisit = async (id) => {
    try {
      await axios.patch(`${API}/appointments/${id}/`, { status: 'CONFIRMED' }, { headers: { Authorization: `Bearer ${token}` } });
      fetchAll();
    } catch { alert('Failed to confirm visit.'); }
  };

  const handleSpecRequest = async (e) => {
    e.preventDefault();
    setSpecSubmitting(true);
    setSpecError('');
    try {
      await axios.post(`${API}/spec-requests/`, {
        requested_specialisation: newSpec,
        reason: specReason,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowSpecModal(false);
      setNewSpec(''); setSpecReason('');
      fetchAll();
    } catch (err) {
      setSpecError(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setSpecSubmitting(false);
    }
  };

  const downloadReport = (url, filename) => {
    const a = document.createElement('a');
    a.href = url + `?token=${token}`;
    // Use axios to download with auth header
    axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    }).then(r => {
      const href = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href = href; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(href);
    }).catch(() => alert('Failed to generate report.'));
  };

  const active = appointments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
  const done = appointments.filter(a => a.status === 'COMPLETED');
  const pendingSpecReq = specRequests.find(r => r.status === 'PENDING');

  const statusClass = (s) => s === 'CONFIRMED' ? 'badge-confirmed' : s === 'COMPLETED' ? 'badge-success' : 'badge-pending';
  const specStatusColor = (s) => s === 'APPROVED' ? 'var(--success)' : s === 'REJECTED' ? 'var(--danger)' : '#f59e0b';

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            Welcome, <span className="text-gradient">{user.first_name}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {active.length} active visit{active.length !== 1 ? 's' : ''}
            {nurseProfile && ` · ${nurseProfile.specialisation}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={() => onNavigate?.('availability')}>
            <Calendar size={18} /> Manage Availability
          </button>
          <button className="btn btn-primary" onClick={() => setShowSpecModal(true)} disabled={!!pendingSpecReq}>
            <RefreshCw size={18} />
            {pendingSpecReq ? 'Spec Request Pending' : 'Request Spec Change'}
          </button>
        </div>
      </div>

      {/* Spec change request modal */}
      {showSpecModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowSpecModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', zIndex: 100 }}
        >
          <div 
            className="animate-slide-in-right" 
            style={{ 
              width: '100%', maxWidth: '440px', background: 'var(--surface)', maxHeight: 'calc(100vh - 3rem)', 
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', border: '1px solid var(--glass-border)', borderRadius: '16px', margin: '1.5rem',
              display: 'flex', flexDirection: 'column', padding: '2.5rem 2rem', overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Request Spec Change</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Submit a formal request to change your current specialisation.</p>
              </div>
              <button onClick={() => setShowSpecModal(false)} style={{ background: 'var(--surface-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><X size={18} /></button>
            </div>
            
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Current Specialisation: <strong style={{ color: 'var(--primary)' }}>{nurseProfile?.specialisation || 'None'}</strong>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Your request will be submitted to the administration for review.</div>
            </div>

            {specError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{specError}</div>
            )}
            
            <form onSubmit={handleSpecRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              <div className="input-group">
                <label className="input-label">Requested Specialisation</label>
                <select className="input-field" value={newSpec} onChange={e => setNewSpec(e.target.value)} required>
                  <option value="">— Select —</option>
                  {SPECIALISATIONS.filter(s => s !== nurseProfile?.specialisation).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Reason</label>
                <textarea className="input-field" rows={4} style={{ resize: 'vertical' }} value={specReason} onChange={e => setSpecReason(e.target.value)} placeholder="Explain why you're requesting this change…" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={specSubmitting}>{specSubmitting ? 'Submitting…' : 'Submit Request'}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSpecModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Active Visits', value: active.length, icon: Activity, color: 'var(--accent)', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Completed', value: done.length, icon: CheckCircle, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Open Slots', value: myAvailabilities.filter(a => !a.is_booked).length, icon: Calendar, color: 'var(--primary)', bg: 'rgba(79,70,229,0.1)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div className="stat-title">{s.label}</div><div className="stat-value">{s.value}</div></div>
              <div style={{ padding: '10px', background: s.bg, borderRadius: '10px', color: s.color }}><s.icon size={24} /></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        {/* Schedule */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>My Schedule</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {appointments.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No assigned visits yet.</p>}
            {appointments.map(visit => (
              <div key={visit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>
                      {visit.patient_details?.first_name} {visit.patient_details?.last_name}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}> · {visit.care_type}</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {visit.date}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> {visit.start_time}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span className={`badge ${statusClass(visit.status)}`}>{visit.status}</span>
                  {visit.status === 'PENDING' && (
                    <button onClick={() => handleConfirmVisit(visit.id)} className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Confirm</button>
                  )}
                  {visit.status === 'CONFIRMED' && (
                    <button onClick={() => handleCompleteVisit(visit.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Complete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>My Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Name: </span><strong>{user.first_name} {user.last_name}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Username: </span>{user.username}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Email: </span>{user.email || '—'}</div>
              {nurseProfile && (
                <div><span style={{ color: 'var(--text-muted)' }}>Specialisation: </span><strong style={{ color: 'var(--primary)' }}>{nurseProfile.specialisation}</strong></div>
              )}
            </div>
          </div>

          {/* Spec change history */}
          {specRequests.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Spec Change Requests</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {specRequests.slice(0, 5).map(r => (
                  <div key={r.id} style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-light)', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{r.current_specialisation} → {r.requested_specialisation}</span>
                      <span style={{ fontWeight: '600', color: specStatusColor(r.status) }}>{r.status}</span>
                    </div>
                    {r.admin_note && <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>Note: {r.admin_note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Availability slots */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem' }}>My Availability</h2>
              <button onClick={() => onNavigate?.('availability')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={13} /> Manage
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '0.6rem', background: 'rgba(16,185,129,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>{myAvailabilities.filter(a => !a.is_booked).length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '0.6rem', background: 'rgba(245,158,11,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706' }}>{myAvailabilities.filter(a => a.is_booked).length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Booked</div>
              </div>
            </div>
            {myAvailabilities.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No slots added yet. Click Manage to add slots.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
              {myAvailabilities.slice(0, 8).map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.6rem', background: 'var(--surface-light)', borderRadius: '8px', fontSize: '0.78rem' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{a.date}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{a.start_time?.slice(0,5)} – {a.end_time?.slice(0,5)}</div>
                  </div>
                  <span className={`badge ${a.is_booked ? 'badge-pending' : 'badge-confirmed'}`} style={{ fontSize: '0.68rem' }}>
                    {a.is_booked ? 'Booked' : 'Open'}
                  </span>
                </div>
              ))}
              {myAvailabilities.length > 8 && (
                <button onClick={() => onNavigate?.('availability')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.78rem', textAlign: 'center', padding: '0.3rem' }}>
                  +{myAvailabilities.length - 8} more — view all
                </button>
              )}
            </div>
          </div>

          {/* Reports */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              <FileText size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Download Reports
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'My Schedule (CSV)', url: `${API}/reports/nurse/schedule/csv/`, filename: 'my_schedule.csv' },
                { label: 'My Schedule (PDF)', url: `${API}/reports/nurse/schedule/pdf/`, filename: 'my_schedule.pdf' },
                { label: 'My Availability (CSV)', url: `${API}/reports/nurse/availability/csv/`, filename: 'my_availability.csv' },
              ].map(({ label, url, filename }) => (
                <button key={label} onClick={() => downloadReport(url, filename)} className="btn btn-outline" style={{ justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
                  <Download size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
