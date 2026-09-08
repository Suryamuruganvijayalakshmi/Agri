import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, Mail, AlertCircle, ShieldCheck, Eye, EyeOff, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';

const DEDICATED_OFFICERS_PREVIEW = [
  {
    centre_id: 'centre-1',
    centre_name: 'Mandya Central Procurement Yard',
    centre_code: 'PROC-KA-01',
    district: 'Mandya, Karnataka',
    officer_name: 'Suresh Kumar',
    designation: 'Chief Procurement Officer',
    email: 'officer.mandya@agriflow.gov.in',
    password: 'Officer@123',
    token_prefix: 'A',
    badge_code: 'GOV-KA-MND-01',
    theme_color: '#16a34a',
    accent_bg: 'rgba(22, 163, 74, 0.12)',
    border_color: 'rgba(22, 163, 74, 0.35)'
  },
  {
    centre_id: 'centre-2',
    centre_name: 'Maddur Grain Storage & Procurement Centre',
    centre_code: 'PROC-KA-02',
    district: 'Maddur, Karnataka',
    officer_name: 'Rajesh Gowda',
    designation: 'Yard Superintendent',
    email: 'officer.maddur@agriflow.gov.in',
    password: 'Officer@123',
    token_prefix: 'B',
    badge_code: 'GOV-KA-MDR-02',
    theme_color: '#0284c7',
    accent_bg: 'rgba(2, 132, 199, 0.12)',
    border_color: 'rgba(2, 132, 199, 0.35)'
  },
  {
    centre_id: 'centre-3',
    centre_name: 'Srirangapatna Agri Warehousing Hub',
    centre_code: 'PROC-KA-03',
    district: 'Srirangapatna, Karnataka',
    officer_name: 'Anitha Murthy',
    designation: 'Chief Inspector & Yard Lead',
    email: 'officer.srirangapatna@agriflow.gov.in',
    password: 'Officer@123',
    token_prefix: 'C',
    badge_code: 'GOV-KA-SRP-03',
    theme_color: '#9333ea',
    accent_bg: 'rgba(147, 51, 234, 0.12)',
    border_color: 'rgba(147, 51, 234, 0.35)'
  },
  {
    centre_id: 'cs-tn-41',
    centre_name: 'Sakthi Cold Storage & Agri Terminal',
    centre_code: 'CS-TN-ERD-41',
    district: 'Erode, Tamil Nadu',
    officer_name: 'K. Selvanathan',
    designation: 'Terminal Logistics Manager',
    email: 'officer.erode@agriflow.gov.in',
    password: 'Officer@123',
    token_prefix: 'CS',
    badge_code: 'GOV-TN-ERD-41',
    theme_color: '#ea580c',
    accent_bg: 'rgba(234, 88, 12, 0.12)',
    border_color: 'rgba(234, 88, 12, 0.35)'
  },
  {
    centre_id: 'all',
    centre_name: 'State Directorate of Agri-Marketing',
    centre_code: 'HQ-KA-DIR',
    district: 'Bengaluru (Statewide)',
    officer_name: 'Dr. Rameshwar Rao',
    designation: 'State Director (All Facilities Admin)',
    email: 'admin@agriflow.gov.in',
    password: 'Admin@123',
    token_prefix: 'ALL',
    badge_code: 'GOV-DIR-001',
    theme_color: '#e11d48',
    accent_bg: 'rgba(225, 29, 72, 0.12)',
    border_color: 'rgba(225, 29, 72, 0.35)'
  }
];

