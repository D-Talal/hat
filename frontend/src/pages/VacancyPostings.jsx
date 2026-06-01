import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function VacancyForm({ onSave, onClose, initial, spaces }) {
  const [form, setForm] = useState({
    space_id: initial?.space_id || '',
    period_from:      initial?.period_from      || '',
    period_to:        initial?.period_to        || '',
    market_rent:      initial?.market_rent      || '',
    cost_center:      initial?.cost_center      || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.space_id || !form.period_from || !form.period_to) { setError('Space and period are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, market_rent: form.market_rent ? parseFloat(form.market_rent) : null };
      if (initial?.id) await API.put(`/commercial/vacancy-postings/${initial.id}`, payload);
      else await API.post('/commercial/vacancy-postings', payload);
      onSave(); onClose();
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(Array.isArray(d) ? d.map(x => x.msg).join(' · ') : d || 'Error');
    } finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <Field label="Rental Object *">
        <select style={inputStyle} value={form.space_id} onChange={set('space_id')}>
          <option value="">— Select —</option>
          {(spaces || []).map(s => <option key={s.id} value={s.id}>{s.space_code} — {s.building_name || ''} Ét.{s.floor_number || ''}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Period From *"><input style={inputStyle} type="date" value={form.period_from} onChange={set('period_from')} /></Field>
        <Field label="Period To *"><input style={inputStyle} type="date" value={form.period_to} onChange={set('period_to')} /></Field>
        <Field label="Market Rent"><input style={inputStyle} type="number" min="0" step="0.01" value={form.market_rent} onChange={set('market_rent')} placeholder="0.00" /></Field>
        <Field label="Cost Center"><input style={inputStyle} value={form.cost_center} onChange={set('cost_center')} placeholder="e.g. CC-001" /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? 'Save' : 'Create')}</button>
      </div>
    </>
  );
}

export default function VacancyPostings() {
  const [items, setItems]             = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [confirm, setConfirm]         = useState(null);
  const [filter, setFilter]           = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, roRes] = await Promise.all([
        API.get('/commercial/vacancy-postings'),
        API.get('/commercial/spaces-leasable'),
      ]);
      setItems(vRes.data || []);
      setSpaces(roRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReverse = async (id) => {
    try { await API.patch(`/commercial/vacancy-postings/${id}/reverse`); load(); }
    catch (e) { alert(e.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/vacancy-postings/${id}`); setConfirm(null); load(); }
    catch (e) { alert(e.response?.data?.detail || 'Error'); setConfirm(null); }
  };

  const filtered = filter === 'all' ? items
    : filter === 'posted' ? items.filter(i => i.posted && !i.reversed)
    : filter === 'reversed' ? items.filter(i => i.reversed)
    : items.filter(i => !i.posted);

  const getStatus = (item) => {
    if (item.reversed) return { label: 'Reversed', bg: '#fce4ec', text: '#c62828' };
    if (item.posted)   return { label: 'Posted',   bg: '#e8f5e9', text: '#2e7d32' };
    return                    { label: 'Draft',    bg: '#fff8e1', text: '#f57f17' };
  };

  return (
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <PageHeader title="Vacancy Postings" sub="Track unoccupied espaces by period" />
        <button style={btnPrimary} onClick={() => { setSelected(null); setModal('form'); }}>+ New Posting</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total postings', value: items.length,                                   color: '#4361ee' },
          { label: 'Posted',         value: items.filter(i => i.posted && !i.reversed).length, color: '#16a34a' },
          { label: 'Draft',          value: items.filter(i => !i.posted).length,            color: '#ea580c' },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{k:'all',l:'All'},{k:'draft',l:'Draft'},{k:'posted',l:'Posted'},{k:'reversed',l:'Reversed'}].map(({k,l}) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: filter === k ? 'var(--ink)' : 'white', color: filter === k ? 'var(--gold)' : 'var(--text)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: filter === k ? 700 : 400 }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>No vacancy postings found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {['Unit','Period From','Period To','Market Rent','Cost Center','Status',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, idx) => {
                const st = getStatus(v);
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{v.space?.space_code || `#${v.space_id}`}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{v.period_from}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{v.period_to}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{v.market_rent ? parseFloat(v.market_rent).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{v.cost_center || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: st.bg, color: st.text, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {v.posted && !v.reversed && (
                          <button onClick={() => handleReverse(v.id)} style={{ padding: '3px 10px', borderRadius: 6, border: '1.5px solid #e65100', background: 'white', color: '#e65100', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>↩ Reverse</button>
                        )}
                        {!v.posted && (
                          <button onClick={() => { setSelected(v); setModal('form'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                        )}
                        <button onClick={() => setConfirm(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
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
        <Modal title={selected ? 'Edit Vacancy Posting' : 'New Vacancy Posting'} onClose={() => setModal(null)}>
          <VacancyForm onSave={() => { load(); setModal(null); }} onClose={() => setModal(null)} initial={selected} spaces={spaces} />
        </Modal>
      )}

      {confirm && (
        <Modal title="Confirm Delete" onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete this vacancy posting for <strong>{confirm.space?.space_code}</strong>?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
