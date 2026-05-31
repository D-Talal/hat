import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import GeoSelect from '../components/shared/GeoSelect';
import CurrencySelect from '../components/shared/CurrencySelect';
import { SPACE_STATUSES, USAGE_TYPES } from '../data/constants';

const SPACE_STATUS_COLORS = Object.fromEntries(
  Object.entries(SPACE_STATUSES).map(([k, v]) => [k, { bg: v.bg, text: v.text }])
);

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14,
  boxSizing: 'border-box', outline: 'none',
};
const btnPrimary   = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnAdd       = { background: 'var(--ink)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700 };

function Badge({ status }) {
  const c = SPACE_STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#666' };
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
      {status}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ActionBtns({ onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      <button onClick={e => { e.stopPropagation(); onEdit(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', opacity: 0.7 }}>✏️</button>
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', opacity: 0.7, color: '#dc2626' }}>🗑</button>
    </div>
  );
}

// ── AREA VALIDATION HELPER ──────────────────────────────────────────────────
function AreaWarning({ usedSqm, totalSqm, label }) {
  if (!totalSqm || !usedSqm) return null;
  const pct = (usedSqm / totalSqm) * 100;
  const over = usedSqm > totalSqm;
  return (
    <div style={{
      background: over ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${over ? '#fca5a5' : '#86efac'}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      color: over ? '#dc2626' : '#15803d', marginTop: 8,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {over ? '⚠️' : '✅'}
      {label}: <strong>{usedSqm.toLocaleString()} m²</strong> / {totalSqm.toLocaleString()} m²
      {' '}({pct.toFixed(1)}%){over ? ' — Dépasse la superficie totale!' : ''}
    </div>
  );
}

// ── LOCAL API HELPERS ──────────────────────────────────────────────────────
const loc = {
  companyCodes:     { list: () => API.get('/commercial/company-codes'), create: (d) => API.post('/commercial/company-codes', d), update: (id, d) => API.put(`/commercial/company-codes/${id}`, d), delete: (id) => API.delete(`/commercial/company-codes/${id}`) },
  businessEntities: { list: () => API.get('/commercial/business-entities'), create: (d) => API.post('/commercial/business-entities', d), update: (id, d) => API.put(`/commercial/business-entities/${id}`, d), delete: (id) => API.delete(`/commercial/business-entities/${id}`) },
  buildings:        { list: (beId) => API.get(`/commercial/business-entities/${beId}/buildings`), create: (beId, d) => API.post(`/commercial/business-entities/${beId}/buildings`, d), update: (id, d) => API.put(`/commercial/buildings/${id}`, d), delete: (id) => API.delete(`/commercial/buildings/${id}`) },
  floors:           { list: (bId) => API.get(`/commercial/buildings/${bId}/floors`), create: (bId, d) => API.post(`/commercial/buildings/${bId}/floors`, d), update: (id, d) => API.put(`/commercial/floors/${id}`, d), delete: (id) => API.delete(`/commercial/floors/${id}`) },
  spaces:           { list: (fId) => API.get(`/commercial/floors/${fId}/spaces`), create: (fId, d) => API.post(`/commercial/floors/${fId}/spaces`, d), update: (id, d) => API.put(`/commercial/spaces/${id}`, d), delete: (id) => API.delete(`/commercial/spaces/${id}`) },
};

// ── COMPANY CODE FORM ──────────────────────────────────────────────────────
function CompanyCodeForm({ onSave, onClose, t, initial }) {
  const tc = t.commercial;
  const [form, setForm] = useState({
    code:        initial?.code        || '',
    name:        initial?.name        || '',
    currency:    initial?.currency    || 'USD',
    continent:   initial?.continent   || '',
    country:     initial?.country     || '',
    description: initial?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setGeo = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { setError('Code and name are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { code: form.code, name: form.name, currency: form.currency, country: form.country, description: form.description };
      if (initial) await loc.companyCodes.update(initial.id, payload);
      else         await loc.companyCodes.create(payload);
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <Field label={(tc.companyCode || 'Company Code') + ' *'}>
          <input style={{ ...inputStyle, textTransform: 'uppercase' }} value={form.code} onChange={set('code')} placeholder="e.g. CC01" autoFocus />
        </Field>
        <Field label={(tc.companyName || 'Company Name') + ' *'}>
          <input style={inputStyle} value={form.name} onChange={set('name')} />
        </Field>
      </div>
      <Field label={tc.currency}>
        <CurrencySelect value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} />
      </Field>
      <Field label="Location">
        <GeoSelect
          value={{ continent: form.continent, country: form.country }}
          onChange={setGeo}
          showCity={false}
        />
      </Field>
      <Field label={tc.description || 'Description'}>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={set('description')} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── BUSINESS ENTITY FORM ──────────────────────────────────────────────────
function BusinessEntityForm({ onSave, onClose, t, initial, companyCodeId }) {
  const tc = t.commercial;
  const [form, setForm] = useState({
    name: initial?.name || '', legal_name: initial?.legal_name || '',
    tax_id: initial?.tax_id || '', address: initial?.address || '',
    currency: initial?.currency || 'USD',
    company_code_id: initial?.company_code_id || companyCodeId || null,
    continent: initial?.continent || '', country: initial?.country || '',
    state: initial?.state || '', city: initial?.city || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setGeo = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const save = async () => {
    if (!form.name.trim()) { setError(tc.name + ' is required'); return; }
    setSaving(true); setError('');
    try {
      if (initial) await loc.businessEntities.update(initial.id, form);
      else         await loc.businessEntities.create(form);
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.name + ' *'}><input style={inputStyle} value={form.name} onChange={set('name')} autoFocus /></Field>
        <Field label={tc.legalName}><input style={inputStyle} value={form.legal_name} onChange={set('legal_name')} /></Field>
        <Field label={tc.taxId}><input style={inputStyle} value={form.tax_id} onChange={set('tax_id')} /></Field>
      </div>
      <Field label={tc.currency}>
        <CurrencySelect value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} />
      </Field>
      <Field label="Location">
        <GeoSelect value={{ continent: form.continent, country: form.country, state: form.state, city: form.city }} onChange={setGeo} />
      </Field>
      <Field label={tc.address}><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── BUILDING FORM ─────────────────────────────────────────────────────────
function BuildingForm({ beId, onSave, onClose, t, initial, existingBuildings = [] }) {
  const tc = t.commercial;
  const [form, setForm] = useState({
    name: initial?.name || '', address: initial?.address || '',
    city: initial?.city || '', country: initial?.country || '',
    state: initial?.state || '', continent: initial?.continent || '',
    total_area_sqm: initial?.total_area_sqm || '', construction_year: initial?.construction_year || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setGeo = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const save = async () => {
    if (!form.name.trim()) { setError(tc.name + ' is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, total_area_sqm: form.total_area_sqm ? parseFloat(form.total_area_sqm) : null, construction_year: form.construction_year ? parseInt(form.construction_year) : null };
      if (initial) await loc.buildings.update(initial.id, payload);
      else         await loc.buildings.create(beId, payload);
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.name + ' *'}><input style={inputStyle} value={form.name} onChange={set('name')} autoFocus /></Field>
        <Field label={(tc.totalArea || 'Total Area') + ' (m²)'}><input style={inputStyle} type="number" min="0" step="0.01" value={form.total_area_sqm} onChange={set('total_area_sqm')} /></Field>
        <Field label={tc.constructionYear || 'Construction Year'}><input style={inputStyle} type="number" min="1800" max="2100" value={form.construction_year} onChange={set('construction_year')} /></Field>
      </div>
      <Field label={tc.address || 'Address'}><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <Field label="Location">
        <GeoSelect value={{ continent: form.continent, country: form.country, state: form.state, city: form.city }} onChange={setGeo} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── FLOOR FORM ────────────────────────────────────────────────────────────
function FloorForm({ buildingId, onSave, onClose, t, initial, buildingTotalSqm, existingFloors = [] }) {
  const tc = t.commercial;
  const [form, setForm] = useState({ floor_number: initial?.floor_number ?? '', name: initial?.name || '', area_sqm: initial?.area_sqm || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Sum of all other floors' areas
  const otherFloorsSum = existingFloors
    .filter(f => f.id !== initial?.id)
    .reduce((acc, f) => acc + (parseFloat(f.area_sqm) || 0), 0);
  const currentArea = parseFloat(form.area_sqm) || 0;
  const totalUsed   = otherFloorsSum + currentArea;
  const areaExceeds = buildingTotalSqm && totalUsed > parseFloat(buildingTotalSqm);

  const save = async () => {
    if (form.floor_number === '') { setError('Floor number is required'); return; }
    if (areaExceeds) { setError(`La somme des superficies des étages (${totalUsed.toLocaleString()} m²) dépasse la superficie totale du bâtiment (${parseFloat(buildingTotalSqm).toLocaleString()} m²).`); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, floor_number: parseInt(form.floor_number), area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : null };
      if (initial) await loc.floors.update(initial.id, payload);
      else         await loc.floors.create(buildingId, payload);
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label={(tc.floorNumber || 'Floor #') + ' *'}><input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} autoFocus /></Field>
        <Field label={tc.floorName || 'Name'}><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label={(tc.areaSqm || 'Area') + ' (m²)'}><input style={inputStyle} type="number" min="0" step="0.01" value={form.area_sqm} onChange={set('area_sqm')} /></Field>
      </div>
      {buildingTotalSqm && (
        <AreaWarning
          usedSqm={totalUsed}
          totalSqm={parseFloat(buildingTotalSqm)}
          label="Superficies étages / bâtiment"
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── SPACE FORM ────────────────────────────────────────────────────────────
function SpaceForm({ floorId, onSave, onClose, t, initial, floorAreaSqm, existingSpaces = [] }) {
  const tc = t.commercial;
  const [form, setForm]   = useState({ space_code: initial?.space_code || '', description: initial?.description || '', status: initial?.status || 'available' });
  const [area, setArea]   = useState({ valid_from: '', area_sqm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Sum of existing spaces (excluding current if editing)
  const otherSpacesSum = existingSpaces
    .filter(s => s.id !== initial?.id)
    .reduce((acc, s) => acc + (parseFloat(s.current_area_sqm) || 0), 0);
  const newArea      = parseFloat(area.area_sqm) || (parseFloat(initial?.current_area_sqm) || 0);
  const totalUsed    = otherSpacesSum + newArea;
  const areaExceeds  = floorAreaSqm && newArea && totalUsed > parseFloat(floorAreaSqm);

  const save = async () => {
    if (!form.space_code.trim()) { setError('Space code is required'); return; }
    if (areaExceeds) { setError(`La somme des superficies des espaces (${totalUsed.toLocaleString()} m²) dépasse la superficie de l'étage (${parseFloat(floorAreaSqm).toLocaleString()} m²).`); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, ...(area.valid_from && area.area_sqm ? { initial_measurement: { valid_from: area.valid_from, area_sqm: parseFloat(area.area_sqm) } } : {}) };
      if (initial) await loc.spaces.update(initial.id, payload);
      else         await loc.spaces.create(floorId, payload);
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={(tc.spaceCode || 'Space Code') + ' *'}><input style={inputStyle} value={form.space_code} onChange={set('space_code')} placeholder="e.g. A-101" autoFocus /></Field>
        <Field label={tc.status || 'Status'}>
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            {['available','occupied','maintenance','vacant'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label={tc.description || 'Description'}><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 12 }}>
          {initial ? 'Add New Measurement' : (tc.initialMeasurement || 'Initial Measurement')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label={(tc.validFrom || 'Valid From') + (initial ? '' : ' *')}><input style={inputStyle} type="date" value={area.valid_from} onChange={e => setArea(a => ({ ...a, valid_from: e.target.value }))} /></Field>
          <Field label={(tc.areaSqm || 'Area') + ' (m²)' + (initial ? '' : ' *')}><input style={inputStyle} type="number" min="0" step="0.01" value={area.area_sqm} onChange={e => setArea(a => ({ ...a, area_sqm: e.target.value }))} /></Field>
        </div>
        {floorAreaSqm && (area.area_sqm || initial?.current_area_sqm) && (
          <AreaWarning
            usedSqm={totalUsed}
            totalSqm={parseFloat(floorAreaSqm)}
            label="Superficies espaces / étage"
          />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── STAT PILL ─────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: color || '#f8f9fa', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
      <span>{icon}</span>
      <span style={{ color: 'var(--slate)' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function Patrimoine() {
  const { t } = useLanguage();
  const tc = t.commercial;

  const [companyCodes,     setCompanyCodes]     = useState([]);
  const [selectedCC,       setSelectedCC]       = useState(null);
  const [entities,         setEntities]         = useState([]);
  const [selectedBE,       setSelectedBE]       = useState(null);
  const [buildings,        setBuildings]        = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [floors,           setFloors]           = useState([]);
  const [selectedFloor,    setSelectedFloor]    = useState(null);
  const [spaces,           setSpaces]           = useState([]);
  const [modal,            setModal]            = useState(null);
  const [editTarget,       setEditTarget]       = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [confirm,          setConfirm]          = useState(null);
  const [apiError,         setApiError]         = useState('');

  const loadCompanyCodes = useCallback(async () => { try { const r = await loc.companyCodes.list(); setCompanyCodes(r.data || []); } catch { setCompanyCodes([]); } }, []);
  const loadEntities     = useCallback(async (ccId) => { setLoading(true); try { const r = await loc.businessEntities.list(); setEntities((r.data || []).filter(e => !ccId || e.company_code_id === ccId)); } catch { setEntities([]); } finally { setLoading(false); } }, []);
  const loadBuildings    = useCallback(async (id) => { try { const r = await loc.buildings.list(id); setBuildings(r.data); } catch { setBuildings([]); } }, []);
  const loadFloors       = useCallback(async (id) => { try { const r = await loc.floors.list(id); setFloors(r.data); } catch { setFloors([]); } }, []);
  const loadSpaces       = useCallback(async (id) => { try { const r = await loc.spaces.list(id); setSpaces(r.data); } catch { setSpaces([]); } }, []);

  useEffect(() => { loadCompanyCodes(); }, [loadCompanyCodes]);
  useEffect(() => { if (selectedCC) loadEntities(selectedCC.id); else setEntities([]); }, [selectedCC, loadEntities]);
  useEffect(() => { if (selectedBE) { loadBuildings(selectedBE.id); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } }, [selectedBE, loadBuildings]);
  useEffect(() => { if (selectedBuilding) { loadFloors(selectedBuilding.id); setSelectedFloor(null); setSpaces([]); } }, [selectedBuilding, loadFloors]);
  useEffect(() => { if (selectedFloor) loadSpaces(selectedFloor.id); }, [selectedFloor, loadSpaces]);

  const handleDelete = async () => {
    if (!confirm) return;
    setApiError('');
    try {
      if (confirm.type === 'cc') {
        await loc.companyCodes.delete(confirm.id);
        if (selectedCC?.id === confirm.id) { setSelectedCC(null); setEntities([]); }
        loadCompanyCodes();
      } else if (confirm.type === 'be') {
        await loc.businessEntities.delete(confirm.id);
        if (selectedBE?.id === confirm.id) { setSelectedBE(null); setBuildings([]); setFloors([]); setSpaces([]); }
        loadEntities();
      } else if (confirm.type === 'building') {
        await loc.buildings.delete(confirm.id);
        if (selectedBuilding?.id === confirm.id) { setSelectedBuilding(null); setFloors([]); setSpaces([]); }
        loadBuildings(selectedBE.id);
      } else if (confirm.type === 'floor') {
        await loc.floors.delete(confirm.id);
        if (selectedFloor?.id === confirm.id) { setSelectedFloor(null); setSpaces([]); }
        loadFloors(selectedBuilding.id);
      } else if (confirm.type === 'space') {
        await loc.spaces.delete(confirm.id);
        loadSpaces(selectedFloor.id);
      }
    } catch (e) { setApiError(e.response?.data?.detail || t.common.error); }
    setConfirm(null);
  };

  const openEdit = (type, item) => { setEditTarget({ type, item }); setModal('edit'); };

  // ── CARD STYLES ──
  const panelCard = (selected) => ({
    padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
    border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
    background: selected ? '#fffbf0' : 'white', transition: 'all .15s',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: selected ? '0 2px 8px rgba(212,175,55,.2)' : 'none',
  });

  // ── COMPUTED AREA STATS ──
  const floorsAreaSum  = floors.reduce((acc, f) => acc + (parseFloat(f.area_sqm) || 0), 0);
  const spacesAreaSum  = spaces.reduce((acc, s) => acc + (parseFloat(s.current_area_sqm) || 0), 0);
  const spacesByStatus = spaces.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});

  // ── BREADCRUMB PATH ──
  const breadcrumbs = [
    selectedCC     && { label: selectedCC.code,             onClick: () => { setSelectedCC(null); setEntities([]); setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } },
    selectedBE     && { label: selectedBE.name,             onClick: () => { setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } },
    selectedBuilding && { label: selectedBuilding.name,     onClick: () => { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } },
    selectedFloor  && { label: `Floor ${selectedFloor.floor_number}${selectedFloor.name ? ` — ${selectedFloor.name}` : ''}`, onClick: null },
  ].filter(Boolean);

  // ── DEPTH LEVEL for responsive grid ──
  // Always show: CC panel. Then conditionally: BE, Building, Floors, Spaces
  const depth = [true, !!selectedCC, !!selectedBE, !!selectedBuilding, !!selectedFloor].filter(Boolean).length;
  // Use a side-panel layout: fixed-width left panels + main content area
  const panelW = 220;

  return (
    <div className="animate-fade">
      <PageHeader title={tc.patrimoineTitle || 'Patrimoine'} sub={tc.patrimoineSub || 'Hierarchical property management'} />

      {apiError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          ⚠️ {apiError}
          <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right', color: '#dc2626' }}>×</button>
        </div>
      )}

      {/* ── Breadcrumb trail ── */}
      {breadcrumbs.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--slate)' }}>
          <span style={{ cursor: 'pointer', color: 'var(--slate)' }} onClick={() => { setSelectedCC(null); setEntities([]); setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>
            🏢 All
          </span>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <span style={{ color: '#ccc' }}>›</span>
              <span
                style={{ cursor: b.onClick ? 'pointer' : 'default', color: i === breadcrumbs.length - 1 ? 'var(--ink)' : 'var(--gold)', fontWeight: i === breadcrumbs.length - 1 ? 700 : 400 }}
                onClick={b.onClick || undefined}
              >{b.label}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirm && (
        <div style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, marginBottom: 10, color: '#7f1d1d' }}>
            {t.common.delete} <strong>{confirm.label}</strong>? {t.common.deleteConfirm}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDelete} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}>{t.common.delete}</button>
            <button onClick={() => setConfirm(null)} style={{ padding: '6px 16px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>{t.common.cancel}</button>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT: side panels + content ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Panel 1: Company Codes ── */}
        <div style={{ width: panelW, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 15, color: 'var(--ink)' }}>
              🏦 {tc.companyCodes || 'Company Codes'}
            </div>
            <button onClick={() => { setEditTarget(null); setModal('cc'); }} style={btnAdd}>+</button>
          </div>
          {companyCodes.map(cc => (
            <div key={cc.id} style={panelCard(selectedCC?.id === cc.id)} onClick={() => setSelectedCC(selectedCC?.id === cc.id ? null : cc)}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{cc.code}</div>
                <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cc.name}</div>
                <div style={{ fontSize: 10, color: '#9ea4be', marginTop: 2 }}>
                  {[cc.currency, cc.country].filter(Boolean).join(' · ')}
                </div>
              </div>
              <ActionBtns onEdit={() => openEdit('cc', cc)} onDelete={() => setConfirm({ type: 'cc', id: cc.id, label: cc.code })} />
            </div>
          ))}
          {companyCodes.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)', fontSize: 12 }}>No company codes yet.</div>}
        </div>

        {/* ── Panel 2: Business Entities ── */}
        {selectedCC && (
          <div style={{ width: panelW, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: 15, color: 'var(--ink)' }}>
                🏛 {tc.businessEntities || 'Entities'}
              </div>
              <button onClick={() => { setEditTarget(null); setModal('be'); }} style={btnAdd}>+</button>
            </div>
            {loading
              ? <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 12 }}>{t.common.loading}</div>
              : entities.map(be => (
                  <div key={be.id} style={panelCard(selectedBE?.id === be.id)} onClick={() => setSelectedBE(selectedBE?.id === be.id ? null : be)}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{be.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[be.city, be.state, be.country].filter(Boolean).join(', ')}
                      </div>
                      {be.currency && <div style={{ fontSize: 10, color: '#9ea4be', marginTop: 2 }}>{be.currency}</div>}
                    </div>
                    <ActionBtns onEdit={() => openEdit('be', be)} onDelete={() => setConfirm({ type: 'be', id: be.id, label: be.name })} />
                  </div>
                ))
            }
            {entities.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)', fontSize: 12 }}>{tc.noEntities || 'No entities'}</div>}
          </div>
        )}

        {/* ── Right content area: Buildings + detail ── */}
        {selectedBE && (
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Buildings grid */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: 'DM Serif Display', fontSize: 15 }}>
                  🏗 {tc.buildings || 'Buildings'}
                </div>
                <button onClick={() => { setEditTarget(null); setModal('building'); }} style={btnAdd}>+ {t.common.add}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {buildings.map(b => {
                  const sel = selectedBuilding?.id === b.id;
                  const floorSum = sel ? floorsAreaSum : 0;
                  return (
                    <div key={b.id}
                      onClick={() => setSelectedBuilding(sel ? null : b)}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                        border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                        background: sel ? '#fffbf0' : 'white',
                        boxShadow: sel ? '0 4px 16px rgba(212,175,55,.2)' : '0 1px 4px rgba(0,0,0,.04)',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{b.name}</div>
                        <ActionBtns onEdit={() => openEdit('building', b)} onDelete={() => setConfirm({ type: 'building', id: b.id, label: b.name })} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {b.total_area_sqm && <span>📐 {b.total_area_sqm.toLocaleString()} m² total</span>}
                        {b.construction_year && <span>📅 {b.construction_year}</span>}
                        {[b.city, b.country].filter(Boolean).length > 0 && <span>📍 {[b.city, b.country].filter(Boolean).join(', ')}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {buildings.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noBuildings || 'No buildings'}</div>}
            </div>

            {/* ── Floors + Spaces detail ── */}
            {selectedBuilding && (
              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>

                {/* Floors panel */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontFamily: 'DM Serif Display', fontSize: 15 }}>🏢 {tc.floors || 'Floors'}</div>
                    <button onClick={() => { setEditTarget(null); setModal('floor'); }} style={btnAdd}>+</button>
                  </div>

                  {/* Building area summary */}
                  {selectedBuilding.total_area_sqm && (
                    <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Bâtiment: {selectedBuilding.total_area_sqm.toLocaleString()} m²</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: floorsAreaSum > selectedBuilding.total_area_sqm ? '#dc2626' : 'var(--gold)',
                            width: `${Math.min(100, (floorsAreaSum / selectedBuilding.total_area_sqm) * 100)}%`,
                            transition: 'width .3s',
                          }} />
                        </div>
                        <span style={{ color: floorsAreaSum > selectedBuilding.total_area_sqm ? '#dc2626' : 'var(--slate)', whiteSpace: 'nowrap' }}>
                          {floorsAreaSum.toLocaleString()} / {selectedBuilding.total_area_sqm.toLocaleString()} m²
                        </span>
                      </div>
                      {floorsAreaSum > selectedBuilding.total_area_sqm && (
                        <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>⚠️ Superficie dépassée!</div>
                      )}
                    </div>
                  )}

                  {floors.map(f => (
                    <div key={f.id} style={panelCard(selectedFloor?.id === f.id)} onClick={() => setSelectedFloor(selectedFloor?.id === f.id ? null : f)}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Étage {f.floor_number}{f.name ? ` — ${f.name}` : ''}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{f.area_sqm ? `${f.area_sqm.toLocaleString()} m²` : '—'}</div>
                      </div>
                      <ActionBtns onEdit={() => openEdit('floor', f)} onDelete={() => setConfirm({ type: 'floor', id: f.id, label: `Floor ${f.floor_number}` })} />
                    </div>
                  ))}
                  {floors.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)', fontSize: 12 }}>{tc.noFloors || 'No floors'}</div>}
                </div>

                {/* Spaces panel */}
                {selectedFloor && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'DM Serif Display', fontSize: 15 }}>📦 {tc.spaces || 'Spaces'}</div>
                      <button onClick={() => { setEditTarget(null); setModal('space'); }} style={btnAdd}>+ {t.common.add}</button>
                    </div>

                    {/* Floor area summary + status stats */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      {selectedFloor.area_sqm && (
                        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '8px 12px', fontSize: 12, flex: '1 1 auto' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Étage: {selectedFloor.area_sqm.toLocaleString()} m²</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3,
                                background: spacesAreaSum > selectedFloor.area_sqm ? '#dc2626' : '#22c55e',
                                width: `${Math.min(100, (spacesAreaSum / selectedFloor.area_sqm) * 100)}%`,
                                transition: 'width .3s',
                              }} />
                            </div>
                            <span style={{ color: spacesAreaSum > selectedFloor.area_sqm ? '#dc2626' : 'var(--slate)', whiteSpace: 'nowrap' }}>
                              {spacesAreaSum.toLocaleString()} / {selectedFloor.area_sqm.toLocaleString()} m²
                            </span>
                          </div>
                          {spacesAreaSum > selectedFloor.area_sqm && (
                            <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>⚠️ Superficie dépassée!</div>
                          )}
                        </div>
                      )}
                      {spaces.length > 0 && (
                        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '8px 12px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {Object.entries(spacesByStatus).map(([status, count]) => {
                            const c = SPACE_STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#666' };
                            return <span key={status} style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{count} {status}</span>;
                          })}
                        </div>
                      )}
                    </div>

                    {/* Space cards grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {spaces.map(s => (
                        <Card key={s.id} style={{ padding: '14px 16px', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{s.space_code}</div>
                            <ActionBtns onEdit={() => openEdit('space', s)} onDelete={() => setConfirm({ type: 'space', id: s.id, label: s.space_code })} />
                          </div>
                          <div style={{ marginTop: 6 }}><Badge status={s.status} /></div>
                          {s.description && <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 6 }}>{s.description}</div>}
                          {s.current_area_sqm && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--ink)' }}>📐 {s.current_area_sqm.toLocaleString()} m²</div>}
                        </Card>
                      ))}
                    </div>
                    {spaces.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noSpaces || 'No spaces'}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Placeholder when nothing selected */}
        {!selectedCC && companyCodes.length > 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--slate)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 8 }}>Sélectionnez un Company Code</div>
            <div style={{ fontSize: 13 }}>Cliquez sur un code société pour explorer sa hiérarchie</div>
          </div>
        )}
      </div>

      {/* ── Create modals ── */}
      {modal === 'cc' && !editTarget && (
        <Modal title={tc.newCompanyCode || 'New Company Code'} onClose={() => setModal(null)}>
          <CompanyCodeForm onSave={() => { loadCompanyCodes(); setModal(null); }} onClose={() => setModal(null)} t={t} />
        </Modal>
      )}
      {modal === 'be' && !editTarget && (
        <Modal title={tc.newBusinessEntity || 'New Business Entity'} onClose={() => setModal(null)}>
          <BusinessEntityForm onSave={() => loadEntities(selectedCC?.id)} onClose={() => setModal(null)} t={t} companyCodeId={selectedCC?.id} />
        </Modal>
      )}
      {modal === 'building' && !editTarget && selectedBE && (
        <Modal title={tc.newBuilding || 'New Building'} onClose={() => setModal(null)}>
          <BuildingForm beId={selectedBE.id} onSave={() => loadBuildings(selectedBE.id)} onClose={() => setModal(null)} t={t} />
        </Modal>
      )}
      {modal === 'floor' && !editTarget && selectedBuilding && (
        <Modal title={tc.newFloor || 'New Floor'} onClose={() => setModal(null)}>
          <FloorForm
            buildingId={selectedBuilding.id}
            onSave={() => loadFloors(selectedBuilding.id)}
            onClose={() => setModal(null)}
            t={t}
            buildingTotalSqm={selectedBuilding.total_area_sqm}
            existingFloors={floors}
          />
        </Modal>
      )}
      {modal === 'space' && !editTarget && selectedFloor && (
        <Modal title={tc.newSpace || 'New Space'} onClose={() => setModal(null)}>
          <SpaceForm
            floorId={selectedFloor.id}
            onSave={() => loadSpaces(selectedFloor.id)}
            onClose={() => setModal(null)}
            t={t}
            floorAreaSqm={selectedFloor.area_sqm}
            existingSpaces={spaces}
          />
        </Modal>
      )}

      {/* ── Edit modals ── */}
      {modal === 'edit' && editTarget?.type === 'cc' && (
        <Modal title={`Edit — ${editTarget.item.code}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <CompanyCodeForm initial={editTarget.item} onSave={() => { loadCompanyCodes(); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'be' && (
        <Modal title={`Edit — ${editTarget.item.name}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <BusinessEntityForm initial={editTarget.item} onSave={() => { loadEntities(selectedCC?.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'building' && (
        <Modal title={`Edit — ${editTarget.item.name}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <BuildingForm initial={editTarget.item} beId={selectedBE?.id} onSave={() => { loadBuildings(selectedBE.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'floor' && (
        <Modal title={`Edit — Floor ${editTarget.item.floor_number}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <FloorForm
            initial={editTarget.item}
            buildingId={selectedBuilding?.id}
            onSave={() => { loadFloors(selectedBuilding.id); setModal(null); setEditTarget(null); }}
            onClose={() => { setModal(null); setEditTarget(null); }}
            t={t}
            buildingTotalSqm={selectedBuilding?.total_area_sqm}
            existingFloors={floors}
          />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'space' && (
        <Modal title={`Edit — ${editTarget.item.space_code}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <SpaceForm
            initial={editTarget.item}
            floorId={selectedFloor?.id}
            onSave={() => { loadSpaces(selectedFloor.id); setModal(null); setEditTarget(null); }}
            onClose={() => { setModal(null); setEditTarget(null); }}
            t={t}
            floorAreaSqm={selectedFloor?.area_sqm}
            existingSpaces={spaces}
          />
        </Modal>
      )}
    </div>
  );
}
