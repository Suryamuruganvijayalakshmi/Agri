import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, Clock, Award, Bell, ChevronRight, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';
import ProcurementMap from '../Map/ProcurementMap';
import BookingModal from './BookingModal';
import GoIntelligenceWidget from './GoIntelligenceWidget';
import ProcurementTimeline from './ProcurementTimeline';
import { fetchRecommendations, fetchFarmerTimeline } from '../../services/api';
import { translations } from '../../i18n/translations';

export default function FarmerDashboard({ centres, farmerId = 'F-1042', lang = 'en' }) {
  const t = translations[lang] || translations.en;

  const [recommendation, setRecommendation] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [bookingCentre, setBookingCentre] = useState(null);
  const [activeTab, setActiveTab] = useState('MAP'); // 'MAP', 'TIMELINE', 'NOTIFICATIONS'
  const [loadingRec, setLoadingRec] = useState(true);

  const loadFarmerData = async () => {
    try {
      setLoadingRec(true);
      const recData = await fetchRecommendations(12.5200, 76.8900, 2500);
      if (recData.success) {
        setRecommendation(recData);
      }

      const timelineData = await fetchFarmerTimeline(farmerId);
      if (timelineData.success) {
        setTimeline(timelineData.timeline);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRec(false);
    }
  };

  useEffect(() => {
    loadFarmerData();
  }, [centres]);

  const bestCentre = recommendation?.recommended_centre;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Farmer Greeting & Immediate Answer Cards Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📍 Mandya District Farmer Portal
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>
              Good Morning, Ramesh Gowda
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Farmer ID: <strong>{farmerId}</strong> • Landholding: 4.5 Acres (Sona Masoori Paddy)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('MAP')}
              className={`btn ${activeTab === 'MAP' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              📍 Live Map & Booking
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`btn ${activeTab === 'TIMELINE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              📋 My Procurement ({timeline?.active_procurement ? '1 Active' : '0'})
            </button>
          </div>
        </div>

        {/* 5 Core Questions Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>1. WHERE SHOULD I GO?</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80', marginTop: '0.2rem' }}>
              {bestCentre ? bestCentre.name : 'Loading...'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>2. CAN CENTRE HANDLE IT?</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginTop: '0.2rem' }}>
              {bestCentre ? `${bestCentre.remaining_capacity_kg.toLocaleString()} kg remaining` : 'Yes, 19k kg'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>3. WHEN SHOULD I GO?</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.2rem' }}>
              Slot: 10:30 AM (14 min wait)
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>4. PROCUREMENT STATUS</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.2rem' }}>
              {timeline?.active_procurement ? timeline.active_procurement.status.replace('_', ' ') : 'Ready to Book'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>5. PAYMENT STATUS</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f472b6', marginTop: '0.2rem' }}>
              {timeline?.payments?.[0] ? timeline.payments[0].status : 'Pending Voucher'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'MAP' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
          {/* Left Column: Live Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={20} color="#16a34a" /> {t.liveMapTitle}
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Real-time capacity utilization across regional yards. Markers update automatically.
                </p>
              </div>

              {/* Map Legend */}
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                <span className="badge badge-green">🟢 0-60%</span>
                <span className="badge badge-yellow">🟡 61-85%</span>
                <span className="badge badge-red">🔴 86-100%</span>
                <span className="badge badge-grey">⚫ Closed</span>
              </div>
            </div>

            <ProcurementMap
              centres={centres}
              selectedCentreId={selectedCentre?.id}
              onSelectCentre={(c) => setSelectedCentre(c)}
              onBookCentre={(c) => setBookingCentre(c)}
            />

            {/* Go Intelligence Widget */}
            <GoIntelligenceWidget
              centreId={selectedCentre?.id || bestCentre?.id || 'centre-1'}
              onSelectAlternative={() => {
                const alt = centres.find(c => c.id === 'centre-4');
                if (alt) setSelectedCentre(alt);
              }}
            />
          </div>

          {/* Right Sidebar: Recommended Centre & Centre Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Best Centre For You Recommendation Box */}
            {bestCentre && (
              <div className="card" style={{ border: '2px solid #16a34a', background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Award size={22} color="#16a34a" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#14532d', textTransform: 'uppercase' }}>
                    🏆 BEST CENTRE RECOMMENDED FOR YOU
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem 0' }}>
                  {bestCentre.name}
                </h3>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className={`badge badge-${bestCentre.color_status.toLowerCase()}`}>
                    {bestCentre.utilization_percent}% Capacity
                  </span>
                  <span className="badge badge-grey">📍 {bestCentre.distance_km} km away</span>
                </div>

                {/* Explainable Reasons List */}
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#334155', marginBottom: '1rem' }}>
                  <strong style={{ color: '#166534', display: 'block', marginBottom: '0.35rem' }}>
                    Why this centre is recommended:
                  </strong>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {recommendation?.reasons.map((r, idx) => (
                      <li key={idx} style={{ marginBottom: '0.2rem' }}>{r}</li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setBookingCentre(bestCentre)}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  Book Capacity Slot at {bestCentre.name.split(' ')[0]}
                </button>
              </div>
            )}

            {/* Selected Centre Detail Card */}
            {selectedCentre ? (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className={`badge badge-${selectedCentre.color_status.toLowerCase()}`}>
                    {selectedCentre.color_status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedCentre.code}</span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                  {selectedCentre.name}
                </h3>

                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  📍 {selectedCentre.address}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div>Daily Cap: <strong>{selectedCentre.daily_capacity_kg.toLocaleString()} kg</strong></div>
                  <div>Booked: <strong>{selectedCentre.booked_capacity_kg.toLocaleString()} kg</strong></div>
                  <div>Remaining: <strong style={{ color: '#16a34a' }}>{selectedCentre.remaining_capacity_kg.toLocaleString()} kg</strong></div>
                  <div>Queue Size: <strong>{selectedCentre.queue_count} farmers</strong></div>
                  <div>Est Wait: <strong>{selectedCentre.est_wait_minutes} mins</strong></div>
                  <div>Active Counters: <strong>{selectedCentre.active_counters} open</strong></div>
                </div>

                <button
                  onClick={() => setBookingCentre(selectedCentre)}
                  disabled={selectedCentre.status === 'CLOSED' || selectedCentre.remaining_capacity_kg <= 0}
                  className="btn btn-primary btn-md"
                  style={{ width: '100%' }}
                >
                  Book Appointment Here
                </button>
              </div>
            ) : (
              <div className="card" style={{ padding: '1.25rem', color: '#64748b', textAlign: 'center', fontSize: '0.85rem' }}>
                Click any marker on the map to view detailed yard metrics & book slots.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline & Payments View */}
      {activeTab === 'TIMELINE' && (
        <ProcurementTimeline timeline={timeline} />
      )}

      {/* Booking Modal */}
      {bookingCentre && (
        <BookingModal
          centre={bookingCentre}
          farmerId={farmerId}
          onClose={() => setBookingCentre(null)}
          onBookingSuccess={() => {
            loadFarmerData();
            setActiveTab('TIMELINE');
          }}
        />
      )}
    </div>
  );
}
