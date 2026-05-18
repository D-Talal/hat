import API from '../api';
import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card } from '../components/UI';

const ROLES = ['master_tenant', 'guarantor', 'landlord', 'vendor', 'contact_person'];
const ROLE_LABELS = {
  master_tenant:  { label: 'Master Tenant', desc: 'w/ Customer Account — required for AR postings', color: '#1a237e', bg: '#e8eaf6' },
  guarantor:      { label: 'Guarantor',     desc: '',                                                color: '#4a148c', bg: '#f3e5f5' },
  landlord:       { label: 'Landlord',      desc: '',                                                color: '#1b5e20', bg: '#e8f5e9' },
  vendor:         { label: 'Vendor',        desc: '',                                                color: '#e65100', bg: '#fff3e0' },
  contact_person: { label: 'Contact',       desc: '',                                                color: '#37474f', bg: '#eceff1' },
};

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 22, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BPForm({ onSave, onClose, initial }) {
  const [form, setForm] = useState(initial || {
    company_name: '', trade_name: '', contact_name: '', email: '', phone: '',
    address: '', city: '', country: '', tax_id: '',
  });
  const [roles, setRoles] = useState([{ role: 'master_tenant', customer_account: '', valid_from: '', valid_to: '' }]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const addRole = () => setRoles(r => [...r, { role: 'master_tenant', customer_account: '', valid_from: '', valid_to: '' }]);
  const removeRole = i => setRoles(r => r.filter((_, idx) => idx !== i));
  const setRole = (i, k, v) => setRoles(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const save = async () => {
    await API.post('/commercial/business-partners', { ...form, roles });
    onSave(); onClose();
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Company Name *"><input style={inputStyle} value={form.company_name} onChange={set('company_name')} /></Field>
        <Field label="Trade Name"><input style={inputStyle} value={form.trade_name} onChange={set('trade_name')} /></Field>
        <Field label="Contact Name"><input style={inputStyle} value={form.contact_name} onChange={set('contact_name')} /></Field>
        <Field label="Tax ID"><input style={inputStyle} value={form.tax_id} onChange={set('tax_id')} /></Field>
        <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={set('phone')} /></Field>
        <Field label="City"><input style={inputStyle} value={form.city} onChange={set('city')} /></Field>
        <Field label="Country"><input style={inputStyle} value={form.country} onChange={set('country')} /></Field>
      </div>
      <Field label="Address"><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>

      {/* Roles */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)' }}>Roles</span>
          <button onClick={addRole} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>+ Role</button>
        </div>
        {roles.map((r, i) => {
          const rl = ROLE_LABELS[r.role];
          return (
            <div key={i} style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <Field label="Role">
                  <select style={inputStyle} value={r.role} onChange={e => setRole(i, 'role', e.target.value)}>
                    {ROLES.map(ro => <option key={ro} value={ro}>{ROLE_LABELS[ro].label}</option>)}
                  </select>
                </Field>
                {r.role === 'master_tenant' && (
                  <Field label="Customer Account (AR)">
                    <input style={inputStyle} value={r.customer_account} onChange={e => setRole(i, 'customer_account', e.target.value)} placeholder="Required for AR postings" />
                  </Field>
                )}
                <button onClick={() => removeRole(i)} style={{ background: 'none', border: 'none', color: '#c62828', fontSize: 18, cursor: 'pointer', paddingBottom: 4 }}>×</button>
              </div>
              {rl?.desc && <div style={{ fontSize: 11, color: '#666', marginTop: 4, background: rl.bg, color: rl.color, borderRadius: 5, padding: '3px 8px', display: 'inline-block' }}>⚠ {rl.desc}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Save Partner</button>
      </div>
    </>
  );
}

export default function BusinessPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/business-partners'); setPartners(r.data); }
    catch { setPartners([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = partners.filter(p =>
    p.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <PageHeader title="Business Partners" sub="Tenants, landlords, guarantors and vendors" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input placeholder="Search partners…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320, flex: 1 }} />
        <button onClick={() => setModal(true)}
          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, whiteSpace: 'nowrap' }}>
          + New Partner
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
            <Card key={p.id} style={{ padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => setSelected(p)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.company_name}</div>
                  {p.trade_name && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p.trade_name}</div>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--slate)', background: '#f5f5f5', borderRadius: 6, padding: '2px 8px' }}>BP-{p.id}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {(p.roles || []).map((r, i) => {
                  const rl = ROLE_LABELS[r.role] || {};
                  return <span key={i} style={{ background: rl.bg, color: rl.color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{rl.label || r.role}</span>;
                })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>
                {[p.contact_name, p.email, p.city && p.country ? `${p.city}, ${p.country}` : null].filter(Boolean).join(' · ')}
              </div>
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)' }}>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 22, marginBottom: 8 }}>No partners found</div>
          <div style={{ fontSize: 14 }}>Create your first business partner to get started.</div>
        </div>
      )}

      {modal && <Modal title="New Business Partner" onClose={() => setModal(false)}><BPForm onSave={load} onClose={() => setModal(false)} /></Modal>}

      {selected && (
        <Modal title={selected.company_name} onClose={() => setSelected(null)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {(selected.roles || []).map((r, i) => {
                const rl = ROLE_LABELS[r.role] || {};
                return <span key={i} style={{ background: rl.bg, color: rl.color, borderRadius: 5, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{rl.label || r.role}</span>;
              })}
            </div>
            {[
              ['Tax ID', selected.tax_id],
              ['Contact', selected.contact_name],
              ['Email', selected.email],
              ['Phone', selected.phone],
              ['Address', [selected.address, selected.city, selected.country].filter(Boolean).join(', ')],
            ].map(([label, val]) => val ? (
              <div key={label} style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: 'var(--slate)', minWidth: 80, fontWeight: 600 }}>{label}</span>
                <span>{val}</span>
              </div>
            ) : null)}
          </div>
          {(selected.roles || []).some(r => r.role === 'master_tenant' && !r.customer_account) && (
            <div style={{ background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e65100' }}>
              ⚠ No Customer Account set — AR postings will be blocked for this tenant.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
