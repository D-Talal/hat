import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import CommercialModal from '../components/CommercialModal';

const SPACE_STATUS_COLORS = {
  available:   { bg: '#e8f5e9', text: '#2e7d32' },
  occupied:    { bg: '#e3f2fd', text: '#1565c0' },
  maintenance: { bg: '#fff8e1', text: '#f57f17' },
  vacant:      { bg: '#fce4ec', text: '#c62828' },
};

function Badge({ status }) {
  const c = SPACE_STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#666' };
  return <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{status}</span>;
}


function ConfirmDelete({ label, onConfirm, onCancel, t }) {
  return (
    <div style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
      <div style={{ fontSize: 13, marginBottom: 10, color: '#7f1d1d' }}>
        {t.common.delete} <strong>{label}</strong>? {t.common.deleteConfirm}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}>{t.common.delete}</button>
        <button onClick={onCancel} style={{ padding: '6px 16px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>{t.common.cancel}</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box', outline: 'none' };
const btnPrimary = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnAdd = { background: 'var(--ink)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700 };

function DeleteBtn({ onClick }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 15, padding: '2px 4px', opacity: 0.7 }}>🗑</button>
  );
}

const api = {
  businessEntities: { list: () => API.get('/commercial/business-entities'), create: (d) => API.post('/commercial/business-entities', d), delete: (id) => API.delete(`/commercial/business-entities/${id}`) },
  buildings: { list: (beId) => API.get(`/commercial/business-entities/${beId}/buildings`), create: (beId, d) => API.post(`/commercial/business-entities/${beId}/buildings`, d), delete: (id) => API.delete(`/commercial/buildings/${id}`) },
  floors: { list: (bId) => API.get(`/commercial/buildings/${bId}/floors`), create: (bId, d) => API.post(`/commercial/buildings/${bId}/floors`, d), delete: (id) => API.delete(`/commercial/floors/${id}`) },
  spaces: { list: (fId) => API.get(`/commercial/floors/${fId}/spaces`), create: (fId, d) => API.post(`/commercial/floors/${fId}/spaces`, d), delete: (id) => API.delete(`/commercial/spaces/${id}`) },
};

function BusinessEntityForm({ onSave, onClose, t }) {
  const tc = t.commercial;
  const [form, setForm] = useState({ name: '', legal_name: '', tax_id: '', country: '', city: '', continent: '', address: '', currency: 'USD' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => { await api.businessEntities.create(form); onSave(); onClose(); };
  const continents = ['North America','South America','Europe','Africa','Middle East','Asia Pacific'];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.name + ' *'}><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label={tc.legalName}><input style={inputStyle} value={form.legal_name} onChange={set('legal_name')} /></Field>
        <Field label={tc.taxId}><input style={inputStyle} value={form.tax_id} onChange={set('tax_id')} /></Field>
        <Field label={tc.currency}><select style={inputStyle} value={form.currency} onChange={set('currency')}><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option></select></Field>
        <Field label={tc.country}><input style={inputStyle} value={form.country} onChange={set('country')} /></Field>
        <Field label={tc.city}><input style={inputStyle} value={form.city} onChange={set('city')} /></Field>
        <Field label={tc.continent}><select style={inputStyle} value={form.continent} onChange={set('continent')}><option value="">—</option>{continents.map(c=><option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label={tc.address}><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary}>{t.common.create}</button>
      </div>
    </>
  );
}

function BuildingForm({ beId, onSave, onClose, t }) {
  const tc = t.commercial;
  const [form, setForm] = useState({ name: '', address: '', total_area_sqm: '', construction_year: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => { await api.buildings.create(beId, form); onSave(); onClose(); };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.name + ' *'}><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label={tc.totalArea}><input style={inputStyle} type="number" value={form.total_area_sqm} onChange={set('total_area_sqm')} /></Field>
        <Field label={tc.constructionYear}><input style={inputStyle} type="number" value={form.construction_year} onChange={set('construction_year')} /></Field>
      </div>
      <Field label={tc.address}><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary}>{t.common.create}</button>
      </div>
    </>
  );
}

function FloorForm({ buildingId, onSave, onClose, t }) {
  const tc = t.commercial;
  const [form, setForm] = useState({ floor_number: '', name: '', area_sqm: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => { await api.floors.create(buildingId, form); onSave(); onClose(); };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.floorNumber + ' *'}><input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} /></Field>
        <Field label={tc.floorName}><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label={tc.areaSqm}><input style={inputStyle} type="number" value={form.area_sqm} onChange={set('area_sqm')} /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary}>{t.common.create}</button>
      </div>
    </>
  );
}

