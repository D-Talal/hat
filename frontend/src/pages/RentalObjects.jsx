import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnDanger    = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 };

const STATUS_COLORS = {
  available:   { bg: '#e8f5e9', text: '#2e7d32' },
  occupied:    { bg: '#e3f2fd', text: '#1565c0' },
  maintenance: { bg: '#fff8e1', text: '#f57f17' },
  vacant:      { bg: '#fce4ec', text: '#c62828' },
};

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

function RentalObjectForm({ onSave, onClose, initial }) {
  const [buildings, setBuildings] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [form, setForm] = useState({
    building_id: initial?.building_id || '',
    code: initial?.code || '',
    description: initial?.description || '',
    usage_type: initial?.usage_type || 'retail',
    status: initial?.status || 'available',
    cost_center: initial?.cost_center || '',
    im_key: initial?.im_key || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const isEdit = !!initial?.id;

  useEffect(() => { API.get('/commercial/buildings').then(r => setBuildings(r.data || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (form.building_id && !isEdit) {
      API.get(`/commercial/buildings/${form.building_id}/available-spaces`).then(r => setSpaces(r.data || [])).catch(() => setSpaces([]));
    }
  }, [form.building_id, isEdit]);

  const save = async () => {
    if (isEdit) await API.put(`/commercial/rental-objects/${initial.id}`, { ...form, space_ids: selectedSpaces });
    else await API.post('/commercial/rental-objects', { ...form, space_ids: selectedSpaces });
    onSave(); onClose();
  };

  return (
    <>
      <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1565c0' }}>
        ℹ A Rental Object (Usage View) groups one or more physical Spaces.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label=tc.name + " " + tc.buildings + " *">
          <select style={inputStyle} value={form.building_id} onChange={set('building_id')} disabled={isEdit}>
            <option value="">— Select —</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Code *"><input style={inputStyle} value={form.code} onChange={set('code')} placeholder="e.g. RO-A101" disabled={isEdit} /></Field>
        <Field label=tc.usageType>
          <select style={inputStyle} value={form.usage_type} onChange={set('usage_type')}>
            {['retail','office','storage','restaurant','kiosk','common_area'].map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label=tc.status>
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            {['available','occupied','maintenance','vacant'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label=tc.costCenter><input style={inputStyle} value={form.cost_center} onChange={set('cost_center')} placeholder="e.g. CC-1001" /></Field>
        <Field label=tc.imKey><input style={inputStyle} value={form.im_key} onChange={set('im_key')} placeholder="e.g. ASSET-4200" /></Field>
      </div>
      <Field label=tc.description><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>

      {!isEdit && (
        <>
          <SectionTitle>Assign Physical Spaces</SectionTitle>
          {!form.building_id ? (
            <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16 }}>Select a building first.</div>
          ) : spaces.length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16 }}>No available spaces in this building.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {spaces.map(s => (
                <div key={s.id} onClick={() => setSelectedSpaces(ss => ss.includes(s.id) ? ss.filter(x => x !== s.id) : [...ss, s.id])}
                  style={{ padding: '10px 14px', borderRadius: 8, border: `2px solid ${selectedSpaces.includes(s.id) ? 'var(--gold)' : 'var(--border)'}`, background: selectedSpaces.includes(s.id) ? '#fffbf0' : 'white', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.space_code}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)' }}>{s.current_area_sqm ? `${s.current_area_sqm} m²` : 'No measurement'}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary}>{isEdit ? 'Save Changes' : 'Create'}</button>
      </div>
    </>
  );
}

export default function RentalObjects() {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/rental-objects'); setObjects(r.data || []); }
    catch { setObjects([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/rental-objects/${id}`); load(); setConfirm(null); setModal(null); }
    catch { alert(t.common.deleteFailed); }
  };

  const filtered = filterStatus === 'all' ? objects : objects.filter(o => o.status === filterStatus);
  const stats = { total: objects.length, available: objects.filter(o => o.status === 'available').length, occupied: objects.filter(o => o.status === 'occupied').length, vacant: objects.filter(o => o.status === 'vacant').length };

  return (
    <div className="animate-fade">
      <PageHeader title={tc.rentalObjectsTitle} sub={tc.rentalObjectsSub} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[{ label: 'Total', value: stats.total, color: 'var(--ink)' }, { label: 'Available', value: stats.available, color: '#2e7d32' }, { label: 'Occupied', value: stats.occupied, color: '#1565c0' }, { label: 'Vacant', value: stats.vacant, color: '#c62828' }].map(s => (
          <div key={s.label} style={{ background: s.color, borderRadius: 12, padding: '16px 20px', color: 'white' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'DM Serif Display' }}>{loading ? '…' : s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        {['all','available','occupied','maintenance','vacant'].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filterStatus === f ? 'var(--ink)' : 'white', color: filterStatus === f ? 'var(--gold)' : 'var(--slate)', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
        <button onClick={() => { setSelected(null); setModal('new'); }} style={{ ...btnPrimary, marginLeft: 'auto' }}>+ {tc.newRentalObject}</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>{t.common.loading}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(ro => {
            const sc = STATUS_COLORS[ro.status] || STATUS_COLORS.available;
            return (
              <Card key={ro.id} style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setSelected(ro); setModal('view'); }}>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace' }}>{ro.code}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>{ro.building?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ background: sc.bg, color: sc.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{ro.status}</span>
                    <button onClick={() => { setSelected(ro); setModal('edit'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                    <button onClick={() => setConfirm(ro)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 8, textTransform: 'capitalize' }}>{ro.usage_type}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(ro.spaces || []).map(s => <span key={s.id} style={{ background: '#f5f5f5', borderRadius: 5, padding: '2px 8px', fontSize: 11 }}>{s.space_code}</span>)}
                </div>
                {ro.im_key && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--slate)' }}>IM: {ro.im_key}</div>}
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)' }}>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 22, marginBottom: 8 }}>{tc.noRentalObjects}</div>
          <div style={{ fontSize: 14 }}>{tc.noRentalObjectsDesc}</div>
        </div>
      )}

      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? `Edit — ${selected?.code}` : tc.newRentalObject} onClose={() => setModal(null)}>
          <RentalObjectForm onSave={load} onClose={() => setModal(null)} initial={modal === 'edit' ? selected : null} />
        </Modal>
      )}

      {modal === 'view' && selected && (
        <Modal title={selected.code} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[['Building', selected.building?.name], ['Usage Type', selected.usage_type], ['Status', selected.status], ['Cost Center', selected.cost_center], ['IM Key', selected.im_key]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 600 }}>{val || '—'}</div>
              </div>
            ))}
          </div>
          {(selected.spaces || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 8 }}>Physical Spaces</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selected.spaces.map(s => (
                  <div key={s.id} style={{ background: '#f5f5f5', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>{s.space_code}</div>
                    <div style={{ color: 'var(--slate)', fontSize: 11 }}>{s.current_area_sqm} m²</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setModal('edit')} style={btnPrimary}>✏️ Edit</button>
            <button onClick={() => { setModal(null); setConfirm(selected); }} style={btnDanger}>🗑 Delete</button>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal title=t.common.confirm + " " + t.common.delete onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Delete <strong>{confirm.code}</strong>? {t.common.deleteConfirm}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={btnDanger}>Delete</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>{t.common.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
