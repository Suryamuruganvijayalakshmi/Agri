import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCentres } from '../services/api';
import { Building2, User, Mail, Phone, Lock, ShieldCheck, Warehouse, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function GovernmentRegister() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('CENTRE_OPERATOR');
  const [selectedFacilityId, setSelectedFacilityId] = useState('centre-1');
  const [facilities, setFacilities] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchCentres()
      .then(res => {
        if (res.success && res.centres) {
          setFacilities(res.centres);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleFacilitySelect = (facId) => {
    setSelectedFacilityId(facId);
    const selectedFac = facilities.find(f => f.id === facId);
    if (selectedFac && !email) {
      const distClean = (selectedFac.district || 'TamilNadu').toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameClean = (selectedFac.name || 'centre').toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
      setEmail(`${distClean}.${nameClean}.${facId.replace('-', '')}@agriflow.gov.in`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your entries.');
      setLoading(false);
      return;
    }

    const activeFac = facilities.find(f => f.id === selectedFacilityId);
    const metadata = {
      full_name: fullName,
      phone: phone,
      role: role,
      assigned_centre_id: selectedFacilityId,
      assigned_centre_name: activeFac ? activeFac.name : 'Mandya Central Procurement Yard',
      district: activeFac ? (activeFac.district || 'Mandya') : 'Mandya'
    };

    // Execute Supabase Auth signUp for Officer
    const res = await signUp({
      email,
      password,
      full_name: fullName,
      phone: phone,
      role: role,
      assigned_centre_id: selectedFacilityId,
      assigned_centre_name: activeFac ? activeFac.name : 'Mandya Central Procurement Yard',
      district: activeFac ? (activeFac.district || 'Mandya') : 'Mandya'
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Officer account creation failed. Please check inputs.');
      setLoading(false);
      return;
    }

    // Persist selected facility ID
    localStorage.setItem('agriflow_selected_centre_id', selectedFacilityId);
    localStorage.setItem('agriflow_assigned_email', email);

    setSuccessMsg(`Officer account registered successfully for ${activeFac?.name || 'Assigned Facility'}! Redirecting to login...`);
    setLoading(false);

    setTimeout(() => {
      navigate('/government/login');
    }, 2000);
  };

  const selectedFacObj = facilities.find(f => f.id === selectedFacilityId);

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0f172a', color: 'white' }}>
      <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '2.25rem', borderRadius: '16px', background: '#1e293b', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: '#16a34a', color: 'white', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem auto', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}>
            <Building2 size={30} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif', color: 'white' }}>
            Government Officer Registration
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
            Register new official account & lock access to cold storage facility
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: '#7f1d1d', border: '1px solid #fecaca', color: '#fee2e2', padding: '0.85rem', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#064e3b', border: '1px solid #34d399', color: '#a7f3d0', padding: '0.85rem', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={20} color="#34d399" /> {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Official Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="e.g. Suresh Kumar (Yard Officer)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.6rem', borderRadius: '8px', border: '1px solid #475569', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Assigned Cold Storage */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.35rem' }}>
              🏢 Assigned Cold Storage Facility
            </label>
            <div style={{ position: 'relative' }}>
              <Warehouse size={20} color="#16a34a" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
              <select
                value={selectedFacilityId}
                onChange={(e) => handleFacilitySelect(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.6rem', borderRadius: '8px', border: '2px solid #16a34a', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                required
              >
                {facilities.map(fac => (
                  <option key={fac.id} value={fac.id} style={{ background: '#ffffff', color: '#0f172a', fontWeight: 700 }}>
                    {fac.name} ({fac.district || 'Mandya'}) - {fac.daily_capacity_kg ? `${Math.round(fac.daily_capacity_kg/1000)} MT` : '3,500 MT'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Official Role & Designation
            </label>
            <div style={{ position: 'relative' }}>
              <ShieldCheck size={18} color="#16a34a" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.6rem', borderRadius: '8px', border: '1px solid #475569', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                required
              >
                <option value="CENTRE_OPERATOR">Cold Storage Operator / Yard Manager</option>
                <option value="QUALITY_INSPECTOR">Quality Inspector / Moisture Lab Officer</option>
                <option value="DISTRICT_OFFICER">District Officer / Logistics Admin</option>
                <option value="STATE_ADMIN">State Admin / Procurement Chief</option>
              </select>
            </div>
          </div>

          {/* Official Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Official Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="officer@agriflow.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.6rem', borderRadius: '8px', border: '1px solid #475569', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Official Mobile Number
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.6rem', borderRadius: '8px', border: '1px solid #475569', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.6rem', borderRadius: '8px', border: '1px solid #475569', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.7rem 0.7rem 2.6rem', borderRadius: '8px', border: '1px solid #475569', background: '#ffffff', color: '#0f172a', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', background: '#16a34a', color: 'white', border: 'none', borderRadius: '10px', padding: '0.85rem', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', marginTop: '0.5rem', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)' }}
          >
            {loading ? 'Creating Officer Account...' : 'Register Officer & Grant Facility Access'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155', fontSize: '0.85rem', color: '#94a3b8' }}>
          Already have an officer account?{' '}
          <Link to="/government/login" style={{ color: '#4ade80', fontWeight: 800, textDecoration: 'underline' }}>
            Sign In to Storage Portal
          </Link>
        </div>

      </div>
    </div>
  );
}
