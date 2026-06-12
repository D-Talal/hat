import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { inputStyle, btnPrimary, btnSecondary, btnDanger } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';
import { parseApiError } from '../data/apiError';


const CHARGE_CATEGORIES = ['general','utilities','waste','parking','security','marketing','insurance'];
const MARKUP_RATES = [{ value: 0, label: '0%' }, { value: 0.05, label: '5%' }, { value: 0.13, label: '13%' }, { value: 0.15, label: '15%' }];
const CATEGORY_COLORS = {
  general:   { bg: '#e8eaf6', text: '#1a237e' }, utilities: { bg: '#e1f5fe', text: '#01579b' },
  waste:     { bg: '#e8f5e9', text: '#1b5e20' }, parking:   { bg: '#fff3e0', text: '#e65100' },
  security:  { bg: '#fce4ec', text: '#c62828' }, marketing: { bg: '#f3e5f5', text: '#4a148c' },
  insurance: { bg: '#f5f5f5', text: '#212121' },
};

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 20, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function PGForm({ onSave, onClose, initial, existingItems = [] }) {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [buildings, setBuildings] = useState([]);
  const [contractObjects, setContractObjects] = useState([]);
  const [members, setMembers] = useState(initial?.members?.map(m => ({ ...m, label: `Member #${m.contract_object_id}` })) || []);
  const [form, setForm] = useState({
    building_id: initial?.building_id || '',
    code: initial?.code || '',
    name: initial?.name || '',
    charge_category: initial?.charge_category || 'general'
  });
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingItems, {
    fields: ['code', 'name'],
    labels: { code: 'Code', name: 'Nom' },
    editingId: initial?.id,
  });

  useEffect(() => { API.get('/commercial/buildings').then(r => setBuildings(r.data || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (form.building_id) API.get(`/commercial/buildings/${form.building_id}/contract-objects`).then(r => setContractObjects(r.data || [])).catch(() => setContractObjects([]));
  }, [form.building_id]);

  const addMember = co => {
    if (!members.find(m => m.contract_object_id === co.id))
      setMembers(m => [...m, { contract_object_id: co.id, excluded: false, max_cost: '', markup_rate: 0, label: `${co.contract?.contract_number} — ${co.space?.space_code}` }]);
  };
  const setMember = (id, k, v) => setMembers(m => m.map(x => x.contract_object_id === id ? { ...x, [k]: v } : x));

  const save = async () => {
    setError('');
    const dupErr = checkDuplicate(form);
    if (dupErr) { setError(dupErr); return; }
    try {
      if (initial?.id) {
        await API.put(`/commercial/participation-groups/${initial.id}`, { ...form, members });
      } else {
        await API.post('/commercial/participation-groups', { ...form, members });
      }
      onSave(); onClose();
    } catch (e) { setError(parseApiError(e, 'Error')); }
  };

  return (
    <>
      <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1565c0' }}>
        ℹ Every tenant must belong to at least one Participation Group. Vacant units are never included.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.buildings + " *"}>
          <select style={inputStyle} value={form.building_id} onChange={set('building_id')}>
            <option value="">— Select —</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Code *">
          <input style={inputStyle} value={form.code} onChange={set('code')} placeholder="e.g. PG-GEN-01" />
          <DuplicateWarning value={form.code} field="code" />
        </Field>
        <Field label={tc.name}>
          <input style={inputStyle} value={form.name} onChange={set('name')} />
          {form.name && <DuplicateWarning value={form.name} field="name" />}
        </Field>
        <Field label={tc.chargeCategory}>
          <select style={inputStyle} value={form.charge_category} onChange={set('charge_category')}>
            {CHARGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <SectionTitle>Members</SectionTitle>
      {contractObjects.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8 }}>Click to add tenant:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {contractObjects.filter(co => !members.find(m => m.contract_object_id === co.id)).map(co => (
              <button key={co.id} onClick={() => addMember(co)} style={{ background: '#f5f5f5', border: '1.5px solid var(--border)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>
                + {co.contract?.contract_number} / {co.space?.space_code}
              </button>
            ))}
          </div>
        </div>
      )}
      {members.map(m => (
        <div key={m.contract_object_id} style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</span>
            <button onClick={() => setMembers(ms => ms.filter(x => x.contract_object_id !== m.contract_object_id))} style={{ background: 'none', border: 'none', color: '#c62828', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label={tc.maxCost}><input style={inputStyle} type="number" placeholder="No cap" value={m.max_cost} onChange={e => setMember(m.contract_object_id, 'max_cost', e.target.value)} /></Field>
            <Field label="Markup Rate">
              <select style={inputStyle} value={m.markup_rate} onChange={e => setMember(m.contract_object_id, 'markup_rate', e.target.value)}>
                {MARKUP_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Excluded?">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, paddingTop: 10 }}>
                <input type="checkbox" checked={m.excluded} onChange={e => setMember(m.contract_object_id, 'excluded', e.target.checked)} />Exclude
              </label>
            </Field>
          </div>
        </div>
      ))}
      {members.length === 0 && <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16 }}>No members added yet.</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginRight: 'auto' }}>{error}</div>}
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary}>{initial ? 'Save Changes' : 'Create Group'}</button>
      </div>
    </>
  );
}

