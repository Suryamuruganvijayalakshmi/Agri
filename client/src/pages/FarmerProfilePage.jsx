import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Phone, MapPin, CreditCard, ShieldCheck, CheckCircle2, Save, AlertCircle } from 'lucide-react';

export default function FarmerProfilePage() {
  const { profile, user } = useAuth();
  
  const [fullName, setFullName] = useState(profile?.full_name || 'Ramesh Gowda');
  const [phone, setPhone] = useState(profile?.phone || '+91 98765 43210');
  const [farmerCode, setFarmerCode] = useState(profile?.farmer_code || 'F-1042');
  const [village, setVillage] = useState(profile?.village || 'Kottathi');
  const [taluk, setTaluk] = useState(profile?.taluk || 'Mandya');
  const [district, setDistrict] = useState(profile?.district || 'Mandya');
  const [state, setState] = useState(profile?.state || 'Karnataka');
  const [aadhaarLastFour, setAadhaarLastFour] = useState(profile?.aadhaar_last_four || '4902');
  const [bankName, setBankName] = useState(profile?.bank_name || '');
  const [bankAccount, setBankAccount] = useState(profile?.bank_account || '');
  const [ifsc, setIfsc] = useState(profile?.ifsc || '');
  const [landAreaAcres, setLandAreaAcres] = useState(profile?.land_area_acres || 4.5);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const params = new URLSearchParams({ userId: user?.id || '', email: user?.email || '' });
        const response = await fetch(`/api/farmers/profile?${params}`);
        const data = await response.json();
        if (!response.ok || !data.success) return;

        const farmer = data.farmer;
        setFullName(farmer.name || profile?.full_name || '');
        setPhone(farmer.phone || profile?.phone || '');
        setFarmerCode(farmer.farmer_code || '');
        setVillage(farmer.village || '');
        setDistrict(farmer.district || '');
        setState(farmer.state || '');
        setBankName(farmer.bank_name || '');
        setBankAccount(farmer.bank_account || '');
        setIfsc(farmer.ifsc || '');
      } catch (error) {
        setMsg({ type: 'error', text: 'Could not load saved profile details.' });
      }
    };

    if (user?.id || user?.email) loadProfile();
  }, [user, profile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/farmers/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
          full_name: fullName,
          phone,
          village,
          taluk,
          district,
          state,
          aadhaar_last_four: aadhaarLastFour,
          bank_name: bankName,
          bank_account: bankAccount,
          ifsc,
          land_area_acres: Number(landAreaAcres)
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMsg({ type: 'error', text: data.error || 'Failed to update profile in database.' });
      } else {
        setMsg({ type: 'success', text: 'Farmer profile updated successfully in MongoDB!' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>
            🔒 Verified Aadhaar & Bank Details
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
            Farmer Profile Management
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Manage your agricultural landholding, DBT bank account masking, and contact details.
          </p>
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: msg.type === 'success' ? '#15803d' : '#991b1b',
          padding: '0.85rem',
          borderRadius: '10px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="card" style={{ padding: '1.75rem' }}>
        {/* Section 1: Basic & Contact Info */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          👤 Personal & Contact Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Mobile Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Unique Farmer Code
            </label>
            <input
              type="text"
              value={farmerCode}
              disabled
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#f8fafc', fontWeight: 700, color: '#16a34a' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Land Area (Acres)
            </label>
            <input
              type="number"
              step="0.1"
              value={landAreaAcres}
              onChange={(e) => setLandAreaAcres(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              required
            />
          </div>
        </div>

        {/* Section 2: Address & Location */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          📍 Village & District Location
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>Village</label>
            <input type="text" value={village} onChange={(e) => setVillage(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>Taluk</label>
            <input type="text" value={taluk} onChange={(e) => setTaluk(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>District</label>
            <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>State</label>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
          </div>
        </div>

        {/* Section 3: DBT Bank Account & Masked Aadhaar */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          🏦 Masked Bank & Aadhaar Details for DBT Disbursement
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>Aadhaar (Last 4)</label>
            <input type="text" maxLength="4" value={aadhaarLastFour} onChange={(e) => setAadhaarLastFour(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>Bank Name</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>Account Number</label>
            <input type="text" inputMode="numeric" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>IFSC Code</label>
            <input type="text" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} required />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          <Save size={18} /> {loading ? 'Saving Profile Changes...' : 'Save Profile Details'}
        </button>
      </form>
    </div>
  );
}
