import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, User, Building2, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white' }}>
      
      {/* Brand & USP Header */}
      <div style={{ textAlign: 'center', maxWidth: '800px', marginBottom: '3rem' }}>
        <div style={{ background: '#16a34a', width: '64px', height: '64px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.4)' }}>
          <Sprout size={36} color="white" />
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em', margin: '0 0 0.5rem 0' }}>
          🌾 AGRIFlow
        </h1>

        <p style={{ fontSize: '1.2rem', color: '#4ade80', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          PROCUREMENT WITHOUT UNCERTAINTY
        </p>

        <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '650px', margin: '0 auto' }}>
          "Don't just give farmers a token. Give them a predictable procurement journey."
        </p>
      </div>

      {/* Role Portal Selection Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', width: '100%', maxWidth: '900px' }}>
        
        {/* FARMER CARD */}
        <div
          onClick={() => navigate('/farmer/login')}
          className="card"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid #16a34a',
            borderRadius: '20px',
            padding: '2rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: 'white',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: '#16a34a', padding: '0.75rem', borderRadius: '14px' }}>
              <User size={28} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'white' }}>👨‍🌾 FARMER</h2>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>PROCUREMENT PORTAL</span>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
            Check live centre capacity, view queue wait times, book slots without overbooking, and track DBT payment status.
          </p>

          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>Enter Farmer Portal</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* GOVERNMENT CARD */}
        <div
          onClick={() => navigate('/government/login')}
          className="card"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid #3b82f6',
            borderRadius: '20px',
            padding: '2rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: 'white',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: '#3b82f6', padding: '0.75rem', borderRadius: '14px' }}>
              <Building2 size={28} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'white' }}>🏛️ GOVERNMENT</h2>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700 }}>COMMAND CENTRE</span>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.5rem' }}>
            Operators, District Nodal Officers, and State Admins. Manage daily capacity, queue digital twin, and resolve exceptions.
          </p>

          <button className="btn btn-secondary btn-lg" style={{ width: '100%', justifyContent: 'space-between', background: '#1e293b', color: 'white', border: '1px solid #334155' }}>
            <span>Enter Government Portal</span>
            <ArrowRight size={18} />
          </button>
        </div>

      </div>

      {/* Feature Highlights Footer */}
      <div style={{ display: 'flex', gap: '2rem', marginTop: '3rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={16} color="#4ade80" /> Real-time Leaflet Map</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={16} color="#4ade80" /> Capacity-Aware Slot Locking</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={16} color="#4ade80" /> Explainable Status Updates</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={16} color="#4ade80" /> Supabase Realtime Engine</span>
      </div>

    </div>
  );
}
