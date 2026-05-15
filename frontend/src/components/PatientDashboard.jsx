import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, MapPin, Activity, Plus, MessageSquare, ChevronRight, User } from 'lucide-react';

export default function PatientDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [nurses, setNurses] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newType, setNewType] = useState('Wound Care');
  const [selectedNurseId, setSelectedNurseId] = useState('');

  const [availabilities, setAvailabilities] = useState([]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [apptsRes, nursesRes, availRes] = await Promise.all([
        axios.get('http://localhost:8000/api/appointments/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/nurses/', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/availabilities/', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAppointments(apptsRes.data);
      setNurses(nursesRes.data);
      setAvailabilities(availRes.data);
      if (nursesRes.data.length > 0) {
        setSelectedNurseId(nursesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestVisit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/appointments/', {
        patient: user.id,
        nurse: selectedNurseId, 
        date: newDate,
        start_time: newTime,
        care_type: newType,
        status: 'PENDING'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error creating appointment');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome back, <span className="text-gradient">{user.first_name}</span></h1>
          <p style={{ color: 'var(--text-muted)' }}>Here's what's happening with your care schedule today.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Request Visit
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', transform: 'scale(1)', animation: 'fadeIn 0.2s ease-out' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Request New Visit</h2>
            <form onSubmit={handleRequestVisit}>
              <div className="input-group">
                <label className="input-label">Select Nurse</label>
                <select className="input-field" value={selectedNurseId} onChange={e => setSelectedNurseId(e.target.value)} required>
                  {nurses.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.user.first_name} {n.user.last_name} — {n.specialisation}
                    </option>
                  ))}
                </select>
                {selectedNurseId && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <strong>Available:</strong> {
                      availabilities.filter(a => a.nurse.toString() === selectedNurseId.toString() && !a.is_booked)
                        .map(a => `${a.date} (${a.start_time.substring(0,5)} - ${a.end_time.substring(0,5)})`)
                        .join(', ') || 'No specific times set.'
                    }
                  </div>
                )}
              </div>
              <div className="input-group">
                <label className="input-label">Care Type</label>
                <select className="input-field" value={newType} onChange={e => setNewType(e.target.value)} required>
                  <option>Wound Care</option>
                  <option>IV Therapy</option>
                  <option>General Checkup</option>
                  <option>Pediatrics</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Date</label>
                  <input type="date" className="input-field" value={newDate} onChange={e => setNewDate(e.target.value)} required />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Time</label>
                  <input type="time" className="input-field" value={newTime} onChange={e => setNewTime(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Request</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Upcoming Visits</div>
              <div className="stat-value">{appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING').length}</div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '10px', color: 'var(--accent)' }}>
              <Calendar size={24} />
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
              <Activity size={24} />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-title">Unread Messages</div>
              <div className="stat-value">0</div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '10px', color: 'var(--primary)' }}>
              <MessageSquare size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Your Appointments</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setActiveTab('upcoming')}
                style={{ background: 'none', border: 'none', color: activeTab === 'upcoming' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: activeTab === 'upcoming' ? '600' : '400', paddingBottom: '0.25rem', borderBottom: activeTab === 'upcoming' ? '2px solid var(--primary)' : '2px solid transparent' }}
              >
                Upcoming
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {appointments.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No appointments found.</p> : appointments.map(visit => (
              <div key={visit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{visit.care_type}</h3>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {visit.date}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {visit.start_time}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nurse</div>
                    <div style={{ fontWeight: '500' }}>{visit.nurse_details?.user?.first_name || 'Pending'} {visit.nurse_details?.user?.last_name || ''}</div>
                  </div>
                  <span className={`badge ${visit.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-pending'}`}>
                    {visit.status}
                  </span>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Secure Messages</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>No recent messages.</p>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: '1.5rem' }}>
            View All Messages
          </button>
        </div>
      </div>
    </div>
  );
}
