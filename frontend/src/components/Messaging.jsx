import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Send, MessageSquare, Lock, ChevronRight, Paperclip, X, Image, Video } from 'lucide-react';

const API = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:8000/ws/chat';
const LS_LAST_SEEN = 'nc_last_seen';

function getLastSeen() {
  try { return JSON.parse(localStorage.getItem(LS_LAST_SEEN) || '{}'); }
  catch { return {}; }
}
function setLastSeenThread(apptId) {
  const ls = getLastSeen();
  ls[String(apptId)] = new Date().toISOString();
  localStorage.setItem(LS_LAST_SEEN, JSON.stringify(ls));
}

export default function Messaging({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [threadSummary, setThreadSummary] = useState({});
  const [lastSeen, setLastSeen] = useState(getLastSeen);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [wsStatus, setWsStatus] = useState('disconnected');

  // Media upload state
  const [uploadPreview, setUploadPreview] = useState(null); // { file, url, type }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const token = localStorage.getItem('token');

  // ── Fetch appointments + thread summary ───────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/messages/thread-summary/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setThreadSummary(res.data);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    axios.get(`${API}/appointments/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setAppointments(r.data))
      .catch(console.error);
    fetchSummary();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Unread helpers ────────────────────────────────────────────────────────

  const isUnread = useCallback((appt) => {
    const info = threadSummary[String(appt.id)];
    if (!info || !info.last_message_at) return false;
    if (info.last_sender_id === user.id) return false;
    const seenAt = lastSeen[String(appt.id)];
    if (!seenAt) return true;
    return new Date(info.last_message_at) > new Date(seenAt);
  }, [threadSummary, lastSeen, user.id]);

  const totalUnreadCount = appointments.filter(isUnread).length;

  // ── Thread open ───────────────────────────────────────────────────────────

  const loadHistory = useCallback(async (apptId) => {
    try {
      const r = await axios.get(`${API}/messages/?appointment=${apptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(r.data.map(m => ({
        id: m.id,
        content: m.content,
        media_url: m.media_url || '',
        media_type: m.media_type || '',
        sender_id: m.sender,
        sender_name: `${m.sender_details?.first_name || ''} ${m.sender_details?.last_name || ''}`.trim() || m.sender_details?.username,
        sender_role: m.sender_details?.role,
        timestamp: m.timestamp,
        fromHistory: true,
      })));
    } catch (e) { console.error(e); }
  }, [token]);

  const openThread = useCallback((appt) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

    setSelectedAppt(appt);
    setMessages([]);
    setUploadPreview(null);
    setWsStatus('connecting');
    loadHistory(appt.id);

    // Mark as read
    setLastSeenThread(appt.id);
    setLastSeen(getLastSeen());
    fetchSummary();

    const ws = new WebSocket(`${WS_BASE}/${appt.id}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => setWsStatus('error');

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'message') {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            id: data.id,
            content: data.content,
            media_url: data.media_url || '',
            media_type: data.media_type || '',
            sender_id: data.sender_id,
            sender_name: data.sender_name,
            sender_role: data.sender_role,
            timestamp: data.timestamp,
          }];
        });
        // Keep last-seen current for the active thread
        setLastSeenThread(appt.id);
        setLastSeen(getLastSeen());
      }
    };
  }, [token, loadHistory, fetchSummary]);

  useEffect(() => () => wsRef.current?.close(), []);

  // ── Send text ─────────────────────────────────────────────────────────────

  const sendMessage = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || wsStatus !== 'connected') return;
    wsRef.current.send(JSON.stringify({ content: text }));
    setInputText('');
  };

  // ── Media handling ────────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('Only image and video files are supported.');
      return;
    }
    const maxMB = isVideo ? 100 : 10;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`File too large. Max ${maxMB} MB.`);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview({ file, url: previewUrl, type: isImage ? 'image' : 'video' });
  };

  const cancelUpload = () => {
    if (uploadPreview?.url) URL.revokeObjectURL(uploadPreview.url);
    setUploadPreview(null);
  };

  const sendMedia = async () => {
    if (!uploadPreview || wsStatus !== 'connected') return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadPreview.file);
      const res = await axios.post(`${API}/messages/upload-media/`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      wsRef.current.send(JSON.stringify({
        content: inputText.trim(),
        media_url: res.data.url,
        media_type: res.data.media_type,
      }));
      setInputText('');
      cancelUpload();
    } catch {
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

  const threadLabel = (appt) => {
    if (user.role === 'PATIENT') {
      const nurse = appt.nurse_details?.user;
      return nurse ? `${nurse.first_name} ${nurse.last_name} — ${appt.care_type}` : appt.care_type;
    }
    const p = appt.patient_details;
    return p ? `${p.first_name} ${p.last_name} — ${appt.care_type}` : appt.care_type;
  };

  const statusColor = {
    connected: 'var(--success)',
    connecting: '#f59e0b',
    disconnected: 'var(--text-muted)',
    error: 'var(--danger)',
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          Secure <span className="text-gradient">Messages</span>
          {totalUnreadCount > 0 && (
            <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '12px', minWidth: '26px', height: '26px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', padding: '0 6px' }}>
              {totalUnreadCount}
            </span>
          )}
        </h1>
        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
          <Lock size={14} /> All messages are encrypted with AES-256-GCM end-to-end.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', height: 'calc(100vh - 240px)', minHeight: '400px' }}>

        {/* ── Thread list ── */}
        <div className="card" style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <h3 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Appointment Threads
          </h3>
          {appointments.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No appointments yet.</p>
          )}
          {appointments.map(appt => {
            const unread = isUnread(appt);
            const info = threadSummary[String(appt.id)];
            return (
              <button
                key={appt.id}
                onClick={() => openThread(appt)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', borderRadius: '10px', border: '1px solid',
                  borderColor: selectedAppt?.id === appt.id ? 'var(--primary)' : unread ? 'rgba(239,68,68,0.35)' : 'var(--glass-border)',
                  background: selectedAppt?.id === appt.id
                    ? 'rgba(79,70,229,0.08)'
                    : unread ? 'rgba(239,68,68,0.04)' : 'var(--surface-light)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {unread && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: unread ? '700' : '600', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {threadLabel(appt)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{appt.date}</span>
                    <span className={`badge ${appt.status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-pending'}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>{appt.status}</span>
                    {info && <span style={{ marginLeft: 'auto' }}>{info.total_count} msg{info.total_count !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                  {unread && (
                    <span style={{ background: 'var(--danger)', color: 'white', borderRadius: '10px', minWidth: '18px', height: '18px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', padding: '0 4px' }}>
                      new
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Chat pane ── */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedAppt ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.75rem' }}>
              <MessageSquare size={40} style={{ opacity: 0.3 }} />
              <p>Select an appointment thread to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{threadLabel(selectedAppt)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedAppt.date} · #{selectedAppt.id}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: statusColor[wsStatus] }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor[wsStatus], display: 'inline-block' }} />
                  {wsStatus}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2rem' }}>
                    No messages yet. Say hello!
                  </p>
                )}
                {messages.map((msg, i) => {
                  const isMine = msg.sender_id === user.id;
                  const showDate = i === 0 || formatDate(messages[i - 1]?.timestamp) !== formatDate(msg.timestamp);
                  return (
                    <React.Fragment key={msg.id || i}>
                      {showDate && (
                        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                          {formatDate(msg.timestamp)}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                        {!isMine && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px', paddingLeft: '4px' }}>
                            {msg.sender_name} ({msg.sender_role})
                          </span>
                        )}
                        <div style={{
                          maxWidth: '65%',
                          display: 'flex', flexDirection: 'column', gap: '0.4rem',
                        }}>
                          {/* Media content */}
                          {msg.media_url && msg.media_type === 'image' && (
                            <img
                              src={msg.media_url}
                              alt="Shared"
                              onClick={() => window.open(msg.media_url, '_blank')}
                              style={{ maxWidth: '260px', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--glass-border)' }}
                            />
                          )}
                          {msg.media_url && msg.media_type === 'video' && (
                            <video
                              src={msg.media_url}
                              controls
                              style={{ maxWidth: '280px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                            />
                          )}
                          {/* Text content */}
                          {msg.content && (
                            <div style={{
                              padding: '0.6rem 0.9rem',
                              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              background: isMine ? 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' : 'var(--surface-light)',
                              color: isMine ? 'white' : 'var(--text-main)',
                              border: isMine ? 'none' : '1px solid var(--glass-border)',
                              fontSize: '0.9rem', lineHeight: '1.4',
                              boxShadow: isMine ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                            }}>
                              {msg.content}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', paddingRight: isMine ? '4px' : 0, paddingLeft: isMine ? 0 : '4px' }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Upload preview */}
              {uploadPreview && (
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--glass-border)', background: 'var(--surface-light)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ position: 'relative' }}>
                    {uploadPreview.type === 'image' ? (
                      <img src={uploadPreview.url} alt="Preview" style={{ height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '80px', width: '120px', borderRadius: '8px', background: 'var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Video size={24} />
                        {uploadPreview.file.name.slice(0, 16)}…
                      </div>
                    )}
                    <button onClick={cancelUpload} style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--danger)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <X size={11} />
                    </button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {uploadPreview.type === 'image' ? <Image size={14} style={{ color: 'var(--primary)' }} /> : <Video size={14} style={{ color: 'var(--primary)' }} />}
                      {uploadPreview.type === 'image' ? 'Image' : 'Video'} ready to send
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(uploadPreview.file.size / (1024 * 1024)).toFixed(1)} MB · {uploadPreview.file.name}
                    </div>
                  </div>
                  <button onClick={sendMedia} disabled={uploading || wsStatus !== 'connected'} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', flexShrink: 0 }}>
                    {uploading ? 'Uploading…' : 'Send'}
                  </button>
                </div>
              )}

              {/* Input bar */}
              <form onSubmit={sendMessage} style={{ padding: '1rem 1.25rem', borderTop: uploadPreview ? 'none' : '1px solid var(--glass-border)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* File picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={wsStatus !== 'connected' || uploading}
                  title="Share photo or video"
                  style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.55rem 0.65rem', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  className="input-field"
                  style={{ flex: 1, margin: 0 }}
                  placeholder={wsStatus === 'connected' ? 'Type a message…' : wsStatus === 'connecting' ? 'Connecting…' : 'Not connected'}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  disabled={wsStatus !== 'connected'}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1rem', flexShrink: 0 }}
                  disabled={wsStatus !== 'connected' || !inputText.trim()}
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
