import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import FarmerLogin from './pages/FarmerLogin';
import FarmerRegister from './pages/FarmerRegister';
import GovernmentLogin from './pages/GovernmentLogin';
import GovernmentRegister from './pages/GovernmentRegister';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import FarmerDashboard from './components/Farmer/FarmerDashboard';
import FarmerProfilePage from './pages/FarmerProfilePage';
import FarmerMapPage from './pages/FarmerMapPage';
import FindCentrePage from './pages/FindCentrePage';
import FarmerAppointmentsPage from './pages/FarmerAppointmentsPage';

import FarmerQueuePage from './pages/FarmerQueuePage';
import FarmerProcurementPage from './pages/FarmerProcurementPage';
import FarmerPaymentsPage from './pages/FarmerPaymentsPage';
import FarmerNotificationsPage from './pages/FarmerNotificationsPage';
import MyFarmPage from './pages/MyFarmPage';
import CropIntelligencePage from './pages/CropIntelligencePage';

import OperatorDashboard from './components/Operator/OperatorDashboard';
import InspectorDashboardPage from './pages/InspectorDashboardPage';
import QualityInspectorDashboard from './pages/QualityInspectorDashboard';
import DistrictOfficerDashboard from './pages/DistrictOfficerDashboard';
import StateAdminDashboard from './pages/StateAdminDashboard';
import CommandCentre from './components/Admin/CommandCentre';
import DemoStoryRunner from './components/Demo/DemoStoryRunner';

import { socket } from './services/socket';
import { fetchCentres, resetDatabaseAPI } from './services/api';
import { Sprout, LogOut, User, MapPin, Calendar, Clock, CreditCard, ShieldCheck, Zap, Globe, Activity, Bell, RefreshCw, Menu, X, BarChart3, FileSpreadsheet, FileText } from 'lucide-react';
import { translations } from './i18n/translations';