export default function GovernmentLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggingInOfficerEmail, setLoggingInOfficerEmail] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const redirectByRole = (role) => {
    if (role === 'CENTRE_OPERATOR') {
      navigate('/operator/appointments');
    } else if (role === 'QUALITY_INSPECTOR') {
      navigate('/inspector/inspections');
    } else if (role === 'DISTRICT_OFFICER' || role === 'STATE_ADMIN' || role === 'ADMIN' || role === 'DISTRICT_ADMIN') {
      navigate('/admin/overview');
    } else {
      navigate('/operator/appointments');
    }
  };

  const executeLogin = async (loginEmail, loginPassword) => {
    setLoading(true);
    setErrorMsg(null);

    const res = await signIn(loginEmail.trim().toLowerCase(), loginPassword);

    if (!res.success) {
      setErrorMsg(res.error || 'Invalid officer credentials. Please try again.');
      setLoading(false);
      setLoggingInOfficerEmail(null);
      return;
    }

    const u = res.user;

    // Prompt for notification permission upon officer login
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch (err) {}

    // Lock selected centre in storage
    if (u.assigned_centre_id) {
      localStorage.setItem('agriflow_selected_centre_id', u.assigned_centre_id);
    } else {
      localStorage.removeItem('agriflow_selected_centre_id');
    }
    localStorage.setItem('agriflow_assigned_email', u.email);

    redirectByRole(u.role || res.role);
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    await executeLogin(email, password);
  };

  const handleQuickOfficerLogin = async (officer) => {
    setEmail(officer.email);
    setPassword(officer.password);
    setLoggingInOfficerEmail(officer.email);
    await executeLogin(officer.email, officer.password);
  };

  return (
    <div style={{
      minHeight: '88vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
      background: '#0b1329'
    }}>
      <div style={{
        maxWidth: '1050px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>

        {/* Portal Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(22, 163, 74, 0.15)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '30px',
            padding: '0.4rem 1.1rem',
            color: '#4ade80',
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.85rem'
          }}>
            <ShieldCheck size={16} /> Official Government Procurement Portal
          </div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            color: '#f8fafc',
            letterSpacing: '-0.02em'
          }}>
            Procurement Centre Officer Sign In
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#94a3b8',
            maxWidth: '650px',
            margin: '0.6rem auto 0 auto',
            lineHeight: 1.5
          }}>
            Each regional procurement yard and cold storage facility is assigned a dedicated officer account.
            Select your assigned centre below for direct authentication or enter your credentials.
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{
            background: 'rgba(127, 29, 29, 0.35)',
            border: '1.5px solid #ef4444',
            color: '#fca5a5',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.2)'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Authentication Error:</strong> {errorMsg}
            </div>
          </div>
        )}

        {/* Section 1: Dedicated Centre Officer Logins (1 Login Per Centre) */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '0.6rem'
          }}>
            <div>
              <h2 style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#f1f5f9',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Building2 size={18} color="#38bdf8" /> Dedicated Facility Officer Logins
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                One dedicated, unique login assigned to each procurement facility
              </span>
            </div>
            <span style={{
              background: '#1e293b',
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #334155'
            }}>
              1-Click Direct Authentication
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '1rem'
          }}>
            {DEDICATED_OFFICERS_PREVIEW.map((officer) => {
              const isLoggingIn = loading && loggingInOfficerEmail === officer.email;
              return (
                <div
                  key={officer.email}
                  style={{
                    background: '#162032',
                    border: `1.5px solid ${officer.border_color}`,
                    borderRadius: '16px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                    transition: 'transform 0.2s, border-color 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Subtle top indicator */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: officer.theme_color
                  }} />

                  <div>
                    {/* Top Row: Centre Badge & Code */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{
                        background: officer.accent_bg,
                        color: officer.theme_color,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        border: `1px solid ${officer.border_color}`
                      }}>
                        {officer.centre_code}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#64748b'
                      }}>
                        Gate: {officer.token_prefix}
                      </span>
                    </div>

                    {/* Centre Name */}
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#f8fafc',
                      margin: '0 0 0.4rem 0',
                      lineHeight: 1.3
                    }}>
                      {officer.centre_name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
                      📍 {officer.district}
                    </div>

                    {/* Officer Identity */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #1e293b'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                        <UserCheck size={15} color={officer.theme_color} />
                        <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f1f5f9' }}>
                          {officer.officer_name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                        {officer.designation}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                        marginTop: '0.4rem',
                        wordBreak: 'break-all'
                      }}>
                        ✉️ {officer.email}
                      </div>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickOfficerLogin(officer)}
                    style={{
                      width: '100%',
                      background: isLoggingIn ? '#334155' : `linear-gradient(135deg, ${officer.theme_color}, ${officer.theme_color}cc)`,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: `0 4px 14px ${officer.theme_color}33`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isLoggingIn ? (
                      <>
                        <span style={{
                          width: '14px', height: '14px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          display: 'inline-block'
                        }} />
                        Authenticating {officer.officer_name}...
                      </>
                    ) : (
                      <>
                        Sign In to {officer.centre_code} <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Manual Credentials Login Card */}
        <div style={{
          background: '#162032',
          border: '1px solid #334155',
          borderRadius: '18px',
          padding: '2rem',
          maxWidth: '560px',
          width: '100%',
          margin: '0 auto',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Manual Officer Credentials Sign In
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.3rem 0 0 0' }}>
              Sign in with your registered government email & security password
            </p>
          </div>

          <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Email Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Government Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={17}
                  color="#64748b"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  type="email"
                  className="dark-input"
                  placeholder="e.g. officer.mandya@agriflow.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.7rem',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Official Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={17}
                  color="#64748b"
                  style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="dark-input"
                  placeholder="Default demo: Officer@123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.8rem 0.75rem 2.7rem',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b',
                    padding: '2px', display: 'flex', alignItems: 'center'
                  }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
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
                fontSize: '0.95rem',
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
                  Verifying Credentials...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Sign In with Credentials
                </>
              )}
            </button>
          </form>

          {/* Navigation links */}
          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#64748b'
          }}>
            <div>
              New procurement officer?{' '}
              <Link to="/government/register" style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none' }}>
                Register Officer Station →
              </Link>
            </div>
            <div>
              Farmer wanting to check appointments?{' '}
              <Link to="/farmer/login" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
                Switch to Farmer Portal →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
