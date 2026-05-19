import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };

function Modal({ title, onClose, children, wide }) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '5vh 20px 40px',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16, padding: 32,
          width: '100%', maxWidth: wide ? 820 : 580,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          margin: 'auto',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 22, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CONDITION_TYPES = {
  base_rent:      { label: 'Base Rent',         color: '#1a237e', bg: '#e8eaf6' },
  service_charge: { label: 'Service Charge',     color: '#1b5e20', bg: '#e8f5e9' },
  advance_payment:{ label: 'Advance Payment',    color: '#e65100', bg: '#fff3e0' },
  flat_rate:      { label: 'Flat Rate',          color: '#4a148c', bg: '#f3e5f5' },
  sales_based:    { label: 'Sales-Based Rent',   color: '#01579b', bg: '#e1f5fe' },
  markup_fee:     { label: 'Markup Fee',         color: '#37474f', bg: '#eceff1' },
  rent_free:      { label: 'Rent-Free',          color: '#c62828', bg: '#fce4ec' },
  abatement:      { label: 'Abatement',          color: '#6a1b9a', bg: '#f3e5f5' },
};

const FREQUENCIES = { monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual' };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}


function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 20, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function ConditionForm({ contractId, onSave, onClose }) {
  const [form, setForm] = useState({
    contract_id: contractId || '',
    condition_type: 'base_rent',
    condition_code: '',
    valid_from: '', valid_to: '',
    amount: '', currency: 'USD',
    frequency: 'monthly',
    payment_timing: 'in_advance',
    ipc_enabled: false,
    ipc_base_index: '', ipc_reference_date: '',
    is_flat_rate: false,
    markup_rate: '',
    notes: '',
  });
  const [contracts, setContracts] = useState([]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    if (!contractId) {
      API.get('/commercial/contracts?status=released').then(r => setContracts(r.data || [])).catch(() => {});
    }
  }, [contractId]);

  const save = async () => {
    await API.post('/commercial/conditions', form);
    onSave(); onClose();
  };

  const ct = CONDITION_TYPES[form.condition_type] || {};

  return (
    <>
      <SectionTitle>Condition Details</SectionTitle>
      {!contractId && (
        <Field label="Contract (Released only)">
          <select style={inputStyle} value={form.contract_id} onChange={set('contract_id')}>
            <option value="">— Select —</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number || `#${c.id}`} — {c.business_partner?.company_name}</option>)}
          </select>
        </Field>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Condition Type">
          <select style={inputStyle} value={form.condition_type} onChange={set('condition_type')}>
            {Object.entries(CONDITION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Condition Code"><input style={inputStyle} value={form.condition_code} onChange={set('condition_code')} placeholder="e.g. *40, *50, A500" /></Field>
        <Field label="Valid From *"><input style={inputStyle} type="date" value={form.valid_from} onChange={set('valid_from')} /></Field>
        <Field label="Valid To (empty = active)"><input style={inputStyle} type="date" value={form.valid_to} onChange={set('valid_to')} /></Field>
      </div>

      {form.condition_type !== 'markup_fee' && (
        <>
          <SectionTitle>Amount & Schedule</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Field label="Amount *"><input style={inputStyle} type="number" value={form.amount} onChange={set('amount')} /></Field>
            <Field label="Currency">
              <select style={inputStyle} value={form.currency} onChange={set('currency')}>
                {['USD','EUR','GBP','AED','CHF','CAD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Frequency">
              <select style={inputStyle} value={form.frequency} onChange={set('frequency')}>
                {Object.entries(FREQUENCIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Payment Timing">
            <select style={inputStyle} value={form.payment_timing} onChange={set('payment_timing')}>
              <option value="in_advance">In Advance — start of period</option>
              <option value="in_arrears">In Arrears — end of period</option>
            </select>
          </Field>
        </>
      )}

      {form.condition_type === 'markup_fee' && (
        <>
          <SectionTitle>Markup Fee (Statistical)</SectionTitle>
          <div style={{ background: '#eceff1', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 }}>
            Markup fees are statistical — they apply on the charged amount, not on rent. Common rates: 0%, 5%, 13%, 15%.
          </div>
          <Field label="Markup Rate">
            <select style={inputStyle} value={form.markup_rate} onChange={set('markup_rate')}>
              <option value="0">0%</option>
              <option value="0.05">5%</option>
              <option value="0.13">13%</option>
              <option value="0.15">15%</option>
            </select>
          </Field>
        </>
      )}

      {['service_charge', 'advance_payment'].includes(form.condition_type) && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_flat_rate} onChange={set('is_flat_rate')} />
            Flat Rate — not reconciled (tenant pays fixed amount regardless of actual costs)
          </label>
          {form.is_flat_rate && (
            <div style={{ background: '#f3e5f5', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12, color: '#6a1b9a' }}>
              Flat rates (e.g. Unibail A500) are never reconciled at SCS settlement.
            </div>
          )}
        </div>
      )}

      {['base_rent', 'sales_based'].includes(form.condition_type) && (
        <>
          <SectionTitle>IPC Indexation</SectionTitle>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={form.ipc_enabled} onChange={set('ipc_enabled')} />
            Enable IPC indexation
          </label>
          {form.ipc_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Base Index"><input style={inputStyle} type="number" value={form.ipc_base_index} onChange={set('ipc_base_index')} /></Field>
              <Field label="Reference Date"><input style={inputStyle} type="date" value={form.ipc_reference_date} onChange={set('ipc_reference_date')} /></Field>
            </div>
          )}
          {form.ipc_enabled && (
            <div style={{ background: '#fff8e1', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e65100', marginBottom: 16 }}>
              ⚠ IPC revision must be applied simultaneously on all linked conditions (*40 and *50 before ACE, only *40 after ACE).
            </div>
          )}
        </>
      )}

      <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={set('notes')} /></Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Save Condition</button>
      </div>
    </>
  );
}

export default function Conditions() {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [conditions, setConditions] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [filterContract, setFilterContract] = useState('');
  const [filterType, setFilterType] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cond, cont] = await Promise.all([
        API.get('/commercial/conditions'),
        API.get('/commercial/contracts'),
      ]);
      setConditions(cond.data || []);
      setContracts(cont.data || []);
    } catch { setConditions([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = conditions
    .filter(c => !filterContract || String(c.contract_id) === filterContract)
    .filter(c => filterType === 'all' || c.condition_type === filterType);

  const isActive = (c) => !c.valid_to || new Date(c.valid_to) >= new Date();

  return (
    <div className="animate-fade">
      <PageHeader title={tc.conditionsTitle} sub={tc.conditionsSub} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterContract} onChange={e => setFilterContract(e.target.value)}
          style={{ ...inputStyle, maxWidth: 280 }}>
          <option value="">All Contracts</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number || `#${c.id}`} — {c.business_partner?.company_name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ ...inputStyle, maxWidth: 200 }}>
          <option value="all">All Types</option>
          {Object.entries(CONDITION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => setModal(true)}
          style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
          + New Condition
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>Loading…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Contract', 'Type', 'Code', 'Amount', 'Frequency', 'Valid From', 'Valid To', 'Flags', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const ct = CONDITION_TYPES[c.condition_type] || {};
                const active = isActive(c);
                return (
                  <tr key={c.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 13 }}>{c.contract?.contract_number || `#${c.contract_id}`}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ background: ct.bg, color: ct.color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{ct.label || c.condition_type}</span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--slate)' }}>{c.condition_code || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                      {c.condition_type === 'markup_fee'
                        ? `${((c.markup_rate || 0) * 100).toFixed(0)}%`
                        : c.amount ? `${Number(c.amount).toLocaleString()} ${c.currency}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{FREQUENCIES[c.frequency] || c.frequency}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_from || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_to || '∞'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      {c.ipc_enabled && <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, marginRight: 4 }}>IPC</span>}
                      {c.is_flat_rate && <span style={{ background: '#f3e5f5', color: '#6a1b9a', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>FLAT</span>}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ background: active ? '#e8f5e9' : '#f5f5f5', color: active ? '#2e7d32' : '#757575', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{active ? 'Active' : 'Expired'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)' }}>No conditions found.</div>}
        </div>
      )}

      {modal && <Modal title="New Condition" onClose={() => setModal(false)}><ConditionForm onSave={load} onClose={() => setModal(false)} /></Modal>}
    </div>
  );
}
