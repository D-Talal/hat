import API from '../api';
import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card } from '../components/UI';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL });
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };

const CHARGE_CATEGORIES = ['general', 'utilities', 'waste', 'parking', 'security', 'marketing', 'insurance'];
const MARKUP_RATES = [
  { value: 0, label: '0%' },
  { value: 0.05, label: '5%' },
  { value: 0.13, label: '13%' },
  { value: 0.15, label: '15%' },
];

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: wide ? 780 : 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 22, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 20, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function PGForm({ onSave, onClose }) {
  const [buildings, setBuildings] = useState([]);
  const [contractObjects, setContractObjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ building_id: '', code: '', name: '', charge_category: 'general' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    API.get('/commercial/buildings').then(r => setBuildings(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.building_id) {
      API.get(`/commercial/buildings/${form.building_id}/contract-objects`)
        .then(r => setContractObjects(r.data || [])).catch(() => setContractObjects([]));
    }
  }, [form.building_id]);

  const addMember = (co) => {
    if (!members.find(m => m.contract_object_id === co.id)) {
      setMembers(m => [...m, { contract_object_id: co.id, excluded: false, max_cost: '', markup_rate: 0, label: `${co.contract?.contract_number} — ${co.rental_object?.code}` }]);
    }
  };
  const removeMember = id => setMembers(m => m.filter(x => x.contract_object_id !== id));
  const setMember = (id, k, v) => setMembers(m => m.map(x => x.contract_object_id === id ? { ...x, [k]: v } : x));

  const save = async () => {
    await API.post('/commercial/participation-groups', { ...form, members });
    onSave(); onClose();
  };

  return (
    <>
      <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1565c0' }}>
        ℹ Every tenant must belong to at least one Participation Group. Vacant units are never included. Utilities typically have their own separate PG.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Building *">
          <select style={inputStyle} value={form.building_id} onChange={set('building_id')}>
            <option value="">— Select —</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Code *"><input style={inputStyle} value={form.code} onChange={set('code')} placeholder="e.g. PG-GEN-01" /></Field>
        <Field label="Name"><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label="Charge Category">
          <select style={inputStyle} value={form.charge_category} onChange={set('charge_category')}>
            {CHARGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <SectionTitle>Members</SectionTitle>
      {contractObjects.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8 }}>Click to add tenant to group:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {contractObjects.filter(co => !members.find(m => m.contract_object_id === co.id)).map(co => (
              <button key={co.id} onClick={() => addMember(co)}
                style={{ background: '#f5f5f5', border: '1.5px solid var(--border)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>
                + {co.contract?.contract_number} / {co.rental_object?.code}
              </button>
            ))}
          </div>
        </div>
      )}

      {members.map((m, i) => (
        <div key={m.contract_object_id} style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</span>
            <button onClick={() => removeMember(m.contract_object_id)} style={{ background: 'none', border: 'none', color: '#c62828', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Max Cost (cap)">
              <input style={inputStyle} type="number" placeholder="No cap" value={m.max_cost} onChange={e => setMember(m.contract_object_id, 'max_cost', e.target.value)} />
            </Field>
            <Field label="Markup Rate">
              <select style={inputStyle} value={m.markup_rate} onChange={e => setMember(m.contract_object_id, 'markup_rate', e.target.value)}>
                {MARKUP_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Excluded?">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, paddingTop: 10 }}>
                <input type="checkbox" checked={m.excluded} onChange={e => setMember(m.contract_object_id, 'excluded', e.target.checked)} />
                Exclude from SCS
              </label>
            </Field>
          </div>
          {m.max_cost && (
            <div style={{ fontSize: 11, color: '#e65100', background: '#fff3e0', borderRadius: 6, padding: '4px 8px' }}>
              Cap: excess above {Number(m.max_cost).toLocaleString()} distributed to uncapped tenants (MaxCostsSU).
            </div>
          )}
        </div>
      ))}

      {members.length === 0 && <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16 }}>No members added yet.</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Create Group</button>
      </div>
    </>
  );
}

function CostCollectorForm({ pgId, suId, onSave, onClose }) {
  const [form, setForm] = useState({ settlement_unit_id: suId || '', charge_category: 'general', description: '', total_costs: '', ancillary_revenues: '', fiscal_year: new Date().getFullYear() });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const netPool = (Number(form.total_costs) || 0) - (Number(form.ancillary_revenues) || 0);

  const save = async () => {
    await API.post('/commercial/cost-collectors', { ...form, net_pool: netPool });
    onSave(); onClose();
  };

  return (
    <>
      <div style={{ background: '#fff8e1', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e65100' }}>
        ⚠ Cost Collector must be in <strong>Released</strong> status before any charge postings. Once Settled, it rejects new postings.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Charge Category">
          <select style={inputStyle} value={form.charge_category} onChange={set('charge_category')}>
            {CHARGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Fiscal Year"><input style={inputStyle} type="number" value={form.fiscal_year} onChange={set('fiscal_year')} /></Field>
        <Field label="Total Costs"><input style={inputStyle} type="number" value={form.total_costs} onChange={set('total_costs')} /></Field>
        <Field label="Ancillary Revenues (reduces pool)"><input style={inputStyle} type="number" placeholder="e.g. parking income" value={form.ancillary_revenues} onChange={set('ancillary_revenues')} /></Field>
      </div>
      {(form.total_costs || form.ancillary_revenues) && (
        <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
          Net Pool to distribute: <strong>{netPool.toLocaleString()}</strong>
        </div>
      )}
      <Field label="Description"><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Create</button>
      </div>
    </>
  );
}

export default function ServiceCharges() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/participation-groups'); setGroups(r.data || []); }
    catch { setGroups([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const CATEGORY_COLORS = {
    general: { bg: '#e8eaf6', text: '#1a237e' },
    utilities: { bg: '#e1f5fe', text: '#01579b' },
    waste: { bg: '#e8f5e9', text: '#1b5e20' },
    parking: { bg: '#fff3e0', text: '#e65100' },
    security: { bg: '#fce4ec', text: '#c62828' },
    marketing: { bg: '#f3e5f5', text: '#4a148c' },
    insurance: { bg: '#f5f5f5', text: '#212121' },
  };

  return (
    <div className="animate-fade">
      <PageHeader title="Service Charges" sub="Participation Groups, Settlement Units and Cost Collectors" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#1565c0', flex: 1 }}>
          ℹ Vacant units are always excluded from SCS. Ancillary revenues (parking, waste) reduce the pool before distribution — they do not add to landlord revenue.
        </div>
        <button onClick={() => setModal('pg')}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, whiteSpace: 'nowrap' }}>
          + New Group
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>Loading…</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)' }}>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 22, marginBottom: 8 }}>No participation groups</div>
          <div style={{ fontSize: 14 }}>Create a group to start distributing service charges.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {groups.map(pg => {
            const cc = CATEGORY_COLORS[pg.charge_category] || CATEGORY_COLORS.general;
            const activeMem = (pg.members || []).filter(m => !m.excluded);
            const cappedMem = (pg.members || []).filter(m => m.max_cost);
            return (
              <Card key={pg.id} style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => setSelected(pg)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{pg.code}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{pg.building?.name}</div>
                  </div>
                  <span style={{ background: cc.bg, color: cc.text, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{pg.charge_category}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--slate)' }}>
                  <span>{activeMem.length} active member{activeMem.length !== 1 ? 's' : ''}</span>
                  {cappedMem.length > 0 && <span style={{ color: '#e65100' }}>{cappedMem.length} capped</span>}
                  {(pg.members || []).filter(m => m.excluded).length > 0 && <span style={{ color: '#757575' }}>{(pg.members || []).filter(m => m.excluded).length} excluded</span>}
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ background: pg.settlement_units?.length > 0 ? '#e8f5e9' : '#f5f5f5', color: pg.settlement_units?.length > 0 ? '#2e7d32' : '#757575', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {pg.settlement_units?.length || 0} settlement unit{pg.settlement_units?.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <Modal title={`${selected.code} — ${selected.charge_category}`} onClose={() => setSelected(null)} wide>
          <div style={{ marginBottom: 16, fontSize: 14, color: 'var(--slate)' }}>Building: <strong>{selected.building?.name}</strong></div>

          <SectionTitle>Members</SectionTitle>
          {(selected.members || []).length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>No members.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Contract / Object', 'Markup', 'Max Cost', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.members.map(m => (
                  <tr key={m.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{m.contract_object?.contract?.contract_number} / {m.contract_object?.rental_object?.code}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{((m.markup_rate || 0) * 100).toFixed(0)}%</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{m.max_cost ? Number(m.max_cost).toLocaleString() : '—'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ background: m.excluded ? '#fce4ec' : '#e8f5e9', color: m.excluded ? '#c62828' : '#2e7d32', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{m.excluded ? 'Excluded' : 'Active'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <SectionTitle>Cost Collectors</SectionTitle>
          <button onClick={() => setModal({ type: 'cc', pgId: selected.id })}
            style={{ marginBottom: 12, padding: '6px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>
            + Add Cost Collector
          </button>
          {(selected.settlement_units || []).flatMap(su => su.cost_collectors || []).map(cc => (
            <div key={cc.id} style={{ background: cc.status === 'settled' ? '#f5f5f5' : '#e8f5e9', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>{cc.charge_category} — FY{cc.fiscal_year}</span>
                <span style={{ background: cc.status === 'settled' ? '#f5f5f5' : '#e8f5e9', color: cc.status === 'settled' ? '#757575' : '#2e7d32', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{cc.status}</span>
              </div>
              <div style={{ marginTop: 6, color: 'var(--slate)' }}>
                Costs: {Number(cc.total_costs).toLocaleString()} — Revenues: {Number(cc.ancillary_revenues).toLocaleString()} — Net Pool: <strong>{Number(cc.net_pool).toLocaleString()}</strong>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {modal === 'pg' && <Modal title="New Participation Group" onClose={() => setModal(null)} wide><PGForm onSave={load} onClose={() => setModal(null)} /></Modal>}
      {modal?.type === 'cc' && <Modal title="New Cost Collector" onClose={() => setModal(null)}><CostCollectorForm pgId={modal.pgId} onSave={load} onClose={() => setModal(null)} /></Modal>}
    </div>
  );
}
