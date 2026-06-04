import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Modal, EmptyState } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { CURRENCIES } from '../data/currencies';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { COMMON_CURRENCIES } from '../data/constants';
import { inputStyle, btnPrimary, btnSecondary } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';


const STATUS = {
  active:   { bg: '#e8f5e9', text: '#2e7d32', label: 'Active' },
  refunded: { bg: '#f5f5f5', text: '#757575', label: 'Refunded' },
  expired:  { bg: '#fff3e0', text: '#e65100', label: 'Expired' },
};


function DepositForm({ onSave, onClose, initial, contracts, partners, existingDeposits = [] }) {
  const [form, setForm] = useState({
    main_contract_id:    initial?.main_contract_id    || '',
    business_partner_id: initial?.business_partner_id || '',
    calc_method:         initial?.calc_method         || 'fixed',
    months_of_rent:      initial?.months_of_rent      || '',
    amount:              initial?.amount              || '',
    currency:            initial?.currency            || 'USD',
    start_date:          initial?.start_date          || '',
    end_date:            initial?.end_date            || '',
    notes:               initial?.notes               || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Check: same contract + same partner combination already exists
  const contractPartnerDup = !initial?.id && form.main_contract_id && form.business_partner_id
    ? existingDeposits.find(d =>
        String(d.main_contract_id) === String(form.main_contract_id) &&
        String(d.business_partner_id) === String(form.business_partner_id)
      )
    : null;

  const save = async () => {
    if (!form.main_contract_id || !form.business_partner_id) { setError('Contract and business partner are required'); return; }
    if (contractPartnerDup) { setError(`Un dépôt existe déjà pour cette combinaison contrat + partenaire (${contractPartnerDup.deposit_number || `#${contractPartnerDup.id}`}).`); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        amount: form.amount ? parseFloat(form.amount) : null,
        months_of_rent: form.months_of_rent ? parseFloat(form.months_of_rent) : null,
      };
      if (initial?.id) await API.put(`/commercial/deposit-contracts/${initial.id}`, payload);
      else await API.post('/commercial/deposit-contracts', payload);
      onSave(); onClose();
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(Array.isArray(d) ? d.map(x => x.msg).join(' · ') : d || 'Error');
    } finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Contract *">
          <select style={inputStyle} value={form.main_contract_id} onChange={set('main_contract_id')}>
            <option value="">— Select —</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.business_partner?.company_name}</option>)}
          </select>
        </Field>
        <Field label="Guarantor *">
          <select style={inputStyle} value={form.business_partner_id} onChange={set('business_partner_id')}>
            <option value="">— Select —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
          </select>
          {contractPartnerDup && (
            <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 7, padding: '7px 12px', fontSize: 12, color: '#92400e', marginTop: 4, display: 'flex', gap: 6 }}>
              ⚠️ Un dépôt existe déjà pour ce contrat + garant.
            </div>
          )}
        </Field>
        <Field label="Calculation Method">
          <select style={inputStyle} value={form.calc_method} onChange={set('calc_method')}>
            <option value="fixed">Fixed Amount</option>
            <option value="months_of_rent">Months of Rent</option>
          </select>
        </Field>
        {form.calc_method === 'months_of_rent' ? (
          <Field label="Months of Rent *">
            <input style={inputStyle} type="number" min="0" max="36" step="0.5" value={form.months_of_rent} onChange={set('months_of_rent')} placeholder="e.g. 3" />
          </Field>
        ) : (
          <Field label="Amount *">
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
          </Field>
        )}
        <Field label="Currency">
          <select style={inputStyle} value={form.currency} onChange={set('currency')}>
            {COMMON_CURRENCIES.map(c => <option key={c}>{c}</option>)}
            {CURRENCIES.filter(c => !COMMON_CURRENCIES.includes(c.code)).map(c => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Start Date"><input style={inputStyle} type="date" value={form.start_date} onChange={set('start_date')} /></Field>
        <Field label="End Date"><input style={inputStyle} type="date" value={form.end_date} onChange={set('end_date')} /></Field>
      </div>
      <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={set('notes')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? 'Save' : 'Create')}</button>
      </div>
    </>
  );
}

export default function DepositContracts() {
  const toast = useToast();
  const { t } = useLanguage();
  const [items, setItems]       = useState([]);
  const [contracts, setContracts] = useState([]);
  const [partners, setPartners]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [filter, setFilter]     = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, cRes, pRes] = await Promise.all([
        API.get('/commercial/deposit-contracts'),
        API.get('/commercial/contracts'),
        API.get('/commercial/business-partners'),
      ]);
      setItems(dRes.data || []);
      setContracts(cRes.data || []);
      setPartners(pRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefund = async (id) => {
    try { await API.patch(`/commercial/deposit-contracts/${id}/refund`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/deposit-contracts/${id}`); setConfirm(null); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); setConfirm(null); }
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const fmtAmt = (a, c) => a ? `${c || 'USD'} ${parseFloat(a).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—';

  const totalActive = items.filter(i => i.status === 'active').reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  return (
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <PageHeader title="Deposit Contracts" sub="Security deposits and guarantees" />
        <button style={btnPrimary} onClick={() => { setSelected(null); setModal('form'); }}>+ New Deposit</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total deposits', value: items.length, color: '#4361ee' },
          { label: 'Active',         value: items.filter(i => i.status === 'active').length, color: '#16a34a' },
          { label: 'Total held',     value: `${fmtAmt(totalActive, items[0]?.currency)}`, color: '#374151' },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all','active','refunded'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: filter === f ? 'var(--ink)' : 'white', color: filter === f ? 'var(--gold)' : 'var(--text)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: filter === f ? 700 : 400, textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : STATUS[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔒"
            title="Aucun dépôt de garantie"
            description="Créez les dépôts de garantie associés à vos contrats de location."
            actionLabel="+ Nouveau dépôt"
            onAction={() => { setSelected(null); setModal('form'); }}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {['N°','Contract','Guarantor','Method','Amount','Period','Status',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((dep, idx) => {
                const st = STATUS[dep.status] || STATUS.active;
                return (
                  <tr key={dep.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--slate)' }}>{dep.deposit_number || `#${dep.id}`}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{dep.main_contract?.contract_number || `#${dep.main_contract_id}`}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{dep.business_partner?.company_name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {dep.calc_method === 'months_of_rent'
                        ? <span style={{ background: '#eef0fd', color: '#4361ee', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{dep.months_of_rent}m rent</span>
                        : <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Fixed</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{fmtAmt(dep.amount, dep.currency)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--slate)' }}>
                      {dep.start_date ? `${dep.start_date} → ${dep.end_date || '…'}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: st.bg, color: st.text, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {dep.status === 'active' && (
                          <button onClick={() => handleRefund(dep.id)}
                            style={{ padding: '3px 10px', borderRadius: 6, border: '1.5px solid #2e7d32', background: 'white', color: '#2e7d32', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                            ✓ Refund
                          </button>
                        )}
                        <button onClick={() => { setSelected(dep); setModal('form'); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                        <button onClick={() => setConfirm(dep)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {modal === 'form' && (
        <Modal title={selected ? `Edit — ${selected.deposit_number}` : 'New Deposit Contract'} onClose={() => setModal(null)}>
          <DepositForm onSave={() => { load(); setModal(null); }} onClose={() => setModal(null)} initial={selected} contracts={contracts} partners={partners} existingDeposits={items} />
        </Modal>
      )}

      {confirm && (
        <Modal title="Confirm Delete" onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete <strong>{confirm.deposit_number}</strong>?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