function CostCollectorForm({ pgId, onSave, onClose, initial }) {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [form, setForm] = useState({
    participation_group_id: pgId,
    charge_category: initial?.charge_category || 'general',
    description: initial?.description || '',
    total_costs: initial?.total_costs || '',
    ancillary_revenues: initial?.ancillary_revenues || '',
    fiscal_year: initial?.fiscal_year || new Date().getFullYear()
  });
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const netPool = (Number(form.total_costs) || 0) - (Number(form.ancillary_revenues) || 0);
  const save = async () => {
    setError('');
    try {
      if (initial?.id) {
        await API.put(`/commercial/cost-collectors/${initial.id}`, { ...form, net_pool: netPool });
      } else {
        await API.post('/commercial/cost-collectors', { ...form, net_pool: netPool });
      }
      onSave(); onClose();
    } catch (e) { setError(parseApiError(e, 'Error')); }
  };
  return (
    <>
      <div style={{ background: '#fff8e1', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e65100' }}>
        ⚠ Cost Collector must be Released before posting. Once Settled, it rejects new postings.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.chargeCategory}>
          <select style={inputStyle} value={form.charge_category} onChange={set('charge_category')}>
            {CHARGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={tc.fiscalYear}><input style={inputStyle} type="number" value={form.fiscal_year} onChange={set('fiscal_year')} /></Field>
        <Field label={tc.totalCosts}><input style={inputStyle} type="number" value={form.total_costs} onChange={set('total_costs')} /></Field>
        <Field label={tc.ancillaryRevenues}><input style={inputStyle} type="number" value={form.ancillary_revenues} onChange={set('ancillary_revenues')} /></Field>
      </div>
      {(form.total_costs || form.ancillary_revenues) && (
        <div style={{ background: '#e8f5e9', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
          Net Pool to distribute: <strong>{netPool.toLocaleString()}</strong>
        </div>
      )}
      <Field label={tc.description}><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginRight: 'auto' }}>{error}</div>}
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary}>{initial ? 'Save Changes' : 'Create'}</button>
      </div>
    </>
  );
}

