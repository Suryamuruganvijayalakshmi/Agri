import React from 'react';
import { Sprout, ShieldCheck, User, Building2, Landmark, Globe, Activity, Zap } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Navbar({ role, setRole, lang, setLang, isConnected, onOpenDemoModal }) {
  const t = translations[lang] || translations.en;

  return (
    <header style={{ background: '#0f172a', color: 'white', borderBottom: '1px solid #1e293b' }}>
      {/* Top Banner Tagline */}
      <div style={{ background: '#166534', padding: '0.4rem 1rem', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <span>"Don't just give farmers a token. Give them a predictable procurement journey."</span>
        <button 
          onClick={onOpenDemoModal}
          style={{ background: '#f59e0b', color: '#78350f', border: 'none', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
        >
          <Zap size={12} /> Run 5-Min Pitch Demo
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#16a34a', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sprout size={24} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', margin: 0 }}>
                AGRIFlow
              </h1>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.15)', padding: '0.15rem 0.45rem', borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase' }}>
                Operational Layer
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Navigation & Role Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Role Switcher */}
          <div style={{ background: '#1e293b', padding: '3px', borderRadius: '10px', display: 'flex', border: '1px solid #334155' }}>
            <button
              onClick={() => setRole('FARMER')}
              style={{
                background: role === 'FARMER' ? '#16a34a' : 'transparent',
                color: role === 'FARMER' ? 'white' : '#94a3b8',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <User size={14} /> {t.roleFarmer}
            </button>
            <button
              onClick={() => setRole('OPERATOR')}
              style={{
                background: role === 'OPERATOR' ? '#16a34a' : 'transparent',
                color: role === 'OPERATOR' ? 'white' : '#94a3b8',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Building2 size={14} /> {t.roleOperator}
            </button>
            <button
              onClick={() => setRole('ADMIN')}
              style={{
                background: role === 'ADMIN' ? '#16a34a' : 'transparent',
                color: role === 'ADMIN' ? 'white' : '#94a3b8',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Landmark size={14} /> {t.roleAdmin}
            </button>
          </div>

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#1e293b', padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <Globe size={14} color="#94a3b8" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              <option value="en" style={{ background: '#0f172a' }}>English</option>
              <option value="hi" style={{ background: '#0f172a' }}>हिंदी (Hindi)</option>
              <option value="kn" style={{ background: '#0f172a' }}>ಕನ್ನಡ (Kannada)</option>
              <option value="ta" style={{ background: '#0f172a' }}>தமிழ் (Tamil)</option>
              <option value="te" style={{ background: '#0f172a' }}>తెలుగు (Telugu)</option>
            </select>
          </div>

          {/* Connection Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: isConnected ? '#4ade80' : '#f87171' }}>
            <Activity size={12} />
            <span>{isConnected ? 'LIVE REALTIME' : 'RECONNECTING'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
