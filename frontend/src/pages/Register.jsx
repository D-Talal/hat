import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const s = {
  page: {
    minHeight: '100vh', background: 'var(--ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, position: 'relative', overflow: 'hidden',
  },
  glow: (x, y, color) => ({
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: color, filter: 'blur(80px)', opacity: 0.12, left: x, top: y,
    pointerEvents: 'none',
  }),
  card: {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
    padding: '40px 44px', width: '100%', maxWidth: 460,
    position: 'relative', zIndex: 1,
  },
  logo: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 },
  title: { fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 6px' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', marginBottom: 16, fontFamily: 'inherit',
  },
  btn: (disabled) => ({
    width: '100%', padding: '13px', borderRadius: 10, border: 'none',
    background: disabled ? 'rgba(67,97,238,0.4)' : '#4361ee',
    color: '#fff', fontSize: 15, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    marginTop: 8, transition: 'background .2s',
  }),
  error: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16 },
  success: { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '24px', fontSize: 14, color: '#6ee7b7', textAlign: 'center' },
};

export default function Register() {
  const [form, setForm] = useState({ org_name: '', full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, form);
      setSubmitted(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => d.msg).join(' · '));
      } else {
        setError(detail || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.glow('-10%', '-10%', '#4361ee')} />
      <div style={s.glow('60%', '50%', '#7209b7')} />

      <div style={s.card}>
        <div style={s.logo}>PropManager</div>

        {submitted ? (
          <div>
            <div style={s.success}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Request received!</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Your account for <strong style={{ color: '#fff' }}>{form.org_name}</strong> has been created
                and is pending approval.<br /><br />
                We'll send a confirmation to <strong style={{ color: '#fff' }}>{form.email}</strong> once validated,
                usually within 24 hours.
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Already approved? <Link to="/login" style={{ color: '#818cf8' }}>Log in</Link>
            </div>
          </div>
        ) : (
          <>
            <h1 style={s.title}>Get started</h1>
            <p style={s.sub}>Create your organization account</p>

            {error && <div style={s.error}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <label style={s.label}>Organization name</label>
              <input style={s.input} placeholder="e.g. Centre Commercial Atlas" value={form.org_name} onChange={set('org_name')} required />

              <label style={s.label}>Your full name</label>
              <input style={s.input} placeholder="First and last name" value={form.full_name} onChange={set('full_name')} required />

              <label style={s.label}>Work email</label>
              <input style={s.input} type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />

              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" value={form.password} onChange={set('password')} required />

              <button type="submit" style={s.btn(loading)} disabled={loading}>
                {loading ? 'Creating account…' : 'Create account →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Already have an account? <Link to="/login" style={{ color: '#818cf8' }}>Log in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
