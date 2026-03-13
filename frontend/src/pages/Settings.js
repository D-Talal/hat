import React, { useState } from 'react';
import { authAPI } from '../api';
import { Card, Btn, Input, PageHeader, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const flash = (m, isErr = false) => { if (isErr) setErr(m); else setMsg(m); setTimeout(() => { setMsg(''); setErr(''); }, 3000); };

  const setup2fa = async () => {
    try { const r = await authAPI.setup2fa(); setQrCode(r.data.qr_code); setSecret(r.data.secret); }
    catch (e) { flash(e.response?.data?.detail || 'Error', true); }
  };

  const confirm2fa = async () => {
    try { await authAPI.confirm2fa({ code: confirmCode }); flash('2FA enabled successfully! ✓'); setQrCode(null); window.location.reload(); }
    catch (e) { flash(e.response?.data?.detail || 'Invalid code', true); }
  };

  const disable2fa = async () => {
    try { await authAPI.disable2fa({ code: disableCode }); flash('2FA disabled'); window.location.reload(); }
    catch (e) { flash(e.response?.data?.detail || 'Invalid code', true); }
  };

  const changePw = async () => {
    if (pwForm.new_password !== pwForm.confirm) return flash('Passwords do not match', true);
    try {
      await authAPI.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      flash('Password changed successfully ✓');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (e) { flash(e.response?.data?.detail || 'Error', true); }
  };

  return (
    <div className="animate-fade">
      <PageHeader title="My Settings" sub="Manage your account and security" />

      {msg && <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontWeight: 500 }}>{msg}</div>}
      {err && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontWeight: 500 }}>{err}</div>}

      {/* Profile */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, marginBottom: 16 }}>Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Full Name</div>
            <div style={{ fontWeight: 600 }}>{user?.full_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Email</div>
            <div style={{ fontWeight: 600 }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Role</div>
            <Badge status={user?.role} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>2FA Status</div>
            <span style={{ fontWeight: 600, color: user?.totp_enabled ? 'var(--sage)' : 'var(--terracotta)' }}>
              {user?.totp_enabled ? '✓ Enabled' : '✗ Disabled'}
            </span>
          </div>
        </div>
      </Card>

      {/* 2FA */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Two-Factor Authentication</h3>
        <p style={{ color: 'var(--slate)', fontSize: 14, marginBottom: 20 }}>Add an extra layer of security using Google Authenticator or Authy.</p>

        {!user?.totp_enabled ? (
          <>
            {!qrCode ? (
              <Btn onClick={setup2fa}>Set Up 2FA</Btn>
            ) : (
              <div>
                <p style={{ fontSize: 14, marginBottom: 16, color: 'var(--slate)' }}>Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
                <img src={`data:image/png;base64,${qrCode}`} alt="2FA QR Code" style={{ width: 180, height: 180, marginBottom: 16, border: '4px solid white', boxShadow: 'var(--shadow)', borderRadius: 8 }} />
                <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 16 }}>Manual key: <code style={{ background: 'var(--cream)', padding: '2px 6px', borderRadius: 4 }}>{secret}</code></p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <Input label="Confirmation Code" value={confirmCode} onChange={e => setConfirmCode(e.target.value)} placeholder="000000" style={{ marginBottom: 0, width: 160 }} />
                  <Btn onClick={confirm2fa} variant="success">Confirm & Enable</Btn>
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 16 }}>2FA is currently enabled. Enter your authenticator code to disable it.</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <Input label="Authenticator Code" value={disableCode} onChange={e => setDisableCode(e.target.value)} placeholder="000000" style={{ marginBottom: 0, width: 160 }} />
              <Btn onClick={disable2fa} variant="danger">Disable 2FA</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Change Password */}
      <Card>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Change Password</h3>
        <p style={{ color: 'var(--slate)', fontSize: 14, marginBottom: 20 }}>Choose a strong password with at least 8 characters.</p>
        <div style={{ maxWidth: 360 }}>
          <Input label="Current Password" type="password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
          <Input label="New Password" type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
          <Input label="Confirm New Password" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          <Btn onClick={changePw}>Update Password</Btn>
        </div>
      </Card>
    </div>
  );
}
