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
        position: 'fixed',
        top: 0,
        left: 260,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: wide ? 820 : 580,
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
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

const STATUS_COLORS = {
  draft:       { bg: '#fff8e1', text: '#f57f17', label: 'Draft' },
  released:    { bg: '#e8f5e9', text: '#2e7d32', label: 'Released' },
  terminated:  { bg: '#fce4ec', text: '#c62828', label: 'Terminated' },
  expired:     { bg: '#f5f5f5', text: '#757575', label: 'Expired' },
};

function Field({ label, children, span }) {
  return (
    <div style={{ marginBottom: 16, gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}


function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 24, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function ContractForm({ onSave, onClose }) {
  const [partners, setPartners] = useState([]);
  const [entities, setEntities] = useState([]);
  const [rentalObjects, setRentalObjects] = useState([]);
  const [selectedObjects, setSelectedObjects] = useState([]);

  const [form, setForm] = useState({
    contract_number: '', business_partner_id: '', business_entity_id: '',
    contract_type: 'lease_out', status: 'draft',
    start_date: '', first_end_date: '', probable_end_date: '', absolute_end_date: '',
    notice_date: '', signing_date: '',
    relevant_to_sales: false, is_multi_object: false,
    payment_timing: 'in_advance', day_count_method: 'act_365', pro_rata_enabled: true,
    notes: '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    Promise.all([
      API.get('/commercial/business-partners'),
      API.get('/commercial/business-entities'),
      API.get('/commercial/rental-objects'),
    ]).then(([bp, be, ro]) => {
      setPartners(bp.data || []);
      setEntities(be.data || []);
      setRentalObjects(ro.data || []);
    }).catch(() => {});
  }, []);

  const toggleObject = (id) => setSelectedObjects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const save = async () => {
    await API.post('/commercial/contracts', {
      ...form,
      rental_object_ids: selectedObjects,
    });
    onSave(); onClose();
  };

  return (
    <>
      <SectionTitle>Contract Information</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Contract Number"><input style={inputStyle} value={form.contract_number} onChange={set('contract_number')} placeholder="Auto-generated if empty" /></Field>
        <Field label="Type">
          <select style={inputStyle} value={form.contract_type} onChange={set('contract_type')}>
            <option value="lease_out">Lease Out (LO) — Landlord → Tenant</option>
            <option value="lease_in">Lease In (LI) — Tenant from Landlord</option>
          </select>
        </Field>
        <Field label="Business Entity *">
          <select style={inputStyle} value={form.business_entity_id} onChange={set('business_entity_id')}>
            <option value="">— Select —</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
        <Field label="Business Partner (Tenant) *">
          <select style={inputStyle} value={form.business_partner_id} onChange={set('business_partner_id')}>
            <option value="">— Select —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
          </select>
        </Field>
      </div>

      <SectionTitle>Key Dates (time-dependent)</SectionTitle>
      <div style={{ background: '#f0f7ff', borderRadius: 10, padding: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#1565c0', marginBottom: 12 }}>ℹ Any modification to these dates creates a new time slot. The contract cannot be posted until status is Released.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Field label="Start Date *"><input style={inputStyle} type="date" value={form.start_date} onChange={set('start_date')} /></Field>
          <Field label="First End Date"><input style={inputStyle} type="date" value={form.first_end_date} onChange={set('first_end_date')} /></Field>
          <Field label="Probable End Date"><input style={inputStyle} type="date" value={form.probable_end_date} onChange={set('probable_end_date')} /></Field>
          <Field label="Absolute End Date"><input style={inputStyle} type="date" value={form.absolute_end_date} onChange={set('absolute_end_date')} /></Field>
          <Field label="Notice Date"><input style={inputStyle} type="date" value={form.notice_date} onChange={set('notice_date')} /></Field>
          <Field label="Signing Date"><input style={inputStyle} type="date" value={form.signing_date} onChange={set('signing_date')} /></Field>
        </div>
      </div>

      <SectionTitle>Posting Parameters</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Payment Timing">
          <select style={inputStyle} value={form.payment_timing} onChange={set('payment_timing')}>
            <option value="in_advance">In Advance (start of month)</option>
            <option value="in_arrears">In Arrears (end of month)</option>
          </select>
        </Field>
        <Field label="Day Count Method">
          <select style={inputStyle} value={form.day_count_method} onChange={set('day_count_method')}>
            <option value="act_365">Actual / 365</option>
            <option value="30E_360">30E / 360</option>
          </select>
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        {[
          ['pro_rata_enabled', 'Enable pro-rata (partial month)'],
          ['relevant_to_sales', 'Relevant to Sales (sales-based rent)'],
          ['is_multi_object', 'Multi-object contract'],
        ].map(([k, lbl]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form[k]} onChange={set(k)} />
            {lbl}
          </label>
        ))}
      </div>

      <SectionTitle>Rental Objects</SectionTitle>
      {rentalObjects.length === 0 ? (
        <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16 }}>No rental objects available. Create rental objects first.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {rentalObjects.map(ro => (
            <div key={ro.id} onClick={() => toggleObject(ro.id)}
              style={{ padding: '10px 14px', borderRadius: 8, border: `2px solid ${selectedObjects.includes(ro.id) ? 'var(--gold)' : 'var(--border)'}`, background: selectedObjects.includes(ro.id) ? '#fffbf0' : 'white', cursor: 'pointer', fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{ro.code}</div>
              <div style={{ color: 'var(--slate)', fontSize: 11 }}>{ro.usage_type}</div>
            </div>
          ))}
        </div>
      )}

      <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.notes} onChange={set('notes')} /></Field>

      <div style={{ background: '#fff8e1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e65100', marginBottom: 16 }}>
        ⚠ Contract will be created in <strong>Draft</strong> status. No FI postings will be generated until status is changed to Released.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Create Contract</button>
      </div>
    </>
  );
}

function ContractDetail({ contract, onClose, onRelease }) {
  const s = STATUS_COLORS[contract.status] || STATUS_COLORS.draft;
  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <span style={{ background: s.bg, color: s.text, borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{s.label}</span>
        {contract.contract_type === 'lease_out' && <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>LO</span>}
        {contract.relevant_to_sales && <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Sales-Based</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
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
          <div key={label} style={{ fontSize: 14 }}>
            <div style={{ color: 'var(--slate)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 600 }}>{val || '—'}</div>
          </div>
        ))}
      </div>

      {contract.status === 'draft' && (
        <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#2e7d32', marginBottom: 10 }}>✓ Ready to release? Once Released, FI postings will begin generating.</div>
          <button onClick={() => onRelease(contract.id)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2e7d32', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Release Contract</button>
        </div>
      )}
    </>
  );
}

export default function Contracts() {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/contracts'); setContracts(r.data); }
    catch { setContracts([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const release = async (id) => {
    await API.patch(`/commercial/contracts/${id}`, { status: 'released' });
    load(); setSelected(null);
  };

  const filtered = filter === 'all' ? contracts : contracts.filter(c => c.status === filter);

  return (
    <div className="animate-fade">
      <PageHeader title={tc.contractsTitle} sub={tc.contractsSub} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'draft', 'released', 'terminated', 'expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filter === f ? 'var(--ink)' : 'white', color: filter === f ? 'var(--gold)' : 'var(--slate)', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
        <button onClick={() => setModal('new')} style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
          + New Contract
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>Loading…</div>
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
                return (
                  <tr key={c.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontWeight: 700 }}>{c.contract_number || `#${c.id}`}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.business_partner?.company_name || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.business_entity?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}><span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{c.contract_type === 'lease_out' ? 'LO' : 'LI'}</span></td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.start_date || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.absolute_end_date || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}><span style={{ background: s.bg, color: s.text, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{s.label}</span></td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <button onClick={() => setSelected(c)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)' }}>No contracts found.</div>}
        </div>
      )}

      {modal === 'new' && <Modal title="New Contract" onClose={() => setModal(null)} wide><ContractForm onSave={load} onClose={() => setModal(null)} /></Modal>}
      {selected && <Modal title={`Contract ${selected.contract_number || `#${selected.id}`}`} onClose={() => setSelected(null)}><ContractDetail contract={selected} onClose={() => setSelected(null)} onRelease={release} /></Modal>}
    </div>
  );
}