function SpaceForm({ floorId, onSave, onClose, t }) {
  const tc = t.commercial;
  const [form, setForm] = useState({ space_code: '', description: '', status: 'available' });
  const [area, setArea] = useState({ valid_from: '', area_sqm: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => { await api.spaces.create(floorId, { ...form, initial_measurement: area }); onSave(); onClose(); };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.spaceCode + ' *'}><input style={inputStyle} value={form.space_code} onChange={set('space_code')} placeholder="e.g. A-101" /></Field>
        <Field label={tc.status}><select style={inputStyle} value={form.status} onChange={set('status')}>{['available','occupied','maintenance','vacant'].map(s=><option key={s}>{s}</option>)}</select></Field>
        <Field label={tc.description}><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>
      </div>
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12 }}>{tc.initialMeasurement}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label={tc.validFrom + ' *'}><input style={inputStyle} type="date" value={area.valid_from} onChange={e => setArea(a => ({ ...a, valid_from: e.target.value }))} /></Field>
          <Field label={tc.areaSqm + ' *'}><input style={inputStyle} type="number" value={area.area_sqm} onChange={e => setArea(a => ({ ...a, area_sqm: e.target.value }))} /></Field>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary}>{t.common.create}</button>
      </div>
    </>
  );
}

export default function Patrimoine() {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [entities, setEntities]                 = useState([]);
  const [selectedBE, setSelectedBE]             = useState(null);
  const [buildings, setBuildings]               = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [floors, setFloors]                     = useState([]);
  const [selectedFloor, setSelectedFloor]       = useState(null);
  const [spaces, setSpaces]                     = useState([]);
  const [modal, setModal]                       = useState(null);
  const [loading, setLoading]                   = useState(false);
  const [confirm, setConfirm]                   = useState(null);

  const loadEntities  = useCallback(async () => { setLoading(true); try { const r = await api.businessEntities.list(); setEntities(r.data); } catch { setEntities([]); } finally { setLoading(false); } }, []);
  const loadBuildings = useCallback(async (id) => { try { const r = await api.buildings.list(id); setBuildings(r.data); } catch { setBuildings([]); } }, []);
  const loadFloors    = useCallback(async (id) => { try { const r = await api.floors.list(id); setFloors(r.data); } catch { setFloors([]); } }, []);
  const loadSpaces    = useCallback(async (id) => { try { const r = await api.spaces.list(id); setSpaces(r.data); } catch { setSpaces([]); } }, []);

  useEffect(() => { loadEntities(); }, [loadEntities]);
  useEffect(() => { if (selectedBE) { loadBuildings(selectedBE.id); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } }, [selectedBE, loadBuildings]);
  useEffect(() => { if (selectedBuilding) { loadFloors(selectedBuilding.id); setSelectedFloor(null); setSpaces([]); } }, [selectedBuilding, loadFloors]);
  useEffect(() => { if (selectedFloor) loadSpaces(selectedFloor.id); }, [selectedFloor, loadSpaces]);

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      if (confirm.type === 'be') { await api.businessEntities.delete(confirm.id); if (selectedBE?.id === confirm.id) { setSelectedBE(null); setBuildings([]); setFloors([]); setSpaces([]); } loadEntities(); }
      else if (confirm.type === 'building') { await api.buildings.delete(confirm.id); if (selectedBuilding?.id === confirm.id) { setSelectedBuilding(null); setFloors([]); setSpaces([]); } loadBuildings(selectedBE.id); }
      else if (confirm.type === 'floor') { await api.floors.delete(confirm.id); if (selectedFloor?.id === confirm.id) { setSelectedFloor(null); setSpaces([]); } loadFloors(selectedBuilding.id); }
      else if (confirm.type === 'space') { await api.spaces.delete(confirm.id); loadSpaces(selectedFloor.id); }
    } catch { alert(t.common.deleteFailed); }
    setConfirm(null);
  };

  const crumb = [selectedBE?.name, selectedBuilding?.name, selectedFloor ? `Floor ${selectedFloor.floor_number}` : null].filter(Boolean).join(' › ');
  const cardStyle = (selected) => ({ padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`, background: selected ? '#fffbf0' : 'white', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
  const cols = selectedBE ? (selectedBuilding ? (selectedFloor ? '1fr 1fr 1fr 2fr' : '1fr 1fr 1fr') : '1fr 1fr') : '1fr';

  return (
    <div className="animate-fade">
      <PageHeader title={tc.patrimoineTitle} sub={tc.patrimoineSub} />
      {crumb && (
        <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--slate)' }}>
          <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => { setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>{tc.allEntities}</span>
          {selectedBE && <> › <span style={{ cursor: 'pointer', color: selectedBuilding ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedBuilding ? 400 : 600 }} onClick={() => { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>{selectedBE.name}</span></>}
          {selectedBuilding && <> › <span style={{ cursor: 'pointer', color: selectedFloor ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedFloor ? 400 : 600 }} onClick={() => { setSelectedFloor(null); setSpaces([]); }}>{selectedBuilding.name}</span></>}
          {selectedFloor && <> › <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Floor {selectedFloor.floor_number}</span></>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 16 }}>

        {/* Business Entities */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.businessEntities}</span>
            <button onClick={() => setModal('be')} style={btnAdd}>+ {t.common.add}</button>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>{t.common.loading}</div> : entities.map(be => (
            <div key={be.id}>
              {confirm?.type === 'be' && confirm.id === be.id && <ConfirmDelete label={be.name} onConfirm={handleDelete} onCancel={() => setConfirm(null)} t={t} />}
              <div style={cardStyle(selectedBE?.id === be.id)} onClick={() => setSelectedBE(be)}>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>{be.name}</div><div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{[be.city, be.country].filter(Boolean).join(', ')}</div></div>
                <DeleteBtn onClick={() => setConfirm({ type: 'be', id: be.id })} />
              </div>
            </div>
          ))}
          {entities.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noEntities}</div>}
        </div>

        {/* Buildings */}
        {selectedBE && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.buildings}</span>
              <button onClick={() => setModal('building')} style={btnAdd}>+ {t.common.add}</button>
            </div>
            {buildings.map(b => (
              <div key={b.id}>
                {confirm?.type === 'building' && confirm.id === b.id && <ConfirmDelete label={b.name} onConfirm={handleDelete} onCancel={() => setConfirm(null)} t={t} />}
                <div style={cardStyle(selectedBuilding?.id === b.id)} onClick={() => setSelectedBuilding(b)}>
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div><div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{b.total_area_sqm ? `${b.total_area_sqm.toLocaleString()} m²` : '—'}</div></div>
                  <DeleteBtn onClick={() => setConfirm({ type: 'building', id: b.id })} />
                </div>
              </div>
            ))}
            {buildings.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noBuildings}</div>}
          </div>
        )}

        {/* Floors */}
        {selectedBuilding && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.floors}</span>
              <button onClick={() => setModal('floor')} style={btnAdd}>+ {t.common.add}</button>
            </div>
            {floors.map(f => (
              <div key={f.id}>
                {confirm?.type === 'floor' && confirm.id === f.id && <ConfirmDelete label={`Floor ${f.floor_number}`} onConfirm={handleDelete} onCancel={() => setConfirm(null)} t={t} />}
                <div style={cardStyle(selectedFloor?.id === f.id)} onClick={() => setSelectedFloor(f)}>
                  <div><div style={{ fontWeight: 700, fontSize: 14 }}>Floor {f.floor_number}{f.name ? ` — ${f.name}` : ''}</div><div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{f.area_sqm ? `${f.area_sqm} m²` : '—'}</div></div>
                  <DeleteBtn onClick={() => setConfirm({ type: 'floor', id: f.id })} />
                </div>
              </div>
            ))}
            {floors.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noFloors}</div>}
          </div>
        )}

        {/* Spaces */}
        {selectedFloor && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.spaces}</span>
              <button onClick={() => setModal('space')} style={btnAdd}>+ {t.common.add}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {spaces.map(s => (
                <div key={s.id}>
                  {confirm?.type === 'space' && confirm.id === s.id && <ConfirmDelete label={s.space_code} onConfirm={handleDelete} onCancel={() => setConfirm(null)} t={t} />}
                  <Card style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{s.space_code}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Badge status={s.status} /><DeleteBtn onClick={() => setConfirm({ type: 'space', id: s.id })} /></div>
                    </div>
                    {s.description && <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>{s.description}</div>}
                    {s.current_area_sqm && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--ink)' }}>{s.current_area_sqm} m²</div>}
                  </Card>
                </div>
              ))}
            </div>
            {spaces.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noSpaces}</div>}
          </div>
        )}
      </div>

      {modal === 'be'       && <CommercialModal title={tc.newBusinessEntity} onClose={() => setModal(null)}><BusinessEntityForm onSave={loadEntities} onClose={() => setModal(null)} t={t} /></CommercialModal>}
      {modal === 'building' && selectedBE      && <CommercialModal title={tc.newBuilding} onClose={() => setModal(null)}><BuildingForm beId={selectedBE.id} onSave={() => loadBuildings(selectedBE.id)} onClose={() => setModal(null)} t={t} /></CommercialModal>}
      {modal === 'floor'    && selectedBuilding && <CommercialModal title={tc.newFloor} onClose={() => setModal(null)}><FloorForm buildingId={selectedBuilding.id} onSave={() => loadFloors(selectedBuilding.id)} onClose={() => setModal(null)} t={t} /></CommercialModal>}
      {modal === 'space'    && selectedFloor    && <CommercialModal title={tc.newSpace} onClose={() => setModal(null)}><SpaceForm floorId={selectedFloor.id} onSave={() => loadSpaces(selectedFloor.id)} onClose={() => setModal(null)} t={t} /></CommercialModal>}
    </div>
  );
}
