import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

export default function Login() {
  const [step, setStep] = useState('credentials'); // credentials | 2fa
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      if (res.data.requires_2fa) {
        setTempToken(res.data.temp_token);
        setStep('2fa');
      } else {
        login(res.data.access_token, res.data.user);
        navigate('/');
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authAPI.verify2fa({ email, code, temp_token: tempToken });
      login(res.data.access_token, res.data.user);
      navigate('/');
    } catch (e) {
      setError(e.response?.data?.detail || 'Invalid 2FA code');
    } finally { setLoading(false); }
  };

  const s = {
    page: {
      minHeight: '100vh', background: 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    },
    glow: (x, y, color) => ({
      position: 'absolute', width: 400, height: 400, borderRadius: '50%',
      background: color, filter: 'blur(80px)', opacity: 0.15, left: x, top: y,
      pointerEvents: 'none',
    }),
    card: {
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
      padding: '48px 40px', width: '100%', maxWidth: 440,
      position: 'relative', zIndex: 1,
    },
    logo: { fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 8 },
    title: { fontFamily: 'DM Serif Display', fontSize: 32, color: 'white', lineHeight: 1.2, marginBottom: 8 },
    sub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 36 },
    label: { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 8 },
    input: {
      width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.06)',
      border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10,
      color: 'white', fontSize: 15, fontFamily: 'DM Sans', outline: 'none',
      transition: 'border-color 0.2s', marginBottom: 20,
    },
    btn: {
      width: '100%', padding: '14px', background: 'var(--gold)', color: 'var(--ink)',
      border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
      fontFamily: 'DM Sans', cursor: 'pointer', transition: 'opacity 0.2s',
      marginTop: 8,
    },
    error: { background: 'rgba(193,68,14,0.2)', border: '1px solid rgba(193,68,14,0.4)', color: '#FF8A65', borderRadius: 8, padding: '12px 16px', fontSize: 13, marginBottom: 20 },
    hint: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 24 },
    codeWrap: { display: 'flex', gap: 8, marginBottom: 20 },
    codeInput: {
      flex: 1, padding: '16px', textAlign: 'center', fontSize: 24, letterSpacing: 8,
      background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)',
      borderRadius: 10, color: 'white', fontFamily: 'DM Serif Display', outline: 'none',
    },
  };

  return (
    <div style={s.page}>
      <div style={s.glow('−10%', '−10%', 'var(--gold)')} />
      <div style={s.glow('60%', '50%', 'var(--sage)')} />

      <div style={s.card} className="animate-fade">
        <div style={s.logo}>PropManager</div>

        {step === 'credentials' ? (
          <>
            <h1 style={s.title}>Welcome back</h1>
            <p style={s.sub}>Sign in to your account to continue</p>

            {error && <div style={s.error}>{error}</div>}

            <form onSubmit={handleLogin}>
              <label style={s.label}>Email address</label>
              <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required autoFocus
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />

              <label style={s.label}>Password</label>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input style={{ ...s.input, marginBottom: 0, paddingRight: 48 }}
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>

              <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <p style={s.hint}>Default admin: admin@propmanager.com / Admin@1234</p>
          </>
        ) : (
          <>
            <h1 style={s.title}>Two-factor auth</h1>
            <p style={s.sub}>Enter the 6-digit code from your authenticator app</p>

            {error && <div style={s.error}>{error}</div>}

            <form onSubmit={handle2FA}>
              <input style={s.codeInput} type="text" inputMode="numeric"
                maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" autoFocus />

              <button type="submit" style={{ ...s.btn, marginTop: 20, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Verifying…' : 'Verify Code →'}
              </button>
            </form>

            <button onClick={() => { setStep('credentials'); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, display: 'block', margin: '16px auto 0', fontFamily: 'DM Sans' }}>
              ← Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
