import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Modal, EmptyState } from '../components/UI';
import { CONDITION_TYPES, FREQUENCIES, PAYMENT_TIMINGS, COMMON_CURRENCIES } from '../data/constants';
import { useLanguage } from '../context/LanguageContext';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { inputStyle, btnPrimary, btnSecondary, btnDanger } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';
import { parseApiError } from '../data/apiError';


// Using shared constants from ../data/constants

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 20, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function ConditionForm({ onSave, onClose, initial, existingItems = [] }) {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [contracts, setContracts] = useState([]);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    contract_id: initial?.contract_id || '',
    condition_type: initial?.condition_type || 'base_rent',
    condition_code: initial?.condition_code || '',
    valid_from: initial?.valid_from || '',
    valid_to: initial?.valid_to || '',
    amount: initial?.amount || '',
    currency: initial?.currency || 'USD',
    frequency: initial?.frequency || 'monthly',
    payment_timing: initial?.payment_timing || 'in_advance',
    ipc_enabled: initial?.ipc_enabled || false,
    ipc_base_index: initial?.ipc_base_index || '',
    ipc_reference_date: initial?.ipc_reference_date || '',
    is_flat_rate: initial?.is_flat_rate || false,
    markup_rate: initial?.markup_rate || '',
    notes: initial?.notes || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // Check condition_code duplicate within the same contract
  const sameContractItems = existingItems.filter(c =>
    String(c.contract_id) === String(form.contract_id || initial?.contract_id)
  );
  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(sameContractItems, {
    fields: ['condition_code'],
    labels: { condition_code: 'Code condition' },
    editingId: initial?.id,
    scope: 'ce contrat',
  });

  useEffect(() => {
    if (!initial?.contract_id) {
      API.get('/commercial/contracts')
        .then(r => {
          // Conditions can be added to draft (before release) or released contracts.
          // Draft is the important case: a contract needs ≥1 condition to be released.
          const eligible = (r.data || []).filter(c => c.status === 'draft' || c.status === 'released');
          setContracts(eligible);
        })
        .catch(() => {});
    }
  }, [initial]);

  // Inherit currency from selected contract's BusinessEntity
  const selectedContract = contracts.find(c => String(c.id) === String(form.contract_id));
  useEffect(() => {
    if (selectedContract?.business_entity?.currency && !form.currency) {
      setForm(f => ({ ...f, currency: selectedContract.business_entity.currency }));
    }
  }, [form.contract_id, selectedContract]);

  const save = async () => {
    setFormError('');
    if (!form.contract_id) { setFormError('Veuillez sélectionner un contrat.'); return; }
    if (!form.valid_from) { setFormError('La date de début (valid from) est obligatoire.'); return; }
    if (form.condition_code.trim()) {
      const dupErr = checkDuplicate(form);
      if (dupErr) { setFormError(dupErr); return; }
    }
    // Strip empty strings so the backend receives null, not "" (avoids 422)
    const payload = {};
    for (const [k, v] of Object.entries(form)) payload[k] = v === '' ? null : v;
    try {
      if (initial?.id) await API.put(`/commercial/conditions/${initial.id}`, payload);
      else await API.post('/commercial/conditions', payload);
      onSave(); onClose();
    } catch (e) { setFormError(parseApiError(e)); }
  };

  const isEdit = !!initial?.id;

  return (
    <>
      {formError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{formError}</div>}
      <SectionTitle>Condition Details</SectionTitle>
      {!isEdit && (
        <Field label="Contract">
          <select style={inputStyle} value={form.contract_id} onChange={set('contract_id')}>
            <option value="">— Select —</option>
            {contracts.map(c => (
              <option key={c.id} value={c.id}>
                {c.contract_number || `#${c.id}`} — {c.business_partner?.company_name || '—'} ({c.status === 'draft' ? 'Brouillon' : 'Actif'})
              </option>
            ))}
          </select>
          {selectedContract && (
            <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selectedContract.business_entity?.name && <span style={{ background: '#e8eaf6', color: '#1a237e', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>🏛 {selectedContract.business_entity.name}</span>}
              {selectedContract.business_entity?.currency && <span style={{ background: '#e8f5e9', color: '#1b5e20', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>💱 {selectedContract.business_entity.currency} ← hérité</span>}
              {selectedContract.business_partner?.company_name && <span style={{ background: '#f5f5f5', color: '#555', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>👤 {selectedContract.business_partner.company_name}</span>}
            </div>
          )}
        </Field>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.conditionType}>
          <select style={inputStyle} value={form.condition_type} onChange={set('condition_type')}>
            {Object.entries(CONDITION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label={tc.conditionCode}>
          <input style={inputStyle} value={form.condition_code} onChange={set('condition_code')} placeholder="e.g. *40, A500" />
          {form.condition_code && form.contract_id && <DuplicateWarning value={form.condition_code} field="condition_code" />}
        </Field>
        <Field label={tc.validFrom + " *"}><input style={inputStyle} type="date" value={form.valid_from} onChange={set('valid_from')} /></Field>
        <Field label={tc.validTo}><input style={inputStyle} type="date" value={form.valid_to} onChange={set('valid_to')} /></Field>
      </div>

      {form.condition_type !== 'markup_fee' && (
        <>
          <SectionTitle>Amount & Schedule</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Field label={tc.amount + " *"}><input style={inputStyle} type="number" value={form.amount} onChange={set('amount')} /></Field>
            <Field label="Currency">
              <select style={inputStyle} value={form.currency} onChange={set('currency')}>
                {COMMON_CURRENCIES.slice(0,8).map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={tc.frequency}>
              <select style={inputStyle} value={form.frequency} onChange={set('frequency')}>
                {Object.entries(FREQUENCIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label={tc.paymentTimingLabel}>
            <select style={inputStyle} value={form.payment_timing} onChange={set('payment_timing')}>
              <option value="in_advance">In Advance</option>
              <option value="in_arrears">In Arrears</option>
            </select>
          </Field>
        </>
      )}

      {form.condition_type === 'markup_fee' && (
        <>
          <SectionTitle>Markup Fee (Statistical)</SectionTitle>
          <Field label={tc.markupRate}>
            <select style={inputStyle} value={form.markup_rate} onChange={set('markup_rate')}>
              <option value="0">0%</option><option value="0.05">5%</option><option value="0.13">13%</option><option value="0.15">15%</option>
            </select>
          </Field>
        </>
      )}

      {['service_charge','advance_payment'].includes(form.condition_type) && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
          <input type="checkbox" checked={form.is_flat_rate} onChange={set('is_flat_rate')} />
          Flat Rate — not reconciled at SCS settlement
        </label>
      )}

      {['base_rent','sales_based'].includes(form.condition_type) && (
        <>
          <SectionTitle>IPC Indexation</SectionTitle>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={form.ipc_enabled} onChange={set('ipc_enabled')} />Enable IPC indexation
          </label>
          {form.ipc_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label={tc.baseIndex}><input style={inputStyle} type="number" value={form.ipc_base_index} onChange={set('ipc_base_index')} /></Field>
              <Field label={tc.referenceDate}><input style={inputStyle} type="date" value={form.ipc_reference_date} onChange={set('ipc_reference_date')} /></Field>
            </div>
          )}
        </>
      )}

      <Field label={tc.notes}><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={set('notes')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary}>{isEdit ? 'Save Changes' : 'Save Condition'}</button>
      </div>
    </>
  );
}

export default function Conditions() {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [conditions, setConditions] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filterContract, setFilterContract] = useState('');
  const [filterType, setFilterType] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cond, cont] = await Promise.all([API.get('/commercial/conditions'), API.get('/commercial/contracts')]);
      setConditions(cond.data || []); setContracts(cont.data || []);
    } catch { setConditions([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/conditions/${id}`); load(); setConfirm(null); setModal(null); }
    catch { toast.error(t.common.deleteFailed); }
  };

  const filtered = conditions
    .filter(c => !filterContract || String(c.contract_id) === filterContract)
    .filter(c => filterType === 'all' || c.condition_type === filterType);

  const isActive = c => !c.valid_to || new Date(c.valid_to) >= new Date();

  return (
    <div className="animate-fade">
      <PageHeader title={tc.conditionsTitle} sub={tc.conditionsSub} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterContract} onChange={e => setFilterContract(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }}>
          <option value="">All Contracts</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number || `#${c.id}`} — {c.business_partner?.company_name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }}>
          <option value="all">All Types</option>
          {Object.entries(CONDITION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => { setSelected(null); setModal('new'); }} style={{ ...btnPrimary, marginLeft: 'auto' }}>+ {tc.newCondition}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>{t.common.loading}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>{['Contract', 'Type', 'Code', 'Amount', 'Frequency', 'Valid From', 'Valid To', 'Status', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const ct = CONDITION_TYPES[c.condition_type] || {};
                const active = isActive(c);
                return (
                  <tr key={c.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 13 }}>{c.contract?.contract_number || `#${c.contract_id}`}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}><span style={{ background: ct.bg, color: ct.color, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{ct.label || c.condition_type}</span></td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--slate)' }}>{c.condition_code || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.condition_type === 'markup_fee' ? `${((c.markup_rate || 0) * 100).toFixed(0)}%` : c.amount ? `${Number(c.amount).toLocaleString()} ${c.currency}` : '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{FREQUENCIES[c.frequency] || c.frequency}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_from || '—'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_to || '∞'}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ background: active ? '#e8f5e9' : '#f5f5f5', color: active ? '#2e7d32' : '#757575', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{active ? 'Active' : 'Expired'}</span>
                        {c.ipc_enabled && <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>IPC</span>}
                        {c.is_flat_rate && <span style={{ background: '#f3e5f5', color: '#6a1b9a', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>FLAT</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { setSelected(c); setModal('edit'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                        <button onClick={() => setConfirm(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon="≡"
              title={tc.noConditions || 'Aucune condition'}
              description="Les conditions définissent les loyers et charges d'un contrat. Ajoutez-en une pour pouvoir activer un contrat."
              actionLabel={`+ ${tc.newCondition}`}
              onAction={() => { setSelected(null); setModal('new'); }}
            />
          )}
        </div>
      )}

      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? `Edit Condition` : tc.newCondition} onClose={() => setModal(null)}>
          <ConditionForm onSave={load} onClose={() => setModal(null)} initial={modal === 'edit' ? selected : null} existingItems={conditions} />
        </Modal>
      )}

      {confirm && (
        <Modal title={t.common.confirm + " " + t.common.delete} onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete this condition? {t.common.deleteConfirm}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={btnDanger}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>{t.common.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
