import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Calendar, Plus, Trash2, RefreshCw } from 'lucide-react';

const API = 'http://localhost:8000/api';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AvailabilityManager({ user }) {
  const token = localStorage.getItem('token');
  const isAdmin = user.role === 'ADMIN' || user.is_superuser;

  // Existing slots
  const [slots, setSlots] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [filterNurse, setFilterNurse] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create form
  const [selectedNurses, setSelectedNurses] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4]);
  const [timeSlots, setTimeSlots] = useState([{ start_time: '09:00', end_time: '11:00' }]);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const params = {};
      if (filterNurse) params.nurse_id = filterNurse;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (filterStatus) params.status = filterStatus;
      const res = await axios.get(`${API}/availabilities/`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setSlots(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  }, [token, filterNurse, filterDateFrom, filterDateTo, filterStatus]);

  useEffect(() => {
    if (isAdmin) {
      axios.get(`${API}/nurses/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setNurses(r.data))
        .catch(console.error);
    }
    fetchSlots();
  }, []);

  useEffect(() => { fetchSlots(); }, [filterNurse, filterDateFrom, filterDateTo, filterStatus]);

  const toggleDay = (idx) =>
    setSelectedDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort((a, b) => a - b));

  const toggleNurse = (id) =>
    setSelectedNurses(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);

  const addTimeSlot = () =>
    setTimeSlots(prev => [...prev, { start_time: '09:00', end_time: '11:00' }]);

  const removeTimeSlot = (idx) =>
    setTimeSlots(prev => prev.filter((_, i) => i !== idx));

  const updateTimeSlot = (idx, field, value) =>
    setTimeSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const previewCount = () => {
    if (!dateFrom || !dateTo) return 0;
    const from = new Date(dateFrom + 'T00:00:00');
    const to = new Date(dateTo + 'T00:00:00');
    if (from > to) return 0;
    let days = 0;
    const cur = new Date(from);
    while (cur <= to) {
      const jsDay = cur.getDay();
      const pyDay = jsDay === 0 ? 6 : jsDay - 1;
      if (selectedDays.includes(pyDay)) days++;
      cur.setDate(cur.getDate() + 1);
    }
    const nurseCount = isAdmin ? (selectedNurses.length || nurses.length) : 1;
    return days * timeSlots.length * nurseCount;
  };

  const handleCreate = async () => {
    if (!dateFrom || !dateTo || !timeSlots.length || !selectedDays.length) {
      setCreateMsg({ type: 'error', text: 'Fill in all fields before creating slots.' });
      return;
    }
    setCreating(true);
    setCreateMsg(null);
    try {
      const body = { date_from: dateFrom, date_to: dateTo, time_slots: timeSlots, days_of_week: selectedDays };
      if (isAdmin && selectedNurses.length > 0) body.nurse_ids = selectedNurses;
      const res = await axios.post(`${API}/availabilities/bulk-create/`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreateMsg({ type: 'success', text: res.data.message });
      fetchSlots();
    } catch (err) {
      setCreateMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create slots.' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, isBooked) => {
    if (isBooked && !window.confirm('This slot is already booked. Delete it anyway?')) return;
    try {
      await axios.delete(`${API}/availabilities/${id}/`, { headers: { Authorization: `Bearer ${token}` } });
      setSlots(prev => prev.filter(s => s.id !== id));
    } catch {
      alert('Failed to delete slot.');
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          <span className="text-gradient">Availability</span> Manager
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {isAdmin
            ? 'Set availability for one or more nurses across a date range.'
            : 'Manage your available time slots.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── LEFT PANEL: Create ── */}
        <div className="card" style={{ position: 'sticky', top: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={17} style={{ color: 'var(--primary)' }} />
            Create Slots
          </h2>

          {/* Nurse selector (admin only) */}
          {isAdmin && (
            <div className="input-group">
              <label className="input-label">
                Nurses&nbsp;
                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>
                  ({selectedNurses.length === 0 ? 'all nurses' : `${selectedNurses.length} selected`})
                </span>
              </label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0.4rem' }}>
                {nurses.map(n => (
                  <label
                    key={n.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.4rem', cursor: 'pointer', borderRadius: '6px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNurses.includes(n.id)}
                      onChange={() => toggleNurse(n.id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.85rem', flex: 1 }}>{n.user.first_name} {n.user.last_name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.specialisation}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">From</label>
              <input type="date" className="input-field" value={dateFrom} min={today}
                onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">To</label>
              <input type="date" className="input-field" value={dateTo} min={dateFrom || today}
                onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Days of week */}
          <div className="input-group">
            <label className="input-label">Days of Week</label>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: `1px solid ${selectedDays.includes(idx) ? 'var(--primary)' : 'var(--glass-border)'}`,
                    background: selectedDays.includes(idx) ? 'rgba(79,70,229,0.12)' : 'transparent',
                    color: selectedDays.includes(idx) ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: selectedDays.includes(idx) ? '600' : '400',
                    transition: 'all 0.15s',
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Time slots */}
          <div className="input-group">
            <label className="input-label">Time Slots</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {timeSlots.map((slot, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="time" className="input-field" style={{ flex: 1 }}
                    value={slot.start_time} onChange={e => updateTimeSlot(idx, 'start_time', e.target.value)} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>to</span>
                  <input type="time" className="input-field" style={{ flex: 1 }}
                    value={slot.end_time} onChange={e => updateTimeSlot(idx, 'end_time', e.target.value)} />
                  {timeSlots.length > 1 && (
                    <button type="button" onClick={() => removeTimeSlot(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.2rem', flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addTimeSlot} className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', justifyContent: 'center' }}>
                <Plus size={14} /> Add Time Slot
              </button>
            </div>
          </div>

          {/* Preview */}
          {dateFrom && dateTo && (
            <div style={{ padding: '0.7rem 1rem', background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              Preview: <strong style={{ color: 'var(--primary)' }}>~{previewCount()} slots</strong> will be created (existing skipped)
            </div>
          )}

          {/* Feedback message */}
          {createMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              background: createMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              color: createMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${createMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem',
            }}>
              {createMsg.text}
            </div>
          )}

          <button onClick={handleCreate} disabled={creating} className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}>
            {creating ? 'Creating…' : 'Create Slots'}
          </button>
        </div>

        {/* ── RIGHT PANEL: Existing Slots ── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>
              Existing Slots&nbsp;
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400' }}>({slots.length})</span>
            </h2>
            <button onClick={fetchSlots} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <select className="input-field" style={{ flex: '1 1 150px' }} value={filterNurse} onChange={e => setFilterNurse(e.target.value)}>
                <option value="">All Nurses</option>
                {nurses.map(n => (
                  <option key={n.id} value={n.id}>{n.user.first_name} {n.user.last_name}</option>
                ))}
              </select>
            )}
            <input type="date" className="input-field" style={{ flex: '1 1 130px' }}
              value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="Filter from date" />
            <input type="date" className="input-field" style={{ flex: '1 1 130px' }}
              value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="Filter to date" />
            <select className="input-field" style={{ flex: '1 1 110px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="booked">Booked</option>
            </select>
            {(filterNurse || filterDateFrom || filterDateTo || filterStatus) && (
              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', flexShrink: 0 }}
                onClick={() => { setFilterNurse(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterStatus(''); }}>
                Clear
              </button>
            )}
          </div>

          {loadingSlots ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading…</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No availability slots found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    {isAdmin && <th>Nurse</th>}
                    <th>Status</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot.id}>
                      <td style={{ fontWeight: '500' }}>{slot.date}</td>
                      <td>{slot.start_time?.slice(0, 5)}</td>
                      <td>{slot.end_time?.slice(0, 5)}</td>
                      {isAdmin && <td style={{ fontSize: '0.85rem' }}>{slot.nurse_name}</td>}
                      <td>
                        <span className={`badge ${slot.is_booked ? 'badge-pending' : 'badge-confirmed'}`}
                          style={{ fontSize: '0.7rem' }}>
                          {slot.is_booked ? 'Booked' : 'Open'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(slot.id, slot.is_booked)}
                          title={slot.is_booked ? 'Booked — click to confirm delete' : 'Delete slot'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: slot.is_booked ? 'var(--text-muted)' : 'var(--danger)', padding: '0.2rem', display: 'flex' }}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
