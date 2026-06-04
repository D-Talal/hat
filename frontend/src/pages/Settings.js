import React, { useState, useEffect } from 'react';
import { authAPI, orgSettingsAPI } from '../api';
import { Card, Btn, Input, Select, PageHeader, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = [
  ['USD', 'US Dollar ($)'], ['EUR', 'Euro (€)'], ['GBP', 'British Pound (£)'],
  ['CAD', 'Canadian Dollar (C$)'], ['AUD', 'Australian Dollar (A$)'], ['CHF', 'Swiss Franc'],
  ['JPY', 'Japanese Yen (¥)'], ['CNY', 'Chinese Yuan (¥)'], ['INR', 'Indian Rupee (₹)'],
  ['BRL', 'Brazilian Real (R$)'], ['MXN', 'Mexican Peso'], ['ZAR', 'South African Rand'],
  ['AED', 'UAE Dirham'], ['SAR', 'Saudi Riyal'], ['SGD', 'Singapore Dollar'],
  ['HKD', 'Hong Kong Dollar'], ['SEK', 'Swedish Krona'], ['NOK', 'Norwegian Krone'],
  ['DKK', 'Danish Krone'], ['PLN', 'Polish Zloty'],
];

const LOCALES = [
  ['en-US', 'English (United States)'], ['en-GB', 'English (United Kingdom)'],
  ['en-CA', 'English (Canada)'], ['fr-FR', 'Français (France)'],
  ['fr-CA', 'Français (Canada)'], ['de-DE', 'Deutsch (Deutschland)'],
  ['es-ES', 'Español (España)'], ['es-MX', 'Español (México)'],
  ['it-IT', 'Italiano (Italia)'], ['pt-BR', 'Português (Brasil)'],
  ['nl-NL', 'Nederlands'], ['ar-AE', 'العربية (الإمارات)'],
  ['zh-CN', '中文 (简体)'], ['ja-JP', '日本語'],
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Sao_Paulo', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Zurich',
  'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata',
  'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney',
];

// Live preview helpers — show the admin what their choices produce
function previewMoney(s) {
  try {
    return new Intl.NumberFormat(s.locale, { style: 'currency', currency: s.default_currency }).format(1234567.89);
  } catch { return `${s.default_currency} 1,234,567.89`; }
}
function previewDate(s) {
  try {
    return new Intl.DateTimeFormat(s.locale, { timeZone: s.timezone, dateStyle: 'long' }).format(new Date());
  } catch { return new Date().toDateString(); }
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Org i18n settings
  const [orgSettings, setOrgSettings] = useState(null);
  const [orgSaving, setOrgSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    orgSettingsAPI.get()
      .then(r => setOrgSettings(r.data))
      .catch(() => {});
  }, [isAdmin]);

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

  const saveOrgSettings = async () => {
    setOrgSaving(true);
    try {
      const r = await orgSettingsAPI.update(orgSettings);
      setOrgSettings(r.data);
      flash('Organization settings saved ✓ — applying…');
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      flash(e.response?.data?.detail || 'Error saving settings', true);
      setOrgSaving(false);
    }
  };

  const setOrg = (k, v) => setOrgSettings(s => ({ ...s, [k]: v }));

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

      {/* Organization settings — admin only */}
      {isAdmin && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 20, marginBottom: 8 }}>Organization & Regional Settings</h3>
          <p style={{ color: 'var(--slate)', fontSize: 14, marginBottom: 20 }}>
            These defaults control how currency, dates, and areas are displayed across the app for everyone in your organization.
          </p>

          {!orgSettings ? (
            <p style={{ color: 'var(--slate)', fontSize: 14 }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640 }}>
                <Select label="Default Currency" value={orgSettings.default_currency} onChange={e => setOrg('default_currency', e.target.value)}>
                  {CURRENCIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </Select>

                <Select label="Language & Region (locale)" value={orgSettings.locale} onChange={e => setOrg('locale', e.target.value)}>
                  {LOCALES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </Select>

                <Select label="Time Zone" value={orgSettings.timezone} onChange={e => setOrg('timezone', e.target.value)}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </Select>

                <Select label="Area Unit" value={orgSettings.area_unit} onChange={e => setOrg('area_unit', e.target.value)}>
                  <option value="sqm">Square meters (m²)</option>
                  <option value="sqft">Square feet (ft²)</option>
                </Select>
              </div>

              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <Btn onClick={saveOrgSettings} disabled={orgSaving}>
                  {orgSaving ? 'Saving…' : 'Save Settings'}
                </Btn>
                <span style={{ fontSize: 13, color: 'var(--slate)' }}>
                  Preview: <strong>{previewMoney(orgSettings)}</strong> · {previewDate(orgSettings)}
                </span>
              </div>
            </>
          )}
        </Card>
      )}

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