export default function ServiceCharges() {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/participation-groups'); setGroups(r.data || []); }
    catch { setGroups([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/participation-groups/${id}`); load(); setConfirm(null); setModal(null); }
    catch { toast.error(t.common.deleteFailed); }
  };

  const handleSettle = async (ccId) => {
    try { await API.patch(`/commercial/cost-collectors/${ccId}/settle`); load(); }
    catch { toast.error('Échec de la régularisation.'); }
  };

  return (
    <div className="animate-fade">
      <PageHeader title={tc.serviceChargesTitle} sub={tc.serviceChargesSub} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#1565c0', flex: 1 }}>
          ℹ {tc.scsInfo}
        </div>
        <button onClick={() => setModal('new')} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>{tc.newGroup}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>{t.common.loading}</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)' }}>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 22, marginBottom: 8 }}>{tc.noGroups}</div>
          <div style={{ fontSize: 14 }}>{tc.noGroupsDesc}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {groups.map(pg => {
            const cc = CATEGORY_COLORS[pg.charge_category] || CATEGORY_COLORS.general;
            const activeMembers = (pg.members || []).filter(m => !m.excluded).length;
            const cappedMembers = (pg.members || []).filter(m => m.max_cost).length;
            return (
              <Card key={pg.id} style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setSelected(pg); setModal('view'); }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{pg.code}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{pg.building?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ background: cc.bg, color: cc.text, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{pg.charge_category}</span>
                    <button onClick={() => { setEditTarget({ type: 'pg', item: pg }); setModal('edit-pg'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                    <button onClick={() => setConfirm(pg)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--slate)', marginBottom: 10 }}>
                  <span>{activeMembers} active member{activeMembers !== 1 ? 's' : ''}</span>
                  {cappedMembers > 0 && <span style={{ color: '#e65100' }}>{cappedMembers} capped</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: (pg.settlement_units?.length > 0) ? '#e8f5e9' : '#f5f5f5', color: (pg.settlement_units?.length > 0) ? '#2e7d32' : '#757575', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    {pg.settlement_units?.length || 0} settlement unit{pg.settlement_units?.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => { setSelected(pg); setModal('cc'); }} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans' }}>
                    + Cost Collector
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New PG */}
      {modal === 'new' && (
        <Modal title="New Participation Group" onClose={() => setModal(null)}>
          <PGForm onSave={load} onClose={() => setModal(null)} existingItems={groups} />
        </Modal>
      )}

      {/* New Cost Collector */}
      {modal === 'cc' && selected && (
        <Modal title={`New Cost Collector — ${selected.code}`} onClose={() => setModal(null)}>
          <CostCollectorForm pgId={selected.id} onSave={load} onClose={() => setModal(null)} />
        </Modal>
      )}

      {/* View PG detail */}
      {modal === 'view' && selected && (
        <Modal title={`${selected.code} — ${selected.charge_category}`} onClose={() => setModal(null)}>
          <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 16 }}>Building: <strong>{selected.building?.name}</strong></div>

          <SectionTitle>Members</SectionTitle>
          {(selected.members || []).length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16 }}>No members.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead><tr>{['Contract / Object', 'Markup', 'Max Cost', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {(selected.members || []).map(m => (
                  <tr key={m.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{m.contract_object?.id || '—'}</td>
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
          <button onClick={() => setModal('cc')} style={{ marginBottom: 12, padding: '6px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans' }}>+ Add Cost Collector</button>
          {(selected.settlement_units || []).flatMap(su => su.cost_collectors || []).map(cc => (
            <div key={cc.id} style={{ background: cc.status === 'settled' ? '#f5f5f5' : '#e8f5e9', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>{cc.charge_category} — FY{cc.fiscal_year}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: cc.status === 'settled' ? '#f5f5f5' : '#e8f5e9', color: cc.status === 'settled' ? '#757575' : '#2e7d32', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{cc.status}</span>
                  {cc.status === 'released' && (
                    <>
                      <button onClick={() => handleSettle(cc.id)} style={{ padding: '3px 10px', borderRadius: 6, border: '1.5px solid #2e7d32', background: 'white', color: '#2e7d32', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700 }}>Settle</button>
                      <button onClick={() => { setEditTarget({ type: 'cc', item: cc }); setModal('edit-cc'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>✏️</button>
                      <button onClick={async () => { if (!window.confirm('Delete this cost collector?')) return; await API.delete(`/commercial/cost-collectors/${cc.id}`); load(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 6, color: 'var(--slate)' }}>
                Costs: {Number(cc.total_costs).toLocaleString()} · Revenues: {Number(cc.ancillary_revenues).toLocaleString()} · Net Pool: <strong>{Number(cc.net_pool).toLocaleString()}</strong>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { setModal(null); setConfirm(selected); }} style={btnDanger}>🗑 Delete Group</button>
          </div>
        </Modal>
      )}

      {/* Edit PG modal */}
      {modal === 'edit-pg' && editTarget?.type === 'pg' && (
        <Modal title={`Edit — ${editTarget.item.code}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <PGForm initial={editTarget.item} onSave={() => { load(); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} existingItems={groups} />
        </Modal>
      )}
      {/* Edit CC modal */}
      {modal === 'edit-cc' && editTarget?.type === 'cc' && (
        <Modal title={`Edit Cost Collector`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <CostCollectorForm initial={editTarget.item} pgId={editTarget.item.settlement_unit?.participation_group_id} onSave={() => { load(); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} />
        </Modal>
      )}

      {confirm && (
        <Modal title={t.common.confirm + " " + t.common.delete} onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete group <strong>{confirm.code}</strong>? {t.common.deleteConfirm}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={btnDanger}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>{t.common.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
