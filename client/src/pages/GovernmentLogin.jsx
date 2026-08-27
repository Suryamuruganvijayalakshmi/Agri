import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCentres } from '../services/api';
import { Building2, Lock, User, AlertCircle, Warehouse, Key, ShieldCheck } from 'lucide-react';

export default function GovernmentLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('mandya.central@agriflow.gov.in');
  const [password, setPassword] = useState('Mandya@2026');
  const [selectedFacilityId, setSelectedFacilityId] = useState('centre-1');
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Load cold storage facilities list
    fetchCentres()
      .then(res => {
        if (res.success && res.centres) {
          setFacilities(res.centres);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Generate unique official email & password bound to each specific cold storage facility ID
  const getFacilityCredentials = (facId, facName, district) => {
    const distClean = (district || 'TamilNadu').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameClean = (facName || 'centre').toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
    const officialEmail = `${distClean}.${nameClean}.${facId.replace('-', '')}@agriflow.gov.in`;
    const officialPassword = `${distClean.charAt(0).toUpperCase() + distClean.slice(1)}@2026`;
    return { email: officialEmail, password: officialPassword };
  };

  const handleFacilityChange = (facId) => {
    setSelectedFacilityId(facId);
    const selectedFac = facilities.find(f => f.id === facId);
    if (selectedFac) {
      const creds = getFacilityCredentials(selectedFac.id, selectedFac.name, selectedFac.district);
      setEmail(creds.email);
      setPassword(creds.password);
    }
  };

  const redirectByRole = (role) => {
    if (role === 'CENTRE_OPERATOR') {
      navigate('/operator/appointments');
    } else if (role === 'QUALITY_INSPECTOR') {
      navigate('/inspector/inspections');
    } else if (role === 'DISTRICT_OFFICER' || role === 'STATE_ADMIN' || role === 'DISTRICT_ADMIN') {
      navigate('/admin/overview');
    } else {
      navigate('/admin/overview');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Store assigned cold storage ID and unique facility credentials in localStorage for strict access control
    localStorage.setItem('agriflow_selected_centre_id', selectedFacilityId);
    localStorage.setItem('agriflow_assigned_email', email);

    const res = await signIn(email, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed. Please check your credentials.');
      setLoading(false);
      return;
    }

    redirectByRole(res.role);
  };

  const activeFac = facilities.find(f => f.id === selectedFacilityId);

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0f172a', color: 'white' }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2.25rem', borderRadius: '16px', background: '#1e293b', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: '#16a34a', color: 'white', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem auto', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}>
            <Building2 size={30} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif', color: 'white' }}>
            Unique Centre Official Sign In
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
            Authenticated & locked exclusively to the selected cold storage ID
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: '#7f1d1d', border: '1px solid #fecaca', color: '#fee2e2', padding: '0.85rem', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* Facility Selection Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.4rem' }}>
              🏢 Select Assigned Cold Storage Centre
            </label>
            <div style={{ position: 'relative' }}>
              <Warehouse size={20} color="#16a34a" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
              <select
                value={selectedFacilityId}
                onChange={(e) => handleFacilityChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  border: '2px solid #16a34a',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer'
                }}
                required
              >
                {facilities.map((fac) => (
                  <option 
                    key={fac.id} 
                    value={fac.id} 
                    style={{ background: '#ffffff', color: '#0f172a', fontWeight: 700, padding: '0.5rem' }}
                  >
                    {fac.name} ({fac.district || 'Mandya'}) - {fac.daily_capacity_kg ? `${Math.round(fac.daily_capacity_kg/1000)} MT` : '3,500 MT'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unique Access Security Badge */}
          {activeFac && (
            <div style={{ background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ShieldCheck size={22} color="#34d399" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#ffffff', display: 'block' }}>🔒 ACCESS STRICTLY LOCKED TO:</strong>
                <span>{activeFac.name} (Facility ID: {activeFac.id})</span>
              </div>
            </div>
          )}

          {/* Official Email Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Unique Centre Official Email
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="officer@agriflow.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  border: '1px solid #475569',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Facility Access Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  border: '1px solid #475569',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '0.35rem',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Authenticating Facility Lock...' : 'Sign In & Lock to Storage Facility'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            Need a new official account?{' '}
            <Link to="/government/register" style={{ color: '#4ade80', fontWeight: 800, textDecoration: 'underline' }}>
              Register New Officer Account
            </Link>
          </div>
          <div>
            Are you a farmer looking to book a slot?{' '}
            <Link to="/farmer/login" style={{ color: '#60a5fa', fontWeight: 700 }}>
              Farmer Portal Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
