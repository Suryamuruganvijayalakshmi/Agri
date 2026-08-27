import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
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
import FarmerAppointmentsPage from './pages/FarmerAppointmentsPage';
import FarmerQueuePage from './pages/FarmerQueuePage';
import FarmerProcurementPage from './pages/FarmerProcurementPage';
import FarmerPaymentsPage from './pages/FarmerPaymentsPage';
import FarmerNotificationsPage from './pages/FarmerNotificationsPage';

import OperatorDashboard from './components/Operator/OperatorDashboard';
import InspectorDashboardPage from './pages/InspectorDashboardPage';
import DistrictOfficerDashboard from './pages/DistrictOfficerDashboard';
import CommandCentre from './components/Admin/CommandCentre';
import DemoStoryRunner from './components/Demo/DemoStoryRunner';

import { socket } from './services/socket';
import { fetchCentres } from './services/api';
import { Sprout, LogOut, User, MapPin, Calendar, Clock, CreditCard, ShieldCheck, Zap, Globe, Activity, Bell } from 'lucide-react';
import { translations } from './i18n/translations';

function NavigationBar({ lang, setLang, onOpenDemoModal }) {
  const { user, profile, role, signOut } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const navigate = useNavigate();
  const t = translations[lang] || translations.en;

  const handleConfirmSignOut = async () => {
    setShowSignOutConfirm(false);
    await signOut();
    navigate('/login');
  };

  return (
    <header style={{ background: '#0f172a', color: 'white', borderBottom: '1px solid #1e293b', sticky: 'top', top: 0, zIndex: 1000 }}>
      {/* Top Banner */}
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

        {/* Role-based navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {role === 'FARMER' && (
            <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.85rem' }}>
              <Link to="/farmer/dashboard" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
              <Link to="/farmer/profile" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Profile</Link>
              <Link to="/farmer/map" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Live Map</Link>
              <Link to="/farmer/appointments" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Book Slot</Link>
              <Link to="/farmer/queue" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Live Queue</Link>
              <Link to="/farmer/procurement" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Timeline</Link>
              <Link to="/farmer/payments" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>DBT Payments</Link>
              <Link to="/farmer/notifications" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}><Bell size={14} style={{ display: 'inline' }} /></Link>
            </div>
          )}

          {role === 'CENTRE_OPERATOR' && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Link to="/operator/appointments" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Operator Console</Link>
              <Link to="/operator/queue" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Realtime Queue</Link>
              <Link to="/operator/weighment" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Weighbridge</Link>
            </div>
          )}

          {role === 'QUALITY_INSPECTOR' && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Link to="/inspector/inspections" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Quality Lab</Link>
            </div>
          )}

          {(role === 'DISTRICT_OFFICER' || role === 'STATE_ADMIN') && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Link to="/admin/overview" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Overview</Link>
              <Link to="/admin/centres" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Centres</Link>
              <Link to="/admin/analytics" style={{ color: '#cbd5e1', padding: '0.35rem 0.65rem', textDecoration: 'none', fontWeight: 600 }}>Analytics</Link>
            </div>
          )}

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
            path="/operator/counters"
            element={
              <ProtectedRoute allowedRoles={['CENTRE_OPERATOR']} loginPath="/government/login">
                <OperatorDashboard centres={centres} selectedCentreId={localStorage.getItem('agriflow_selected_centre_id') || 'centre-1'} onDataChanged={loadMasterCentres} />
              </ProtectedRoute>
            }
          />

          {/* Protected Inspector Routes */}
          <Route path="/inspector" element={<Navigate to="/inspector/inspections" replace />} />
          <Route
            path="/inspector/inspections"
            element={
              <ProtectedRoute allowedRoles={['QUALITY_INSPECTOR']} loginPath="/government/login">
                <InspectorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspector/inspection/:id"
            element={
              <ProtectedRoute allowedRoles={['QUALITY_INSPECTOR']} loginPath="/government/login">
                <InspectorDashboardPage />
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
                <CommandCentre centres={centres} />
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
                <CommandCentre centres={centres} />
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
