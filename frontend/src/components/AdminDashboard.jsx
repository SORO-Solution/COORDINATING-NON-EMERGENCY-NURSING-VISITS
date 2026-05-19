import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, UserPlus, FileText, BarChart2, Search, X,
  Shield, Stethoscope, CheckCircle, XCircle, Download, RefreshCw, Calendar,
} from 'lucide-react';
import AvailabilityManager from './AvailabilityManager';

const API = `http://${window.location.hostname}:8000/api`;
const SPECIALISATIONS = [
  'Wound Care', 'IV Therapy', 'General Care', 'Pediatrics', 'Physiotherapy',
  'Post-Op Care', 'Cardiac Care', 'Oncology', 'Respiratory Care', 'Mental Health',
  'Geriatric Care', 'Palliative Care', 'Diabetes Management', 'Neurology', 'Orthopedics',
];

export default function AdminDashboard({ user, initialTab }) {
  const [appointments, setAppointments] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [users, setUsers] = useState([]);
  const [specRequests, setSpecRequests] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab || 'appointments');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Edit appointment modal
  const [editAppt, setEditAppt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Add user modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('PATIENT');
  const [newSpec, setNewSpec] = useState('General Care');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  // Direct spec assignment modal
  const [assignSpecNurse, setAssignSpecNurse] = useState(null);
  const [assignSpec, setAssignSpec] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Spec request review modal
  const [reviewReq, setReviewReq] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const token = localStorage.getItem('token');

  const fetchAll = async () => {
    try {
      const [apptRes, nursesRes, usersRes, specRes] = await Promise.all([
        axios.get(`${API}/appointments/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/nurses/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/users/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/spec-requests/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setAppointments(apptRes.data);
      setNurses(nursesRes.data);
      setUsers(usersRes.data);
      setSpecRequests(specRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/appointments/${id}/`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      fetchAll();
    } catch { alert('Failed to update status'); }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API}/appointments/${editAppt.id}/`, { date: editDate, start_time: editTime }, { headers: { Authorization: `Bearer ${token}` } });
      setEditAppt(null); fetchAll();
    } catch { alert('Failed to update appointment.'); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAdding(true); setAddError('');
    try {
      await axios.post(`${API}/users/`, {
        username: newUsername, password: newPassword,
        first_name: newFirst, last_name: newLast, email: newEmail,
        role: newRole, specialisation: newSpec,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowAddUser(false);
      setNewUsername(''); setNewFirst(''); setNewLast(''); setNewEmail('');
      setNewRole('PATIENT'); setNewSpec('General Care');
      fetchAll();
    } catch (err) { setAddError(err.response?.data?.error || 'Failed to create user.'); }
    finally { setAdding(false); }
  };

  const handleAssignSpec = async (e) => {
    e.preventDefault();
    setAssigning(true);
    try {
      await axios.patch(`${API}/nurses/${assignSpecNurse.id}/set-specialisation/`, { specialisation: assignSpec }, { headers: { Authorization: `Bearer ${token}` } });
      setAssignSpecNurse(null); setAssignSpec('');
      fetchAll();
    } catch { alert('Failed to assign specialisation.'); }
    finally { setAssigning(false); }
  };

  const handleReview = async (action) => {
    setReviewing(true);
    try {
      await axios.post(`${API}/spec-requests/${reviewReq.id}/${action}/`, { admin_note: reviewNote }, { headers: { Authorization: `Bearer ${token}` } });
      setReviewReq(null); setReviewNote('');
      fetchAll();
    } catch { alert('Failed to review request.'); }
    finally { setReviewing(false); }
  };

  const downloadReport = (url, filename) => {
    axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })
      .then(r => {
        const href = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = href; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(href);
      }).catch(() => alert('Failed to generate report.'));
  };

  const filteredAppts = appointments.filter(a =>
    !search || `${a.patient_details?.first_name} ${a.patient_details?.last_name} ${a.nurse_details?.user?.first_name} ${a.nurse_details?.user?.last_name} ${a.care_type}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = users.filter(u =>
    !search || `${u.first_name} ${u.last_name} ${u.username} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );
  const nurseWorkload = nurses.map(n => ({
    id: n.id, name: `${n.user.first_name} ${n.user.last_name}`,
    spec: n.specialisation, active: n.active_appointments,
  })).sort((a, b) => b.active - a.active);

  const pendingSpecs = specRequests.filter(r => r.status === 'PENDING').length;

  const Tab = ({ id, label, Icon, badge }) => (
    <button onClick={() => setActiveTab(id)} style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
      background: activeTab === id ? 'rgba(79,70,229,0.1)' : 'transparent',
      color: activeTab === id ? 'var(--primary)' : 'var(--text-muted)',
      fontWeight: activeTab === id ? '600' : '400', fontSize: '0.875rem', position: 'relative',
    }}>
      <Icon size={15} /> {label}
      {badge > 0 && (
        <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{badge}</span>
      )}
    </button>
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>System <span className="text-gradient">Overview</span></h1>
          <p style={{ color: 'var(--text-muted)' }}>Platform management &amp; analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={15} />
            <input type="text" placeholder="Search…" className="input-field" style={{ paddingLeft: '2.2rem', width: '200px' }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddUser(true)}><UserPlus size={17} /> Add User</button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Appointments', value: appointments.length, icon: FileText, color: 'var(--accent)', bg: 'rgba(14,165,233,0.1)' },
          { label: 'Pending', value: appointments.filter(a => a.status === 'PENDING').length, icon: BarChart2, color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Total Nurses', value: nurses.length, icon: Stethoscope, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Total Users', value: users.length, icon: Users, color: 'var(--primary)', bg: 'rgba(79,70,229,0.1)' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><div className="stat-title">{s.label}</div><div className="stat-value">{s.value}</div></div>
              <div style={{ padding: '10px', background: s.bg, borderRadius: '10px', color: s.color }}><s.icon size={24} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', padding: '0.4rem', background: 'var(--surface)', borderRadius: '12px', width: 'fit-content', border: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
        <Tab id="appointments" label="Appointments" Icon={FileText} />
        <Tab id="users" label="Users" Icon={Users} />
        <Tab id="workload" label="Workload" Icon={BarChart2} />
        <Tab id="availability" label="Availability" Icon={Calendar} />
        <Tab id="spec-requests" label="Spec Requests" Icon={RefreshCw} badge={pendingSpecs} />
        <Tab id="reports" label="Reports" Icon={Download} />
      </div>

      {/* ── Edit appointment modal ── */}
      {editAppt && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditAppt(null); }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Edit Appointment</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Modify scheduling details for appointment #{editAppt.id}.</p>
              </div>
              <button onClick={() => setEditAppt(null)} style={{ background: 'var(--surface-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              <div className="input-group"><label className="input-label">Date</label><input type="date" className="input-field" value={editDate} onChange={e => setEditDate(e.target.value)} required /></div>
              <div className="input-group"><label className="input-label">Time</label><input type="time" className="input-field" value={editTime} onChange={e => setEditTime(e.target.value)} required /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditAppt(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add user modal ── */}
      {showAddUser && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddUser(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', zIndex: 100 }}
        >
          <div 
            className="animate-slide-in-right" 
            style={{ 
              width: '100%', maxWidth: '460px', background: 'var(--surface)', maxHeight: 'calc(100vh - 3rem)', 
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', border: '1px solid var(--glass-border)', borderRadius: '16px', margin: '1.5rem',
              display: 'flex', flexDirection: 'column', padding: '2.5rem 2rem', overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Add New User</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Register a patient, nurse, or administrator profile.</p>
              </div>
              <button onClick={() => setShowAddUser(false)} style={{ background: 'var(--surface-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><X size={18} /></button>
            </div>
            {addError && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{addError}</div>}
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}><label className="input-label">First Name</label><input className="input-field" value={newFirst} onChange={e => setNewFirst(e.target.value)} required /></div>
                <div className="input-group" style={{ flex: 1 }}><label className="input-label">Last Name</label><input className="input-field" value={newLast} onChange={e => setNewLast(e.target.value)} required /></div>
              </div>
              <div className="input-group"><label className="input-label">Username</label><input className="input-field" value={newUsername} onChange={e => setNewUsername(e.target.value)} required /></div>
              <div className="input-group"><label className="input-label">Email</label><input type="email" className="input-field" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
              <div className="input-group"><label className="input-label">Password</label><input className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
              <div className="input-group"><label className="input-label">Role</label>
                <select className="input-field" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="PATIENT">Patient</option><option value="NURSE">Nurse</option><option value="ADMIN">Admin</option>
                </select>
              </div>
              {newRole === 'NURSE' && (
                <div className="input-group"><label className="input-label">Specialisation</label>
                  <select className="input-field" value={newSpec} onChange={e => setNewSpec(e.target.value)}>
                    {SPECIALISATIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={adding}>{adding ? 'Creating…' : 'Create User'}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddUser(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign spec modal ── */}
      {assignSpecNurse && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setAssignSpecNurse(null); }}
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
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Assign Specialisation</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Directly allocate a specialisation to a nurse.</p>
              </div>
              <button onClick={() => setAssignSpecNurse(null)} style={{ background: 'var(--surface-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><X size={18} /></button>
            </div>
            
            <div style={{ background: 'var(--surface-light)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nurse Profile</div>
              <div style={{ fontWeight: '600', fontSize: '1.05rem', marginBottom: '0.75rem' }}>{assignSpecNurse.user.first_name} {assignSpecNurse.user.last_name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Current Specialisation</div>
              <span className="badge badge-pending" style={{ fontSize: '0.8rem', display: 'inline-block' }}>{assignSpecNurse.specialisation}</span>
            </div>

            <form onSubmit={handleAssignSpec} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              <div className="input-group"><label className="input-label">New Specialisation</label>
                <select className="input-field" value={assignSpec} onChange={e => setAssignSpec(e.target.value)} required>
                  <option value="">— Select —</option>
                  {SPECIALISATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={assigning}>{assigning ? 'Saving…' : 'Assign Specialisation'}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setAssignSpecNurse(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Review spec request modal ── */}
      {reviewReq && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setReviewReq(null); }}
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
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Review Request</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Review and decide on a nurse specialisation change request.</p>
              </div>
              <button onClick={() => setReviewReq(null)} style={{ background: 'var(--surface-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><X size={18} /></button>
            </div>

            <div style={{ background: 'var(--surface-light)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', border: '1px solid var(--glass-border)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><strong>Nurse:</strong> {reviewReq.nurse_details?.user?.first_name} {reviewReq.nurse_details?.user?.last_name}</div>
              <div><strong>From:</strong> <span className="badge badge-pending" style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}>{reviewReq.current_specialisation}</span> → <span className="badge badge-confirmed" style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}>{reviewReq.requested_specialisation}</span></div>
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                <strong>Reason for change:</strong>
                <p style={{ marginTop: '0.25rem', fontStyle: 'italic', lineHeight: '1.4' }}>"{reviewReq.reason || '—'}"</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column' }}><label className="input-label">Admin Note (optional)</label>
                <textarea className="input-field" rows={4} style={{ resize: 'vertical' }} value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Add a note/reason for the nurse…" />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '2rem' }}>
                <button onClick={() => handleReview('approve')} className="btn btn-primary" style={{ flex: 1 }} disabled={reviewing}>
                  <CheckCircle size={16} /> Approve
                </button>
                <button onClick={() => handleReview('reject')} className="btn btn-outline" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)', background: 'transparent' }} disabled={reviewing}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Appointments tab ── */}
      {activeTab === 'appointments' && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>All Platform Appointments</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Patient</th><th>Nurse</th><th>Type</th><th>Date / Time</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredAppts.map(appt => (
                  <tr key={appt.id}>
                    <td>#{appt.id}</td>
                    <td style={{ fontWeight: '500' }}>{appt.patient_details?.first_name} {appt.patient_details?.last_name}</td>
                    <td>{appt.nurse_details?.user?.first_name || '—'} {appt.nurse_details?.user?.last_name || ''}</td>
                    <td>{appt.care_type}</td>
                    <td>{appt.date} @ {appt.start_time}
                      <button onClick={() => { setEditAppt(appt); setEditDate(appt.date); setEditTime(appt.start_time); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline', marginLeft: '0.5rem' }}>Edit</button>
                    </td>
                    <td>
                      <select className="input-field" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }} value={appt.status} onChange={e => handleStatusChange(appt.id, e.target.value)}>
                        <option>PENDING</option><option>CONFIRMED</option><option>COMPLETED</option><option>CANCELLED</option>
                      </select>
                    </td>
                    <td><span className={`badge ${appt.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-pending'}`}>{appt.status}</span></td>
                  </tr>
                ))}
                {filteredAppts.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No appointments found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Users tab ── */}
      {activeTab === 'users' && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>All Users</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Role</th><th>City</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredUsers.map(u => {
                  const nurseProfile = u.role === 'NURSE' ? nurses.find(n => n.user.id === u.id) : null;
                  return (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td style={{ fontWeight: '500' }}>{u.first_name} {u.last_name}</td>
                      <td>{u.username}</td>
                      <td>
                        <span className={`badge ${u.is_superuser ? '' : u.role === 'ADMIN' ? 'badge-confirmed' : u.role === 'NURSE' ? 'badge-pending' : ''}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: u.is_superuser ? 'rgba(124,58,237,0.1)' : '', color: u.is_superuser ? '#7c3aed' : '' }}>
                          {u.is_superuser ? <><Shield size={10} /> SUPERADMIN</> : u.role === 'ADMIN' ? <><Shield size={10} /> ADMIN</> : u.role === 'NURSE' ? <><Stethoscope size={10} /> NURSE</> : 'PATIENT'}
                        </span>
                        {nurseProfile && <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{nurseProfile.specialisation}</span>}
                      </td>
                      <td>{u.city || '—'}</td>
                      <td>
                        {nurseProfile && (
                          <button onClick={() => { setAssignSpecNurse(nurseProfile); setAssignSpec(nurseProfile.specialisation); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}>
                            Assign Spec
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Workload tab ── */}
      {activeTab === 'workload' && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Nurse Workload Analysis</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {nurseWorkload.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No nurses yet.</p>}
            {nurseWorkload.map((n, i) => {
              const max = Math.max(...nurseWorkload.map(x => x.active), 1);
              const pct = Math.round((n.active / max) * 100);
              return (
                <div key={i} style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: '600' }}>{n.name}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.spec}</span>
                    </div>
                    <span style={{ fontWeight: '700', color: pct > 75 ? 'var(--danger)' : pct > 40 ? '#d97706' : 'var(--success)' }}>
                      {n.active} active
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--glass-border)', borderRadius: '4px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 75 ? 'var(--danger)' : pct > 40 ? '#f59e0b' : 'var(--success)', borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Spec requests tab ── */}
      {activeTab === 'spec-requests' && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Specialisation Change Requests</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>ID</th><th>Nurse</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {specRequests.map(r => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td style={{ fontWeight: '500' }}>{r.nurse_details?.user?.first_name} {r.nurse_details?.user?.last_name}</td>
                    <td>{r.current_specialisation}</td>
                    <td style={{ fontWeight: '500', color: 'var(--primary)' }}>{r.requested_specialisation}</td>
                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{r.reason || '—'}</td>
                    <td>
                      <span style={{ fontWeight: '600', color: r.status === 'APPROVED' ? 'var(--success)' : r.status === 'REJECTED' ? 'var(--danger)' : '#f59e0b', fontSize: '0.8rem' }}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'PENDING' ? (
                        <button onClick={() => { setReviewReq(r); setReviewNote(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}>Review</button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.admin_note || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {specRequests.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No specialisation change requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Availability tab ── */}
      {activeTab === 'availability' && <AvailabilityManager user={user} />}

      {/* ── Reports tab ── */}
      {activeTab === 'reports' && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.5rem' }}>Generate &amp; Download Reports</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'All Appointments (CSV)', desc: 'Full appointment history export', url: `${API}/reports/admin/appointments/csv/`, filename: 'appointments.csv', color: '#0ea5e9' },
              { label: 'All Appointments (PDF)', desc: 'Formatted printable report', url: `${API}/reports/admin/appointments/pdf/`, filename: 'appointments_report.pdf', color: '#6366f1' },
              { label: 'Nurse Workload (PDF)', desc: 'Per-nurse load analysis', url: `${API}/reports/admin/workload/pdf/`, filename: 'nurse_workload.pdf', color: '#10b981' },
              { label: 'All Users (CSV)', desc: 'Complete user registry', url: `${API}/reports/admin/users/csv/`, filename: 'users.csv', color: '#8b5cf6' },
              { label: 'Availability Summary (CSV)', desc: 'All nurse availability slots', url: `${API}/reports/admin/availability/csv/`, filename: 'nurse_availability.csv', color: '#f59e0b' },
            ].map(({ label, desc, url, filename, color }) => (
              <div key={label} style={{ padding: '1.25rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    <Download size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
                <button onClick={() => downloadReport(url, filename)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', justifyContent: 'center' }}>
                  <Download size={14} /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
