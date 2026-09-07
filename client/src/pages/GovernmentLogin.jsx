import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchCentres } from '../services/api';
import { Building2, Lock, Mail, AlertCircle, Warehouse, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function GovernmentLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

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

    const res = await signIn(email.trim().toLowerCase(), password);

    if (!res.success) {
      setErrorMsg(res.error || 'Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    const u = res.user;

    // Persist the assigned centre for the operator dashboard
    if (u.assigned_centre_id) {
      localStorage.setItem('agriflow_selected_centre_id', u.assigned_centre_id);
    }
    localStorage.setItem('agriflow_assigned_email', u.email);

    redirectByRole(u.role || res.role);
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: '#0f172a'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        padding: '2.25rem',
        borderRadius: '18px',
        background: '#1e293b',
        border: '1px solid #334155',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: 'white',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 6px 20px rgba(22, 163, 74, 0.4)'
          }}>
            <ShieldCheck size={30} />
          </div>
          <h2 style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            color: '#f1f5f9'
          }}>
            Officer Sign In
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.4rem 0 0 0' }}>
            Sign in with your registered officer credentials
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{
            background: '#450a0a',
            border: '1px solid #7f1d1d',
            color: '#fca5a5',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#94a3b8',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={17}
                color="#475569"
                style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="email"
                placeholder="officer@agriflow.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  border: '1.5px solid #334155',
                  background: '#0f172a',
                  color: '#f1f5f9',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#334155'}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#94a3b8',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={17}
                color="#475569"
                style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.8rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  border: '1.5px solid #334155',
                  background: '#0f172a',
                  color: '#f1f5f9',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = '#334155'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569',
                  padding: '2px', display: 'flex', alignItems: 'center'
                }}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#166534' : 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.35rem',
              boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              letterSpacing: '0.02em'
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block'
                }} />
                Signing In...
              </>
            ) : (
              <><ShieldCheck size={18} /> Sign In to Officer Portal</>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: '#64748b'
        }}>
          <div>
            New officer?{' '}
            <Link to="/government/register" style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none' }}>
              Register Officer Account →
            </Link>
          </div>
          <div>
            Are you a farmer?{' '}
            <Link to="/farmer/login" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
              Farmer Portal Sign In →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
