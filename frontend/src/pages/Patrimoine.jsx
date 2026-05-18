import API from '../api';
import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card } from '../components/UI';


// ─── Shared helpers ───────────────────────────────────────────────────────────
const SPACE_STATUS_COLORS = {
  available:   { bg: '#e8f5e9', text: '#2e7d32' },
  occupied:    { bg: '#e3f2fd', text: '#1565c0' },
  maintenance: { bg: '#fff8e1', text: '#f57f17' },
  vacant:      { bg: '#fce4ec', text: '#c62828' },
};

function Badge({ status }) {
  const c = SPACE_STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#666' };
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {status}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 22, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
        </div>
        {children}
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

// ─── Mock API calls (replace with real endpoints) ────────────────────────────
const api = {
  businessEntities: {
    list: () => API.get('/commercial/business-entities'),
    create: (d) => API.post('/commercial/business-entities', d),
  },
  buildings: {
    list: (beId) => API.get(`/commercial/business-entities/${beId}/buildings`),
    create: (beId, d) => API.post(`/commercial/business-entities/${beId}/buildings`, d),
  },
  floors: {
    list: (bId) => API.get(`/commercial/buildings/${bId}/floors`),
    create: (bId, d) => API.post(`/commercial/buildings/${bId}/floors`, d),
  },
  spaces: {
    list: (fId) => API.get(`/commercial/floors/${fId}/spaces`),
    create: (fId, d) => API.post(`/commercial/floors/${fId}/spaces`, d),
  },
};

// ─── Forms ────────────────────────────────────────────────────────────────────
function BusinessEntityForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', legal_name: '', tax_id: '', country: '', city: '', continent: '', address: '', currency: 'USD' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => { await api.businessEntities.create(form); onSave(); onClose(); };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Name *"><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label="Legal Name"><input style={inputStyle} value={form.legal_name} onChange={set('legal_name')} /></Field>
        <Field label="Tax ID"><input style={inputStyle} value={form.tax_id} onChange={set('tax_id')} /></Field>
        <Field label="Currency"><select style={inputStyle} value={form.currency} onChange={set('currency')}><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option></select></Field>
        <Field label="Country"><input style={inputStyle} value={form.country} onChange={set('country')} /></Field>
        <Field label="City"><input style={inputStyle} value={form.city} onChange={set('city')} /></Field>
        <Field label="Continent"><select style={inputStyle} value={form.continent} onChange={set('continent')}><option value="">—</option>{['North America','South America','Europe','Africa','Middle East','Asia Pacific'].map(c=><option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Address"><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Create</button>
      </div>
    </>
  );
}

function BuildingForm({ beId, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', address: '', total_area_sqm: '', construction_year: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => { await api.buildings.create(beId, form); onSave(); onClose(); };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Name *"><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label="Total Area (m²)"><input style={inputStyle} type="number" value={form.total_area_sqm} onChange={set('total_area_sqm')} /></Field>
        <Field label="Construction Year"><input style={inputStyle} type="number" value={form.construction_year} onChange={set('construction_year')} /></Field>
      </div>
      <Field label="Address"><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Create</button>
      </div>
    </>
  );
}

function FloorForm({ buildingId, onSave, onClose }) {
  const [form, setForm] = useState({ floor_number: '', name: '', area_sqm: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => { await api.floors.create(buildingId, form); onSave(); onClose(); };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Floor Number *"><input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} /></Field>
        <Field label="Name (e.g. Rez-de-chaussée)"><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label="Area (m²)"><input style={inputStyle} type="number" value={form.area_sqm} onChange={set('area_sqm')} /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Create</button>
      </div>
    </>
  );
}

function SpaceForm({ floorId, onSave, onClose }) {
  const [form, setForm] = useState({ space_code: '', description: '', status: 'available' });
  const [area, setArea] = useState({ valid_from: '', area_sqm: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    await api.spaces.create(floorId, { ...form, initial_measurement: area });
    onSave(); onClose();
  };
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Space Code *"><input style={inputStyle} value={form.space_code} onChange={set('space_code')} placeholder="e.g. A-101" /></Field>
        <Field label="Status"><select style={inputStyle} value={form.status} onChange={set('status')}>{['available','occupied','maintenance','vacant'].map(s=><option key={s}>{s}</option>)}</select></Field>
        <Field label="Description"><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>
      </div>
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12 }}>Initial Measurement (time-dependent)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Valid From *"><input style={inputStyle} type="date" value={area.valid_from} onChange={e => setArea(a => ({ ...a, valid_from: e.target.value }))} /></Field>
          <Field label="Area (m²) *"><input style={inputStyle} type="number" value={area.area_sqm} onChange={e => setArea(a => ({ ...a, area_sqm: e.target.value }))} /></Field>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancel</button>
        <button onClick={save} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>Create</button>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Patrimoine() {
  const [entities, setEntities] = useState([]);
  const [selectedBE, setSelectedBE] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadEntities = useCallback(async () => {
    setLoading(true);
    try { const r = await api.businessEntities.list(); setEntities(r.data); }
    catch { setEntities([]); } finally { setLoading(false); }
  }, []);

  const loadBuildings = useCallback(async (beId) => {
    try { const r = await api.buildings.list(beId); setBuildings(r.data); }
    catch { setBuildings([]); }
  }, []);

  const loadFloors = useCallback(async (bId) => {
    try { const r = await api.floors.list(bId); setFloors(r.data); }
    catch { setFloors([]); }
  }, []);

  const loadSpaces = useCallback(async (fId) => {
    try { const r = await api.spaces.list(fId); setSpaces(r.data); }
    catch { setSpaces([]); }
  }, []);

  useEffect(() => { loadEntities(); }, [loadEntities]);
  useEffect(() => { if (selectedBE) { loadBuildings(selectedBE.id); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } }, [selectedBE, loadBuildings]);
  useEffect(() => { if (selectedBuilding) { loadFloors(selectedBuilding.id); setSelectedFloor(null); setSpaces([]); } }, [selectedBuilding, loadFloors]);
  useEffect(() => { if (selectedFloor) loadSpaces(selectedFloor.id); }, [selectedFloor, loadSpaces]);

  const crumb = [
    selectedBE?.name,
    selectedBuilding?.name,
    selectedFloor ? `Floor ${selectedFloor.floor_number}` : null,
  ].filter(Boolean).join(' › ');

  return (
    <div className="animate-fade">
      <PageHeader title="Patrimoine" sub="Architectural view — Business Entity → Building → Floor → Space" />

      {/* Breadcrumb */}
      {crumb && (
        <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--slate)' }}>
          <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => { setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>All Entities</span>
          {selectedBE && <> › <span style={{ cursor: 'pointer', color: selectedBuilding ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedBuilding ? 400 : 600 }} onClick={() => { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>{selectedBE.name}</span></>}
          {selectedBuilding && <> › <span style={{ cursor: 'pointer', color: selectedFloor ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedFloor ? 400 : 600 }} onClick={() => { setSelectedFloor(null); setSpaces([]); }}>{selectedBuilding.name}</span></>}
          {selectedFloor && <> › <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Floor {selectedFloor.floor_number}</span></>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedBE ? (selectedBuilding ? (selectedFloor ? '1fr 1fr 1fr 2fr' : '1fr 1fr 1fr') : '1fr 1fr') : '1fr', gap: 16 }}>

        {/* Business Entities */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>Business Entities</span>
            <button onClick={() => setModal('be')} style={{ background: 'var(--ink)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700 }}>+ Add</button>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Loading…</div> : entities.map(be => (
            <div key={be.id} onClick={() => setSelectedBE(be)}
              style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', border: `2px solid ${selectedBE?.id === be.id ? 'var(--gold)' : 'var(--border)'}`, background: selectedBE?.id === be.id ? '#fffbf0' : 'white', transition: 'all 0.15s' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{be.name}</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{be.city}, {be.country}</div>
            </div>
          ))}
          {entities.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No business entities yet.</div>}
        </div>

        {/* Buildings */}
        {selectedBE && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>Buildings</span>
              <button onClick={() => setModal('building')} style={{ background: 'var(--ink)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700 }}>+ Add</button>
            </div>
            {buildings.map(b => (
              <div key={b.id} onClick={() => setSelectedBuilding(b)}
                style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', border: `2px solid ${selectedBuilding?.id === b.id ? 'var(--gold)' : 'var(--border)'}`, background: selectedBuilding?.id === b.id ? '#fffbf0' : 'white', transition: 'all 0.15s' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{b.total_area_sqm ? `${b.total_area_sqm.toLocaleString()} m²` : '—'}</div>
              </div>
            ))}
            {buildings.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No buildings.</div>}
          </div>
        )}

        {/* Floors */}
        {selectedBuilding && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>Floors</span>
              <button onClick={() => setModal('floor')} style={{ background: 'var(--ink)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700 }}>+ Add</button>
            </div>
            {floors.map(f => (
              <div key={f.id} onClick={() => setSelectedFloor(f)}
                style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', border: `2px solid ${selectedFloor?.id === f.id ? 'var(--gold)' : 'var(--border)'}`, background: selectedFloor?.id === f.id ? '#fffbf0' : 'white', transition: 'all 0.15s' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Floor {f.floor_number} {f.name ? `— ${f.name}` : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{f.area_sqm ? `${f.area_sqm} m²` : '—'}</div>
              </div>
            ))}
            {floors.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No floors.</div>}
          </div>
        )}

        {/* Spaces */}
        {selectedFloor && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>Spaces</span>
              <button onClick={() => setModal('space')} style={{ background: 'var(--ink)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700 }}>+ Add</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {spaces.map(s => (
                <Card key={s.id} style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.space_code}</div>
                    <Badge status={s.status} />
                  </div>
                  {s.description && <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>{s.description}</div>}
                  {s.current_area_sqm && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--ink)' }}>{s.current_area_sqm} m²</div>}
                </Card>
              ))}
            </div>
            {spaces.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No spaces on this floor.</div>}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'be' && <Modal title="New Business Entity" onClose={() => setModal(null)}><BusinessEntityForm onSave={loadEntities} onClose={() => setModal(null)} /></Modal>}
      {modal === 'building' && selectedBE && <Modal title="New Building" onClose={() => setModal(null)}><BuildingForm beId={selectedBE.id} onSave={() => loadBuildings(selectedBE.id)} onClose={() => setModal(null)} /></Modal>}
      {modal === 'floor' && selectedBuilding && <Modal title="New Floor" onClose={() => setModal(null)}><FloorForm buildingId={selectedBuilding.id} onSave={() => loadFloors(selectedBuilding.id)} onClose={() => setModal(null)} /></Modal>}
      {modal === 'space' && selectedFloor && <Modal title="New Space" onClose={() => setModal(null)}><SpaceForm floorId={selectedFloor.id} onSave={() => loadSpaces(selectedFloor.id)} onClose={() => setModal(null)} /></Modal>}
    </div>
  );
}
