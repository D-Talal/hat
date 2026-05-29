import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { DAY_COUNT_METHODS, CONTRACT_TYPES, PAYMENT_TIMINGS } from '../data/constants';
import { useLanguage } from '../context/LanguageContext';

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnDanger    = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 };

const STATUS_COLORS = {
  draft:       { bg: '#fff8e1', text: '#f57f17', label: 'Draft' },
  released:    { bg: '#e8f5e9', text: '#2e7d32', label: 'Released' },
  terminated:  { bg: '#fce4ec', text: '#c62828', label: 'Terminated' },
  expired:     { bg: '#f5f5f5', text: '#757575', label: 'Expired' },
};

const CONDITION_TYPES = {
  base_rent: { label: 'Base Rent', color: '#1a237e', bg: '#e8eaf6' },
  service_charge: { label: 'Service Charge', color: '#1b5e20', bg: '#e8f5e9' },
  advance_payment: { label: 'Advance Payment', color: '#e65100', bg: '#fff3e0' },
  flat_rate: { label: 'Flat Rate', color: '#4a148c', bg: '#f3e5f5' },
  sales_based: { label: 'Sales-Based', color: '#01579b', bg: '#e1f5fe' },
  markup_fee: { label: 'Markup Fee', color: '#37474f', bg: '#eceff1' },
  rent_free: { label: 'Rent-Free', color: '#c62828', bg: '#fce4ec' },
  abatement: { label: 'Abatement', color: '#6a1b9a', bg: '#f3e5f5' },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 24, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function ContractForm({ onSave, onClose, initial }) {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [partners, setPartners] = useState([]);
  const [entities, setEntities] = useState([]);
  const [rentalObjects, setRentalObjects] = useState([]);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [form, setForm] = useState({
    contract_number: initial?.contract_number || '',
    business_partner_id: initial?.business_partner_id || '',
    business_entity_id: initial?.business_entity_id || '',
    contract_type: initial?.contract_type || 'lease_out',
    start_date: initial?.start_date || '',
    first_end_date: initial?.first_end_date || '',
    probable_end_date: initial?.probable_end_date || '',
    absolute_end_date: initial?.absolute_end_date || '',
    notice_date: initial?.notice_date || '',
    signing_date: initial?.signing_date || '',
    relevant_to_sales: initial?.relevant_to_sales || false,
    is_multi_object: initial?.is_multi_object || false,
    payment_timing: initial?.payment_timing || 'in_advance',
    day_count_method: initial?.day_count_method || 'act_365',
    pro_rata_enabled: initial?.pro_rata_enabled !== undefined ? initial.pro_rata_enabled : true,
    notes: initial?.notes || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    Promise.all([API.get('/commercial/business-partners'), API.get('/commercial/business-entities'), API.get('/commercial/rental-objects')])
      .then(([bp, be, ro]) => { setPartners(bp.data || []); setEntities(be.data || []); setRentalObjects(ro.data || []); })
      .catch(() => {});
  }, []);

  const toggleObject = id => setSelectedObjects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const save = async () => {
    if (initial?.id) await API.patch(`/commercial/contracts/${initial.id}`, { probable_end_date: form.probable_end_date, absolute_end_date: form.absolute_end_date, notes: form.notes });
    else await API.post('/commercial/contracts', { ...form, rental_object_ids: selectedObjects });
    onSave(); onClose();
  };

  const isEdit = !!initial?.id;

  return (
    <>
      <SectionTitle>Contract Information</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.contractNumber}><input style={inputStyle} value={form.contract_number} onChange={set('contract_number')} placeholder="Auto-generated if empty" disabled={isEdit} /></Field>
        <Field label={tc.contractType}>
          <select style={inputStyle} value={form.contract_type} onChange={set('contract_type')} disabled={isEdit}>
            <option value="lease_out">Lease Out (LO) — Landlord → Tenant</option>
            <option value="lease_in">Lease In (LI) — Tenant from Landlord</option>
          </select>
        </Field>
        <Field label={tc.businessEntity + " *"}>
          <select style={inputStyle} value={form.business_entity_id} onChange={set('business_entity_id')} disabled={isEdit}>
            <option value="">— Select —</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
        <Field label={tc.businessPartner + " *"}>
          <select style={inputStyle} value={form.business_partner_id} onChange={set('business_partner_id')} disabled={isEdit}>
            <option value="">— Select —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
          </select>
        </Field>
      </div>

      <SectionTitle>Key Dates (time-dependent)</SectionTitle>
      <div style={{ background: '#f0f7ff', borderRadius: 10, padding: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#1565c0', marginBottom: 12 }}>ℹ Any modification to these dates creates a new time slot.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Field label={tc.startDate + " *"}><input style={inputStyle} type="date" value={form.start_date} onChange={set('start_date')} disabled={isEdit} /></Field>
          <Field label={tc.firstEndDate}><input style={inputStyle} type="date" value={form.first_end_date} onChange={set('first_end_date')} disabled={isEdit} /></Field>
          <Field label={tc.probableEndDate}><input style={inputStyle} type="date" value={form.probable_end_date} onChange={set('probable_end_date')} /></Field>
          <Field label={tc.absoluteEndDate}><input style={inputStyle} type="date" value={form.absolute_end_date} onChange={set('absolute_end_date')} /></Field>
          <Field label={tc.noticeDate}><input style={inputStyle} type="date" value={form.notice_date} onChange={set('notice_date')} disabled={isEdit} /></Field>
          <Field label={tc.signingDate}><input style={inputStyle} type="date" value={form.signing_date} onChange={set('signing_date')} disabled={isEdit} /></Field>
        </div>
      </div>

      {!isEdit && (
        <>
          <SectionTitle>Posting Parameters</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label={tc.paymentTiming}>
              <select style={inputStyle} value={form.payment_timing} onChange={set('payment_timing')}>
                <option value="in_advance">In Advance (start of month)</option>
                <option value="in_arrears">In Arrears (end of month)</option>
              </select>
            </Field>
            <Field label={tc.dayCountMethod}>
              <select style={inputStyle} value={form.day_count_method} onChange={set('day_count_method')}>
                <option value="act_365">Actual / 365</option>
                <option value="act_360">Actual / 360</option>
                <option value="act_act">Actual / Actual</option>
                <option value="30_360">30 / 360</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            {[['pro_rata_enabled', 'Enable pro-rata'], ['relevant_to_sales', 'Relevant to Sales'], ['is_multi_object', 'Multi-object']].map(([k, lbl]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={form[k]} onChange={set(k)} />{lbl}
              </label>
            ))}
          </div>
          <SectionTitle>Rental Objects</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {rentalObjects.map(ro => (
              <div key={ro.id} onClick={() => toggleObject(ro.id)}
                style={{ padding: '10px 14px', borderRadius: 8, border: `2px solid ${selectedObjects.includes(ro.id) ? 'var(--gold)' : 'var(--border)'}`, background: selectedObjects.includes(ro.id) ? '#fffbf0' : 'white', cursor: 'pointer', fontSize: 13 }}>
                <div style={{ fontWeight: 700 }}>{ro.code}</div>
                <div style={{ color: 'var(--slate)', fontSize: 11 }}>{ro.usage_type}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <Field label={tc.notes}><textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.notes} onChange={set('notes')} /></Field>

      {!isEdit && (
        <div style={{ background: '#fff8e1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e65100', marginBottom: 16 }}>
          ⚠ Contract will be created in <strong>Draft</strong> status. No FI postings until Released.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary}>{isEdit ? 'Save Changes' : 'Create Contract'}</button>
      </div>
    </>
  );
}

function ContractDetail({ contract, onClose, onRelease, onEdit, onDelete, t }) {
  const [conditions, setConditions] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [invoices, setInvoices] = useState([]);

  const downloadInvoicePdf = async (invoiceId) => {
    try {
      const res = await api.invoices.downloadPdf(invoiceId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_INV-${String(invoiceId).padStart(5, '0')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download PDF');
    }
  };
  const s = STATUS_COLORS[contract.status] || STATUS_COLORS.draft;
  const days = daysUntil(contract.absolute_end_date);
  const expiringSoon = days !== null && days <= 90 && days > 0;
  const expired = days !== null && days <= 0;

  useEffect(() => {
    if (activeTab === 'invoices') {
      api.invoices.list(contract.id).then(r => setInvoices(r.data)).catch(() => {});
    }
    if (activeTab === 'conditions') {
      API.get(`/commercial/conditions?contract_id=${contract.id}`)
        .then(r => setConditions(r.data || [])).catch(() => {});
    }
  }, [activeTab, contract.id]);

  return (
    <>
      {/* Status + badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ background: s.bg, color: s.text, borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{s.label}</span>
        <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{contract.contract_type === 'lease_out' ? 'LO' : 'LI'}</span>
        {contract.relevant_to_sales && <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Sales-Based</span>}
        {expiringSoon && <span style={{ background: '#fff8e1', color: '#f57f17', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>⚠ Expires in {days} days</span>}
        {expired && <span style={{ background: '#fce4ec', color: '#c62828', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>⛔ Expired {Math.abs(days)} days ago</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        {['info', 'conditions', 'invoices'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? 'var(--ink)' : 'var(--slate)', borderBottom: activeTab === tab ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -2, textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            ['Tenant', contract.business_partner?.company_name],
            ['Business Entity', contract.business_entity?.name],
            ['Start Date', contract.start_date],
            ['Absolute End', contract.absolute_end_date],
            ['Probable End', contract.probable_end_date],
            ['Notice Date', contract.notice_date],
            ['Payment', contract.payment_timing === 'in_advance' ? 'In Advance' : 'In Arrears'],
            ['Day Count', contract.day_count_method],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontWeight: 600 }}>{val || '—'}</div>
            </div>
          ))}
          {contract.notes && (
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>{contract.notes}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'conditions' && (
        <div>
          {conditions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No conditions on this contract yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Type', 'Amount', 'Frequency', 'Valid From', 'Valid To'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {conditions.map(c => {
                  const ct = CONDITION_TYPES[c.condition_type] || {};
                  return (
                    <tr key={c.id}>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ background: ct.bg, color: ct.color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{ct.label || c.condition_type}</span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.amount ? `${Number(c.amount).toLocaleString()} ${c.currency}` : c.condition_type === 'markup_fee' ? `${((c.markup_rate || 0) * 100).toFixed(0)}%` : '—'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.frequency}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_from}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_to || '∞'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Actions */}
      {contract.status === 'draft' && (
        <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#2e7d32', marginBottom: 10 }}>✓ Ready to release? Once Released, FI postings will begin.</div>
          <button onClick={() => onRelease(contract.id)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2e7d32', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Release Contract</button>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div>
          {invoices.length === 0 ? (
            <p style={{ color: 'var(--slate)', fontSize: 13 }}>No invoices found for this contract.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f7ff' }}>
                  {['Period', 'Type', 'Amount', 'Due Date', 'Status', 'PDF'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px' }}>{inv.period_from ? `${inv.period_from} – ${inv.period_to}` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{(inv.condition_type || '—').replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{inv.currency} {parseFloat(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px 10px' }}>{inv.due_date || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                        background: inv.status === 'paid' ? '#ecfdf5' : inv.status === 'overdue' ? '#fef2f2' : '#fff7ed',
                        color: inv.status === 'paid' ? '#10b981' : inv.status === 'overdue' ? '#ef4444' : '#f97316' }}>
                        {(inv.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => downloadInvoicePdf(inv.id)} title="Download receipt PDF"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>📥</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button onClick={onEdit} style={btnPrimary}>✏️ Edit</button>
        {contract.status === 'draft' && <button onClick={onDelete} style={btnDanger}>🗑 Delete</button>}
      </div>
    </>
  );
}

export default function Contracts() {
  const { t } = useLanguage();
  const tc = t.commercial;

  const downloadStatement = async (contractId, contractNumber) => {
    try {
      const res = await api.invoices.downloadStatement(contractId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `lease_statement_${contractNumber || contractId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download PDF');
    }
  };
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/contracts'); setContracts(r.data); }
    catch { setContracts([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const release = async (id) => {
    await API.patch(`/commercial/contracts/${id}`, { status: 'released' });
    load(); setSelected(null); setModal(null);
  };

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/contracts/${id}`); load(); setConfirm(null); setModal(null); }
    catch { alert(t.common.deleteFailed); }
  };

  const filtered = filter === 'all' ? contracts : contracts.filter(c => c.status === filter);

  // Contracts expiring in next 90 days
  const expiringCount = contracts.filter(c => {
    const d = daysUntil(c.absolute_end_date);
    return d !== null && d <= 90 && d > 0 && c.status === 'released';
  }).length;

  return (
    <div className="animate-fade">
      <PageHeader title={tc.contractsTitle} sub={tc.contractsSub} />

      {expiringCount > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#e65100' }}>
          ⚠ <strong>{expiringCount} contract{expiringCount > 1 ? 's' : ''}</strong> expiring within 90 days
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'draft', 'released', 'terminated', 'expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f ? 'var(--ink)' : 'white', color: filter === f ? 'var(--gold)' : 'var(--slate)', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
        <button onClick={() => { setSelected(null); setModal('new'); }} style={{ ...btnPrimary, marginLeft: 'auto' }}>+ {tc.newContract}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>{t.common.loading}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Contract #', 'Tenant', 'Business Entity', 'Type', 'Start', 'End (Abs.)', 'Status', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const s = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
                const days = daysUntil(c.absolute_end_date);
                const expiring = days !== null && days <= 90 && days > 0;
                return (
                  <tr key={c.id} style={{ background: expiring ? '#fffbf0' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = expiring ? '#fff3cd' : 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = expiring ? '#fffbf0' : 'transparent'}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontWeight: 700 }}>{c.contract_number || `#${c.id}`}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.business_partner?.company_name || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.business_entity?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}><span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{c.contract_type === 'lease_out' ? 'LO' : 'LI'}</span></td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.start_date || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: expiring ? '#f57f17' : 'var(--slate)', fontWeight: expiring ? 700 : 400 }}>
                        {c.absolute_end_date || '—'} {expiring ? `(${days}d)` : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}><span style={{ background: s.bg, color: s.text, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{s.label}</span></td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setSelected(c); setModal('view'); }} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>View</button>
                        <button onClick={() => downloadStatement(c.id, c.contract_number)} title="Download lease statement PDF" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>📄</button>
                        <button onClick={() => { setSelected(c); setModal('edit'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                        {c.status === 'draft' && <button onClick={() => setConfirm(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)' }}>{tc.noContracts}</div>}
        </div>
      )}

      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? `${t.common.edit} — ${selected?.contract_number || "#"+selected?.id}` : tc.newContract} onClose={() => setModal(null)}>
          <ContractForm onSave={load} onClose={() => setModal(null)} initial={modal === 'edit' ? selected : null} />
        </Modal>
      )}

      {modal === 'view' && selected && (
        <Modal title={`Contract ${selected.contract_number || `#${selected.id}`}`} onClose={() => setModal(null)}>
          <ContractDetail contract={selected} onClose={() => setModal(null)} onRelease={release}
            onEdit={() => setModal('edit')} onDelete={() => { setModal(null); setConfirm(selected); }} t={t} />
        </Modal>
      )}

      {confirm && (
        <Modal title={t.common.confirm + " " + t.common.delete} onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete contract <strong>{confirm.contract_number}</strong>? {t.common.deleteConfirm}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={btnDanger}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>{t.common.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
