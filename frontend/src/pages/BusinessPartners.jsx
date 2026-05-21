import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';

const ROLES = ['master_tenant', 'guarantor', 'landlord', 'vendor', 'contact_person'];
const ROLE_LABELS = {
  master_tenant:  { label: 'Master Tenant', desc: 'w/ Customer Account — required for AR postings', color: '#1a237e', bg: '#e8eaf6' },
  guarantor:      { label: 'Guarantor',     desc: '', color: '#4a148c', bg: '#f3e5f5' },
  landlord:       { label: 'Landlord',      desc: '', color: '#1b5e20', bg: '#e8f5e9' },
  vendor:         { label: 'Vendor',        desc: '', color: '#e65100', bg: '#fff3e0' },
  contact_person: { label: 'Contact',       desc: '', color: '#37474f', bg: '#eceff1' },
};

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnDanger    = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function BPForm({ onSave, onClose, initial }) {
  const [form, setForm] = useState({
    company_name: initial?.company_name || '',
    trade_name: initial?.trade_name || '',
    contact_name: initial?.contact_name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    city: initial?.city || '',
    country: initial?.country || '',
    tax_id: initial?.tax_id || '',
  });
  const [roles, setRoles] = useState(
    initial?.roles?.length
      ? initial.roles.map(r => ({ role: r.role, customer_account: r.customer_account || '' }))
      : [{ role: 'master_tenant', customer_account: '' }]
  );
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const addRole = () => setRoles(r => [...r, { role: 'master_tenant', customer_account: '' }]);
  const removeRole = i => setRoles(r => r.filter((_, idx) => idx !== i));
  const setRole = (i, k, v) => setRoles(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const save = async () => {
    if (initial?.id) await API.put(`/commercial/business-partners/${initial.id}`, { ...form, roles });
    else await API.post('/commercial/business-partners', { ...form, roles });
    onSave(); onClose();
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.companyName + " *"}><input style={inputStyle} value={form.company_name} onChange={set('company_name')} /></Field>
        <Field label={tc.tradeName}><input style={inputStyle} value={form.trade_name} onChange={set('trade_name')} /></Field>
        <Field label={tc.contactName}><input style={inputStyle} value={form.contact_name} onChange={set('contact_name')} /></Field>
        <Field label={tc.taxId}><input style={inputStyle} value={form.tax_id} onChange={set('tax_id')} /></Field>
        <Field label={tc.email}><input style={inputStyle} type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label={tc.phone}><input style={inputStyle} value={form.phone} onChange={set('phone')} /></Field>
        <Field label={tc.city}><input style={inputStyle} value={form.city} onChange={set('city')} /></Field>
        <Field label={tc.country}><input style={inputStyle} value={form.country} onChange={set('country')} /></Field>
      </div>
      <Field label={tc.address}><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
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
                <Field label={tc.roles}>
                  <select style={inputStyle} value={r.role} onChange={e => setRole(i, 'role', e.target.value)}>
                    {ROLES.map(ro => <option key={ro} value={ro}>{ROLE_LABELS[ro].label}</option>)}
                  </select>
                </Field>
                {r.role === 'master_tenant' && (
                  <Field label={tc.customerAccount}>
                    <input style={inputStyle} value={r.customer_account} onChange={e => setRole(i, 'customer_account', e.target.value)} placeholder={tc.arWarning} />
                  </Field>
                )}
                <button onClick={() => removeRole(i)} style={{ background: 'none', border: 'none', color: '#c62828', fontSize: 18, cursor: 'pointer', paddingBottom: 4 }}>×</button>
              </div>
              {rl?.desc && <div style={{ fontSize: 11, marginTop: 4, background: rl.bg, color: rl.color, borderRadius: 5, padding: '3px 8px', display: 'inline-block' }}>⚠ {rl.desc}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary}>{initial?.id ? 'Save Changes' : 'Save Partner'}</button>
      </div>
    </>
  );
}

export default function BusinessPartners() {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/business-partners'); setPartners(r.data); }
    catch { setPartners([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/business-partners/${id}`); load(); setConfirm(null); setModal(null); }
    catch { alert(t.common.deleteFailed); }
  };

  const filtered = partners.filter(p => {
    const matchSearch = p.company_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || (p.roles || []).some(r => r.role === filterRole);
    return matchSearch && matchRole;
  });

  return (
    <div className="animate-fade">
      <PageHeader title={tc.partnersTitle} sub={tc.partnersSub} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }} />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r].label}</option>)}
        </select>
        <button onClick={() => { setSelected(null); setModal('new'); }} style={{ ...btnPrimary, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          + {tc.newPartner}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>{t.common.loading}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
            <Card key={p.id} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setSelected(p); setModal('view'); }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.company_name}</div>
                  {p.trade_name && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p.trade_name}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--slate)', background: '#f5f5f5', borderRadius: 6, padding: '2px 8px' }}>BP-{p.id}</span>
                  <button onClick={() => { setSelected(p); setModal('edit'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }} title="Edit">✏️</button>
                  <button onClick={() => setConfirm(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }} title=t.common.delete>🗑</button>
                </div>
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
              {(p.roles || []).some(r => r.role === 'master_tenant' && !r.customer_account) && (
                <div style={{ marginTop: 8, background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: '#e65100' }}>
                  ⚠ No Customer Account — AR postings blocked
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)' }}>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 22, marginBottom: 8 }}>{tc.noPartners}</div>
          <div style={{ fontSize: 14 }}>{tc.noPartnersDesc}</div>
        </div>
      )}

      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? `Edit — ${selected?.company_name}` : tc.newPartner} onClose={() => setModal(null)}>
          <BPForm onSave={load} onClose={() => setModal(null)} initial={modal === 'edit' ? selected : null} />
        </Modal>
      )}

      {modal === 'view' && selected && (
        <Modal title={selected.company_name} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {(selected.roles || []).map((r, i) => {
              const rl = ROLE_LABELS[r.role] || {};
              return <span key={i} style={{ background: rl.bg, color: rl.color, borderRadius: 5, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{rl.label || r.role}</span>;
            })}
          </div>
          {[['Tax ID', selected.tax_id], ['Contact', selected.contact_name], ['Email', selected.email], ['Phone', selected.phone], ['Address', [selected.address, selected.city, selected.country].filter(Boolean).join(', ')]].map(([label, val]) => val ? (
            <div key={label} style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: 'var(--slate)', minWidth: 80, fontWeight: 600 }}>{label}</span>
              <span>{val}</span>
            </div>
          ) : null)}
          {(selected.roles || []).some(r => r.role === 'master_tenant' && !r.customer_account) && (
            <div style={{ background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e65100', marginBottom: 16 }}>
              ⚠ No Customer Account set — AR postings will be blocked.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setModal('edit')} style={btnPrimary}>✏️ Edit</button>
            <button onClick={() => { setModal(null); setConfirm(selected); }} style={btnDanger}>🗑 Delete</button>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal title=t.common.confirm + " " + t.common.delete onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete <strong>{confirm.company_name}</strong>? {t.common.deleteConfirm}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={btnDanger}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>{t.common.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
