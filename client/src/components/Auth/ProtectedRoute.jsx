import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles, loginPath = '/login' }) {
  const { user, profile, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: '#16a34a' }} />
          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Authenticating with Supabase Database...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated -> Redirect to Supabase Login Page
  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  // 2. Role Check
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    let correctPath = '/farmer/dashboard';
    if (role === 'CENTRE_OPERATOR') correctPath = '/operator/appointments';
    if (role === 'QUALITY_INSPECTOR') correctPath = '/inspector/inspections';
    if (role === 'DISTRICT_OFFICER' || role === 'STATE_ADMIN') correctPath = '/admin/overview';

    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem' }}>
        <div className="card" style={{ borderLeft: '6px solid #dc2626', background: '#fef2f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <ShieldAlert size={32} color="#dc2626" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7f1d1d', margin: 0 }}>
                Unauthorized Role Access
              </h2>
              <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                Supabase Role Security Guard
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: '#991b1b', marginBottom: '1.25rem' }}>
            Your authenticated Supabase user <strong>{user.email}</strong> is assigned the <strong>{role}</strong> role. You do not have permission to view this section.
          </p>

          <a href={correctPath} className="btn btn-danger btn-md" style={{ width: '100%' }}>
            Go to Your Authorized Dashboard ({role.replace('_', ' ')}) <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return children;
}
