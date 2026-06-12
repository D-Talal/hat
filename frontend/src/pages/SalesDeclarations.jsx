import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Modal, EmptyState } from '../components/UI';
import { inputStyle, btnPrimary, btnSecondary } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';
import { parseApiError } from '../data/apiError';



function SalesDeclarationForm({ onSave, onClose, initial, contracts, salesRules, spaces }) {
  const [form, setForm] = useState({
    contract_id:       initial?.contract_id       || '',
    sales_rule_id:     initial?.sales_rule_id     || '',
    space_id: initial?.space_id || '',
    period_from:       initial?.period_from        || '',
    period_to:         initial?.period_to          || '',
    declared_amount:   initial?.declared_amount    || '',
    sales_category:    initial?.sales_category     || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Filter sales rules by selected contract
  const filteredRules = form.contract_id
    ? salesRules.filter(r => r.condition?.contract_id === parseInt(form.contract_id))
    : salesRules;

  const save = async () => {
    if (!form.contract_id || !form.sales_rule_id || !form.declared_amount || !form.period_from || !form.period_to) {
      setError('Contract, sales rule, amount and period are required'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = { ...form, declared_amount: parseFloat(form.declared_amount), space_id: form.space_id || null };
      if (initial?.id) await API.put(`/commercial/sales-declarations/${initial.id}`, payload);
      else await API.post('/commercial/sales-declarations', payload);
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
          <select style={inputStyle} value={form.contract_id} onChange={set('contract_id')}>
            <option value="">— Select —</option>
            {contracts.filter(c => c.relevant_to_sales).map(c => (
              <option key={c.id} value={c.id}>{c.contract_number} — {c.business_partner?.company_name}</option>
            ))}
          </select>
        </Field>
        <Field label="Sales Rule *">
          <select style={inputStyle} value={form.sales_rule_id} onChange={set('sales_rule_id')}>
            <option value="">— Select —</option>
            {filteredRules.map(r => <option key={r.id} value={r.id}>{r.name || `Rule #${r.id}`} ({r.rate_pct}%)</option>)}
          </select>
        </Field>
        <Field label="Space">
          <select style={inputStyle} value={form.space_id} onChange={set('space_id')}>
            <option value="">— All units —</option>
            {(spaces || []).map(s => <option key={s.id} value={s.id}>{s.space_code} — {s.building_name || ''}</option>)}
          </select>
        </Field>
        <Field label="Sales Category">
          <input style={inputStyle} value={form.sales_category} onChange={set('sales_category')} placeholder="e.g. Apparel, Food & Beverage" />
        </Field>
        <Field label="Period From *"><input style={inputStyle} type="date" value={form.period_from} onChange={set('period_from')} /></Field>
        <Field label="Period To *"><input style={inputStyle} type="date" value={form.period_to} onChange={set('period_to')} /></Field>
      </div>
      <Field label="Declared CA (Turnover) *">
        <input style={inputStyle} type="number" min="0" step="0.01" value={form.declared_amount} onChange={set('declared_amount')} placeholder="0.00" />
      </Field>
      {form.declared_amount && form.sales_rule_id && (() => {
        const rule = salesRules.find(r => r.id === parseInt(form.sales_rule_id));
        if (!rule) return null;
        const calc = parseFloat(form.declared_amount) * (rule.rate_pct || 0) / 100;
        return (
          <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
            Calculated rent: <strong>{calc.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            {rule.min_rent && calc < rule.min_rent && <span style={{ color: '#ea580c' }}> → Min rent applies: {parseFloat(rule.min_rent).toLocaleString()}</span>}
            {rule.max_rent && calc > rule.max_rent && <span style={{ color: '#ea580c' }}> → Max rent applies: {parseFloat(rule.max_rent).toLocaleString()}</span>}
          </div>
        );
      })()}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? 'Save' : 'Submit Declaration')}</button>
      </div>
    </>
  );
}

export default function SalesDeclarations() {
  const toast = useToast();
  const [items, setItems]             = useState([]);
  const [contracts, setContracts]     = useState([]);
  const [salesRules, setSalesRules]   = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [confirm, setConfirm]         = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, cRes, rRes, roRes] = await Promise.all([
        API.get('/commercial/sales-declarations'),
        API.get('/commercial/contracts'),
        API.get('/commercial/sales-rules'),
        API.get('/commercial/spaces-leasable'),
      ]);
      setItems(dRes.data || []);
      setContracts(cRes.data || []);
      setSalesRules(rRes.data || []);
      setSpaces(roRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/sales-declarations/${id}`); setConfirm(null); load(); }
    catch (e) { toast.error(parseApiError(e, 'Erreur')); setConfirm(null); }
  };

  const totalDeclared   = items.reduce((s, i) => s + parseFloat(i.declared_amount || 0), 0);
  const totalCalculated = items.reduce((s, i) => s + parseFloat(i.calculated_rent || 0), 0);

  return (
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <PageHeader title="Sales Declarations" sub="Tenant turnover declarations and rent calculation" />
        <button style={btnPrimary} onClick={() => { setSelected(null); setModal('form'); }}>+ New Declaration</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total declarations', value: items.length,                          color: '#4361ee' },
          { label: 'Posted',             value: items.filter(i => i.posted).length,    color: '#16a34a' },
          { label: 'Total declared CA',  value: totalDeclared.toLocaleString(undefined, { minimumFractionDigits: 0 }), color: '#374151' },
          { label: 'Total calculated rent', value: totalCalculated.toLocaleString(undefined, { minimumFractionDigits: 0 }), color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Aucune déclaration de CA"
            description="Les locataires à loyer variable déclarent ici leur chiffre d'affaires. Créez-en une pour calculer le loyer."
            actionLabel="+ Nouvelle déclaration"
            onAction={() => { setSelected(null); setModal('form'); }}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {['Contract','Period','Category','Declared CA','Calculated Rent','Status',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((decl, idx) => (
                <tr key={decl.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{decl.contract?.contract_number || `#${decl.contract_id}`}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--slate)', fontSize: 12 }}>{decl.period_from} → {decl.period_to}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{decl.sales_category || '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{parseFloat(decl.declared_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#7c3aed' }}>{decl.calculated_rent ? parseFloat(decl.calculated_rent).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {decl.posted
                      ? <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Posted</span>
                      : <span style={{ background: '#fff8e1', color: '#f57f17', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Pending</span>
                    }
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!decl.posted && (
                        <button onClick={() => { setSelected(decl); setModal('form'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                      )}
                      <button onClick={() => setConfirm(decl)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal === 'form' && (
        <Modal title={selected ? 'Edit Declaration' : 'New Sales Declaration'} onClose={() => setModal(null)}>
          <SalesDeclarationForm
            onSave={() => { load(); setModal(null); }}
            onClose={() => setModal(null)}
            initial={selected}
            contracts={contracts}
            salesRules={salesRules}
            spaces={spaces}
          />
        </Modal>
      )}

      {confirm && (
        <Modal title="Confirm Delete" onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete this sales declaration?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
