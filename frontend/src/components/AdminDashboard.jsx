import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, FileText, BarChart, Search, Calendar, Clock } from 'lucide-react';

export default function AdminDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [editAppt, setEditAppt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [apptsRes, availRes] = await Promise.all([
        axios.get('http://localhost:8000/api/appointments/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/availabilities/', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAppointments(apptsRes.data);
      setAvailabilities(availRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:8000/api/appointments/${id}/`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleSaveApptEdit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:8000/api/appointments/${editAppt.id}/`, 
        { date: editDate, start_time: editTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditAppt(null);
      fetchData();
    } catch (err) {
      alert('Failed to update appointment time.');
    }
  };

  const openApptEdit = (appt) => {
    setEditAppt(appt);
    setEditDate(appt.date);
    setEditTime(appt.start_time);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>System <span className="text-gradient">Overview</span></h1>
          <p style={{ color: 'var(--text-muted)' }}>Platform metrics and active user tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} size={18} />
            <input type="text" placeholder="Search patients or nurses..." className="input-field" style={{ paddingLeft: '2.5rem', width: '250px' }} />
          </div>
          <button className="btn btn-primary">
            <UserPlus size={20} />
            Add User
          </button>
        </div>
      </div>

      {editAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', transform: 'scale(1)', animation: 'fadeIn 0.2s ease-out' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Edit Appointment Time</h2>
            <form onSubmit={handleSaveApptEdit}>
              <div className="input-group">
                <label className="input-label">Date</label>
                <input type="date" className="input-field" value={editDate} onChange={e => setEditDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Time</label>
                <input type="time" className="input-field" value={editTime} onChange={e => setEditTime(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditAppt(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Total Appointments</div>
              <div className="stat-value">{appointments.length}</div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '10px', color: 'var(--accent)' }}>
              <FileText size={24} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Pending Requests</div>
              <div className="stat-value">{appointments.filter(a => a.status === 'PENDING').length}</div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', color: '#d97706' }}>
              <BarChart size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>All Platform Appointments</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Nurse</th>
                <th>Type</th>
                <th>Date / Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(appt => (
                <tr key={appt.id}>
                  <td>#{appt.id}</td>
                  <td style={{ fontWeight: '500' }}>{appt.patient_details?.first_name} {appt.patient_details?.last_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{appt.nurse_details?.user?.first_name || 'Unassigned'} {appt.nurse_details?.user?.last_name || ''}</td>
                  <td>{appt.care_type}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {appt.date} @ {appt.start_time}
                      <button onClick={() => openApptEdit(appt)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>Edit</button>
                    </div>
                  </td>
                  <td>
                    <select 
                      className="input-field" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', width: 'auto' }}
                      value={appt.status}
                      onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                  <td>
                    <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500' }}>Manage Details</button>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No appointments found in the system.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Nurse Availabilities</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nurse ID</th>
                <th>Date</th>
                <th>Time Window</th>
                <th>Booked Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {availabilities.map(avail => (
                <tr key={avail.id}>
                  <td>#{avail.id}</td>
                  <td style={{ fontWeight: '500' }}>Nurse {avail.nurse}</td>
                  <td>{avail.date}</td>
                  <td>{avail.start_time} - {avail.end_time}</td>
                  <td>
                    <span className={`badge ${avail.is_booked ? 'badge-pending' : 'badge-confirmed'}`}>
                      {avail.is_booked ? 'Booked' : 'Open'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => alert('Editing availability is a feature coming in Phase 2!')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500' }}>Edit Time</button>
                  </td>
                </tr>
              ))}
              {availabilities.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No availabilities set.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
