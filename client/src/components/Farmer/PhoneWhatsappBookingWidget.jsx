import React, { useState } from 'react';
import { PhoneCall, MessageSquare, Send, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Volume2 } from 'lucide-react';
import { bookPhoneWhatsappAPI } from '../../services/api';

export default function PhoneWhatsappBookingWidget({ centreId = 'centre-1', centreName = 'Mandya Central Yard', onBookingCompleted }) {
  const [activeTab, setActiveTab] = useState('WHATSAPP'); // 'WHATSAPP' | 'TELEPHONE'
  const [phone, setPhone] = useState('+91 98450 12345');
  const [farmerName, setFarmerName] = useState('Ramesh Gowda');
  const [textCommand, setTextCommand] = useState('BOOK 5 PACKAGES MANDYA 10:00AM');
  const [packagesCount, setPackagesCount] = useState(5);
  const [crop, setCrop] = useState('Paddy (Sona Masoori)');

  const [loading, setLoading] = useState(false);
  const [responseLog, setResponseLog] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleBooking = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResponseLog(null);

    try {
      const res = await bookPhoneWhatsappAPI({
        phone,
        farmer_name: farmerName,
        textCommand,
        channel: activeTab,
        centre_id: centreId,
        packages_count: Number(packagesCount),
        crop
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to process IVR/WhatsApp booking.');
      } else {
        setResponseLog(res);
        if (onBookingCompleted) onBookingCompleted(res.appointment);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error during phone booking execution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={20} color="#2563eb" /> 📞 TELEPHONE & WHATSAPP BOOKING HOTLINE
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
            Automated IVR hotline & WhatsApp bot. Bookings instantly lock theatre seats in real time!
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px', gap: '0.2rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('WHATSAPP')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'WHATSAPP' ? '#22c55e' : 'transparent',
              color: activeTab === 'WHATSAPP' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <MessageSquare size={14} /> WhatsApp Bot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TELEPHONE')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'TELEPHONE' ? '#2563eb' : 'transparent',
              color: activeTab === 'TELEPHONE' ? '#ffffff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <PhoneCall size={14} /> Toll-Free IVR
          </button>
        </div>
      </div>

      {/* Simulator Form */}
      <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Farmer Registered Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98450 12345"
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Packages Count (1 Seat = 1 Pkg)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={packagesCount}
              onChange={(e) => setPackagesCount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              required
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
            {activeTab === 'WHATSAPP' ? '💬 WhatsApp Text Command' : '🎙️ IVR Keypad Speech Command'}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={textCommand}
              onChange={(e) => setTextCommand(e.target.value)}
              placeholder="e.g. BOOK 5 PACKAGES MANDYA 10AM"
              style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: activeTab === 'WHATSAPP' ? '#16a34a' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : activeTab === 'WHATSAPP' ? <Send size={16} /> : <Volume2 size={16} />}
              {activeTab === 'WHATSAPP' ? 'Send WhatsApp' : 'Dial IVR'}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Command Suggestions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Quick Templates:</span>
        {['BOOK 2 PACKAGES 09:00AM', 'BOOK 5 PACKAGES MANDYA 10:00AM', 'BOOK 10 PACKAGES MADDUR 11:00AM'].map((cmd, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setTextCommand(cmd)}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem', padding: '0.15rem 0.4rem', color: '#334155', cursor: 'pointer' }}
          >
            {cmd}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* Simulated Bot Response */}
      {responseLog && (
        <div style={{ marginTop: '1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <CheckCircle2 size={18} /> {responseLog.channel} BOT RESPONSE CONFIRMED
          </div>

          <p style={{ fontSize: '0.82rem', color: '#14532d', background: '#ffffff', padding: '0.65rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontFamily: 'monospace', margin: '0 0 0.65rem 0' }}>
            {responseLog.message}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', fontSize: '0.78rem' }}>
            <div><span style={{ color: '#64748b' }}>Booking ID:</span> <strong>{responseLog.appointment?.booking_id}</strong></div>
            <div><span style={{ color: '#64748b' }}>Token:</span> <strong style={{ color: '#16a34a' }}>{responseLog.appointment?.token_number}</strong></div>
            <div><span style={{ color: '#64748b' }}>Theatre Seat:</span> <strong style={{ color: '#2563eb' }}>Seat #{responseLog.position?.position_number}</strong></div>
            <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: '#15803d' }}>REALTIME SYNCED</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