function NavigationBar({ lang, setLang, onOpenDemoModal }) {
  const { user, profile, role, signOut } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[lang] || translations.en;

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch unread notification count for farmers
  useEffect(() => {
    if (role !== 'FARMER' || !user) return;
    const farmerId = user.id;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/notifications/${farmerId}/unread-count`);
        const data = await res.json();
        if (data.success) setUnreadCount(data.count || 0);
      } catch { }
    };
    fetchCount();

    const handleNewNotif = () => setUnreadCount(c => c + 1);
    socket.on('centre_notification', handleNewNotif);
    socket.on('appointment_booked', handleNewNotif);
    return () => {
      socket.off('centre_notification', handleNewNotif);
      socket.off('appointment_booked', handleNewNotif);
    };
  }, [role, user]);

  const handleConfirmSignOut = async () => {
    setShowSignOutConfirm(false);
    await signOut();
    navigate('/login');
  };

  const handleResetSite = async () => {
    if (!window.confirm('Reset all bookings and restore AGRIFlow to a fresh, clean default state?')) return;
    setResetting(true);
    try {
      await resetDatabaseAPI();
      localStorage.clear();
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert('Error resetting site.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <header style={{ background: '#0f172a', color: 'white', borderBottom: '1px solid #1e293b', sticky: 'top', top: 0, zIndex: 1000 }}>
      {/* Top Banner */}
      <div style={{ background: '#166534', padding: '0.4rem 1rem', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span>"Don't just give farmers a token. Give them a predictable procurement journey."</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={onOpenDemoModal}
            style={{ background: '#f59e0b', color: '#78350f', border: 'none', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <Zap size={12} /> Run 5-Min Pitch Demo
          </button>
          <button
            onClick={handleResetSite}
            disabled={resetting}
            style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.15rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <RefreshCw size={12} className={resetting ? 'spin' : ''} /> {resetting ? 'Resetting...' : 'Reset to Fresh Site'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>

        {/* AGRIFlow Brand Link */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', textDecoration: 'none' }}>
          <div style={{ background: '#16a34a', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sprout size={24} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', margin: 0, color: 'white' }}>
                AGRIFlow
              </h1>
              <span style={{ fontSize: '0.65rem', background: '#16a34a', color: 'white', padding: '0.15rem 0.45rem', borderRadius: '9999px', fontWeight: 800, textTransform: 'uppercase' }}>
                UNIQUE SESSION
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              {t.subtitle}
            </p>
          </div>
        </Link>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={22} color="#f8fafc" /> : <Menu size={22} color="#f8fafc" />}
        </button>

        {/* Desktop Role-based navigation */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

          {/* Guest navigation */}
          {!user && (
            <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.85rem' }}>
              <Link to="/farmer/centres" style={{ color: '#38bdf8', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 700 }}>🏢 Centres</Link>
              <Link to="/farmer/map" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>🗺️ Facilities Map</Link>
            </div>
          )}

          {role === 'FARMER' && (
            <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.85rem' }}>
              <Link to="/farmer/dashboard" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
              <Link to="/farmer/my-farm" style={{ color: '#4ade80', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 800 }}>🌾 My Farm</Link>
              <Link to="/farmer/centres" style={{ color: '#38bdf8', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 700 }}>🏢 Centres</Link>
              <Link to="/farmer/map" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>🗺️ Facilities Map</Link>
              <Link to="/farmer/appointments" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Book Slot</Link>
              <Link to="/farmer/queue" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Live Queue</Link>
              <Link to="/farmer/procurement" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Timeline</Link>
              <Link to="/farmer/payments" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>DBT Payments</Link>

              <Link to="/farmer/notifications"
                onClick={() => setUnreadCount(0)}
                style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600, position: 'relative', display: 'inline-flex', alignItems: 'center' }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '0px',
                    background: '#dc2626', color: 'white',
                    fontSize: '0.6rem', fontWeight: 900, borderRadius: '9999px',
                    minWidth: '16px', height: '16px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '0 3px'
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </Link>
            </div>
          )}

          {role === 'CENTRE_OPERATOR' && (
            <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Link
                to="/operator/appointments"
                style={{
                  color: (location.pathname === '/operator/appointments' || location.pathname === '/operator') ? '#4ade80' : '#cbd5e1',
                  background: (location.pathname === '/operator/appointments' || location.pathname === '/operator') ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                  border: (location.pathname === '/operator/appointments' || location.pathname === '/operator') ? '1px solid #16a34a' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                🖥️ Console
              </Link>
              <Link
                to="/operator/queue"
                style={{
                  color: location.pathname === '/operator/queue' ? '#38bdf8' : '#cbd5e1',
                  background: location.pathname === '/operator/queue' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: location.pathname === '/operator/queue' ? '1px solid #0284c7' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                🔔 Queue
              </Link>
              <Link
                to="/operator/weighment"
                style={{
                  color: location.pathname === '/operator/weighment' ? '#06b6d4' : '#cbd5e1',
                  background: location.pathname === '/operator/weighment' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  border: location.pathname === '/operator/weighment' ? '1px solid #0891b2' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                ⚖️ Weighbridge
              </Link>
              <Link
                to="/operator/quality"
                style={{
                  color: location.pathname === '/operator/quality' ? '#10b981' : '#cbd5e1',
                  background: location.pathname === '/operator/quality' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  border: location.pathname === '/operator/quality' ? '1px solid #059669' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                🔬 Quality
              </Link>
              <Link
                to="/operator/payments"
                style={{
                  color: location.pathname === '/operator/payments' ? '#a855f7' : '#cbd5e1',
                  background: location.pathname === '/operator/payments' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  border: location.pathname === '/operator/payments' ? '1px solid #9333ea' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                💳 Payments
              </Link>
              <Link
                to="/operator/analytics"
                style={{
                  color: location.pathname === '/operator/analytics' ? '#38bdf8' : '#cbd5e1',
                  background: location.pathname === '/operator/analytics' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: location.pathname === '/operator/analytics' ? '1px solid #0284c7' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                📊 Analytics
              </Link>
              <Link
                to="/operator/statements"
                style={{
                  color: location.pathname === '/operator/statements' ? '#fbbf24' : '#cbd5e1',
                  background: location.pathname === '/operator/statements' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                  border: location.pathname === '/operator/statements' ? '1px solid #d97706' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                📑 Statements
              </Link>
              <Link
                to="/govt/crop-intelligence"
                style={{
                  color: location.pathname === '/govt/crop-intelligence' ? '#fbbf24' : '#f59e0b',
                  background: location.pathname === '/govt/crop-intelligence' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  border: location.pathname === '/govt/crop-intelligence' ? '1px solid #d97706' : '1px solid transparent',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                ✨ Crop AI
              </Link>
            </div>
          )}

          {role === 'QUALITY_INSPECTOR' && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Link to="/inspector/inspections" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Quality Lab</Link>
              <Link to="/govt/crop-intelligence" style={{ color: '#f59e0b', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 700 }}>✨ Crop Forecast & AI</Link>
            </div>
          )}

          {(role === 'DISTRICT_OFFICER' || role === 'STATE_ADMIN') && (
            <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Link to="/admin/overview" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>🏛️ Overview</Link>
              <Link to="/operator/analytics" style={{ color: '#38bdf8', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 700 }}>📊 Analytics</Link>
              <Link to="/operator/statements" style={{ color: '#fbbf24', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 700 }}>📑 Statements</Link>
              <Link to="/farmer/my-farm" style={{ color: '#4ade80', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 700 }}>🌾 My Farm</Link>
              <Link to="/govt/crop-intelligence" style={{ color: '#f59e0b', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 700 }}>✨ Crop AI</Link>
              <Link to="/admin/centres" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Centres</Link>
            </div>
          )}

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Globe size={15} color="#94a3b8" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="nav-select"
            >
              <option value="en">English (EN)</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>
          </div>

          {/* User Sign Out Trigger / Login Buttons */}
          {user ? (
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="btn btn-secondary btn-sm"
              style={{ background: '#334155', color: 'white', border: 'none' }}
            >
              <LogOut size={14} /> Sign Out ({profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]})
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/farmer/login" className="btn btn-primary btn-sm">Farmer Login</Link>
              <Link to="/government/login" className="btn btn-secondary btn-sm" style={{ background: '#1e293b', color: 'white', border: '1px solid #334155' }}>Officer Login</Link>
            </div>
          )}

        </div>
      </div>

      {/* Collapsible Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>
              {user ? `Logged in: ${profile?.full_name || user.email}` : 'AGRIFlow Mobile Menu'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Globe size={14} color="#94a3b8" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
              >
                <option value="en">English (EN)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>
          </div>

          {!user && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <Link to="/farmer/centres" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🏢 Centres Directory</Link>
              <Link to="/farmer/map" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🗺️ Facilities Map</Link>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Link to="/farmer/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary" style={{ textAlign: 'center' }}>Farmer Login</Link>
                <Link to="/government/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary" style={{ textAlign: 'center', background: '#1e293b', color: 'white' }}>Officer Login</Link>
              </div>
            </div>
          )}

          {role === 'FARMER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <Link to="/farmer/dashboard" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">📊 Dashboard Overview</Link>
              <Link to="/farmer/my-farm" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🌾 My Farm & RTC Land</Link>
              <Link to="/farmer/centres" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🏢 Procurement Centres</Link>
              <Link to="/farmer/map" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🗺️ Facilities Map</Link>
              <Link to="/farmer/appointments" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">📅 Book Procurement Slot</Link>
              <Link to="/farmer/queue" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🔔 Live Yard Queue</Link>
              <Link to="/farmer/procurement" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">⏱️ Live Journey Timeline</Link>
              <Link to="/farmer/payments" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">💳 DBT Payment Tracker</Link>
              <Link to="/farmer/notifications" onClick={() => { setUnreadCount(0); setMobileMenuOpen(false); }} className="mobile-nav-link">
                <Bell size={16} /> Notifications {unreadCount > 0 && `(${unreadCount})`}
              </Link>
            </div>
          )}

          {role === 'CENTRE_OPERATOR' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <Link to="/operator/appointments" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🖥️ Operator Console</Link>
              <Link to="/operator/queue" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🔔 Realtime Queue & Calls</Link>
              <Link to="/operator/weighment" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">⚖️ Weighbridge Station</Link>
              <Link to="/operator/quality" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🔬 Quality & Moisture Check</Link>
              <Link to="/operator/payments" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">💳 Payment & DBT Actions</Link>
              <Link to="/operator/analytics" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link" style={{ color: '#38bdf8' }}>📊 Performance Analytics (Daily/Weekly/Monthly)</Link>
              <Link to="/operator/statements" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link" style={{ color: '#fbbf24' }}>📑 Payment Statements & Reconciliation</Link>
              <Link to="/govt/crop-intelligence" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">✨ AI Crop Intelligence</Link>
            </div>
          )}

          {(role === 'DISTRICT_OFFICER' || role === 'STATE_ADMIN') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <Link to="/admin/overview" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🏛️ District Nodal Overview</Link>
              <Link to="/operator/analytics" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link" style={{ color: '#38bdf8' }}>📊 Performance Analytics (Daily/Weekly/Monthly)</Link>
              <Link to="/operator/statements" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link" style={{ color: '#fbbf24' }}>📑 Payment Statements & Reconciliation</Link>
              <Link to="/farmer/my-farm" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🌾 My Farm</Link>
              <Link to="/govt/crop-intelligence" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">✨ Crop Forecast & AI</Link>
              <Link to="/admin/centres" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">🏢 Centres Breakdown</Link>
            </div>
          )}

          {user && (
            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
              <button
                onClick={() => { setMobileMenuOpen(false); setShowSignOutConfirm(true); }}
                className="btn btn-secondary mobile-full-width"
                style={{ background: '#334155', color: 'white', border: 'none', justifyContent: 'center' }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ background: '#fee2e2', color: '#dc2626', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <LogOut size={32} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Confirm Sign Out
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Are you sure you want to end your active session as <strong>{profile?.full_name || user.email}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MainAppContent() {
  const [lang, setLang] = useState('en');
  const [centres, setCentres] = useState([]);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const { role } = useAuth();
  const navigate = useNavigate();

  const loadMasterCentres = async () => {
    try {
      const res = await fetchCentres();
      if (res.success) {
        setCentres(res.centres);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadMasterCentres();
    socket.on('centres_updated', (updated) => setCentres(updated));
    return () => socket.off('centres_updated');
  }, []);

  return (
    <div className="app-container">
      <NavigationBar
        lang={lang}
        setLang={setLang}
        onOpenDemoModal={() => setShowDemoModal(true)}
      />

      <main className="main-content">
        <Routes>
          {/* Public Authentication Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<FarmerLogin />} />
          <Route path="/register" element={<FarmerRegister />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/farmer/login" element={<FarmerLogin />} />
          <Route path="/farmer/register" element={<FarmerRegister />} />
          <Route path="/government/login" element={<GovernmentLogin />} />
          <Route path="/government/register" element={<GovernmentRegister />} />

          {/* Protected Farmer Routes */}
          <Route path="/farmer" element={<Navigate to="/farmer/dashboard" replace />} />
          <Route
            path="/farmer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerDashboard centres={centres} lang={lang} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/profile"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/map"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerMapPage centres={centres} onRefreshData={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/centres"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FindCentrePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/find-centre"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FindCentrePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/book"

            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerAppointmentsPage centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/appointments"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerAppointmentsPage centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/appointments/:id"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerAppointmentsPage centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/queue"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/procurement"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerProcurementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/procurements"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerProcurementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/payments"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/notifications"
            element={
              <ProtectedRoute allowedRoles={['FARMER']} loginPath="/farmer/login">
                <FarmerNotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/my-farm"
            element={<MyFarmPage />}
          />
          <Route
            path="/my-farm"
            element={<Navigate to="/farmer/my-farm" replace />}
          />
          <Route
            path="/govt/crop-intelligence"
            element={<CropIntelligencePage />}
          />

          {/* Protected Operator Routes */}
          <Route path="/operator" element={<Navigate to="/operator/appointments" replace />} />
          <Route
            path="/operator/appointments"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/queue"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/weighment"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/quality"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/payments"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/payment"
            element={<Navigate to="/operator/payments" replace />}
          />
          <Route
            path="/operator/counters"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/analytics"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR', 'DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/statements"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR', 'DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/statement"
            element={<Navigate to="/operator/statements" replace />}
          />

          {/* Protected Inspector Routes */}
          <Route path="/inspector" element={<Navigate to="/inspector/inspections" replace />} />
          <Route
            path="/inspector/inspections"
            element={
              <ProtectedRoute allowedRoles={['QUALITY_INSPECTOR']} loginPath="/government/login">
                <QualityInspectorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspector/inspection/:id"
            element={
              <ProtectedRoute allowedRoles={['QUALITY_INSPECTOR']} loginPath="/government/login">
                <QualityInspectorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
          <Route
            path="/admin/overview"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <DistrictOfficerDashboard centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/state"
            element={
              <ProtectedRoute allowedRoles={['STATE_ADMIN']} loginPath="/government/login">
                <StateAdminDashboard centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/farmers"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <DistrictOfficerDashboard centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/centres"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <CommandCentre centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <DistrictOfficerDashboard centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/procurement"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <StateAdminDashboard centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <CommandCentre centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/alerts"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <DistrictOfficerDashboard centres={centres} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['DISTRICT_OFFICER', 'STATE_ADMIN']} loginPath="/government/login">
                <StateAdminDashboard centres={centres} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Demo Modal */}
      {showDemoModal && (
        <DemoStoryRunner
          onClose={() => setShowDemoModal(false)}
          onRoleSwitch={(r) => {
            if (r === 'FARMER') navigate('/farmer/dashboard');
            if (r === 'OPERATOR') navigate('/operator/appointments');
            if (r === 'INSPECTOR') navigate('/inspector/inspections');
            if (r === 'ADMIN') navigate('/admin/overview');
          }}
          onRefreshData={loadMasterCentres}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
