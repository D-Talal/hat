import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import GeoSelect from '../components/shared/GeoSelect';
import CurrencySelect from '../components/shared/CurrencySelect';
import { SPACE_STATUSES, USAGE_TYPES } from '../data/constants';

const SPACE_STATUS_COLORS = Object.fromEntries(Object.entries(SPACE_STATUSES).map(([k,v]) => [k, {bg: v.bg, text: v.text}]));

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box', outline: 'none' };
const btnPrimary   = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnAdd       = { background: 'var(--ink)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700 };

function Badge({ status }) {
  const c = SPACE_STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#666' };
  return <span style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{status}</span>;
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

// ── LOCAL API HELPERS ──────────────────────────────────────────────────────────
const loc = {
  companyCodes: {
    list:   ()      => API.get('/commercial/company-codes'),
    create: (d)     => API.post('/commercial/company-codes', d),
    update: (id, d) => API.put(`/commercial/company-codes/${id}`, d),
    delete: (id)    => API.delete(`/commercial/company-codes/${id}`),
  },
  businessEntities: {
    list:   ()       => API.get('/commercial/business-entities'),
    create: (d)      => API.post('/commercial/business-entities', d),
    update: (id, d)  => API.put(`/commercial/business-entities/${id}`, d),
    delete: (id)     => API.delete(`/commercial/business-entities/${id}`),
  },
  buildings: {
    list:   (beId)   => API.get(`/commercial/business-entities/${beId}/buildings`),
    create: (beId,d) => API.post(`/commercial/business-entities/${beId}/buildings`, d),
    update: (id, d)  => API.put(`/commercial/buildings/${id}`, d),
    delete: (id)     => API.delete(`/commercial/buildings/${id}`),
  },
  floors: {
    list:   (bId)    => API.get(`/commercial/buildings/${bId}/floors`),
    create: (bId, d) => API.post(`/commercial/buildings/${bId}/floors`, d),
    update: (id, d)  => API.put(`/commercial/floors/${id}`, d),
    delete: (id)     => API.delete(`/commercial/floors/${id}`),
  },
  spaces: {
    list:   (fId)    => API.get(`/commercial/floors/${fId}/spaces`),
    create: (fId, d) => API.post(`/commercial/floors/${fId}/spaces`, d),
    update: (id, d)  => API.put(`/commercial/spaces/${id}`, d),
    delete: (id)     => API.delete(`/commercial/spaces/${id}`),
  },
};


// ── COMPANY CODE FORM ─────────────────────────────────────────────────────────
function CompanyCodeForm({ onSave, onClose, t, initial }) {
  const tc = t.commercial;
  const [form, setForm] = useState({
    code:        initial?.code        || '',
    name:        initial?.name        || '',
    currency:    initial?.currency    || 'USD',
    country:     initial?.country     || '',
    description: initial?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { setError('Code and name are required'); return; }
    setSaving(true); setError('');
    try {
      if (initial) await loc.companyCodes.update(initial.id, form);
      else         await loc.companyCodes.create(form);
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <Field label={tc.companyCode + ' Code *'}><input style={inputStyle} value={form.code} onChange={set('code')} placeholder="e.g. CC01" autoFocus style={{ ...inputStyle, textTransform: 'uppercase' }} /></Field>
        <Field label={tc.companyName || 'Company Name *'}><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
      </div>
      <Field label={tc.currency}>
        <CurrencySelect value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} />
      </Field>
      <Field label={tc.country}><input style={inputStyle} value={form.country} onChange={set('country')} /></Field>
      <Field label={tc.description || 'Description'}><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={set('description')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── BUSINESS ENTITY FORM ──────────────────────────────────────────────────────
function BusinessEntityForm({ onSave, onClose, t, initial, companyCodeId }) {
  const tc = t.commercial;
  const [form, setForm] = useState({
    name: initial?.name || '', legal_name: initial?.legal_name || '',
    tax_id: initial?.tax_id || '', address: initial?.address || '',
    currency: initial?.currency || 'USD',
    company_code_id: initial?.company_code_id || companyCodeId || null,
    continent: initial?.continent || '', country: initial?.country || '', city: initial?.city || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setGeo = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const save = async () => {
    if (!form.name.trim()) { setError(tc.name + ' is required'); return; }
    setSaving(true); setError('');
    try {
      if (initial) { await loc.businessEntities.update(initial.id, form); }
      else { await loc.businessEntities.create(form); }
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
        <GeoSelect
          value={{ continent: form.continent, country: form.country, city: form.city }}
          onChange={setGeo}
        />
      </Field>
      <Field label={tc.address}><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── BUILDING FORM ─────────────────────────────────────────────────────────────
function BuildingForm({ beId, onSave, onClose, t, initial }) {
  const tc = t.commercial;
  const [form, setForm] = useState({
    name: initial?.name || '', address: initial?.address || '',
    city: initial?.city || '', country: initial?.country || '', continent: initial?.continent || '',
    total_area_sqm: initial?.total_area_sqm || '', construction_year: initial?.construction_year || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setGeo = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const save = async () => {
    if (!form.name.trim()) { setError(tc.name + ' is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, total_area_sqm: form.total_area_sqm ? parseFloat(form.total_area_sqm) : null, construction_year: form.construction_year ? parseInt(form.construction_year) : null };
      if (initial) { await loc.buildings.update(initial.id, payload); }
      else { await loc.buildings.create(beId, payload); }
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.name + ' *'}><input style={inputStyle} value={form.name} onChange={set('name')} autoFocus /></Field>
        <Field label={tc.totalArea + ' (m²)'}><input style={inputStyle} type="number" min="0" step="0.01" value={form.total_area_sqm} onChange={set('total_area_sqm')} /></Field>
        <Field label={tc.constructionYear}><input style={inputStyle} type="number" min="1800" max="2100" value={form.construction_year} onChange={set('construction_year')} /></Field>
      </div>
      <Field label={tc.address}><input style={inputStyle} value={form.address} onChange={set('address')} /></Field>
      <Field label="Location">
        <GeoSelect value={{ continent: form.continent, country: form.country, city: form.city }} onChange={setGeo} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── FLOOR FORM ────────────────────────────────────────────────────────────────
function FloorForm({ buildingId, onSave, onClose, t, initial }) {
  const tc = t.commercial;
  const [form, setForm] = useState({ floor_number: initial?.floor_number ?? '', name: initial?.name || '', area_sqm: initial?.area_sqm || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (form.floor_number === '') { setError('Floor number is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, floor_number: parseInt(form.floor_number), area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : null };
      if (initial) { await loc.floors.update(initial.id, payload); }
      else { await loc.floors.create(buildingId, payload); }
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Field label={tc.floorNumber + ' *'}><input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} autoFocus /></Field>
        <Field label={tc.floorName}><input style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label={tc.areaSqm + ' (m²)'}><input style={inputStyle} type="number" min="0" step="0.01" value={form.area_sqm} onChange={set('area_sqm')} /></Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── SPACE FORM ────────────────────────────────────────────────────────────────
function SpaceForm({ floorId, onSave, onClose, t, initial }) {
  const tc = t.commercial;
  const [form, setForm] = useState({ space_code: initial?.space_code || '', description: initial?.description || '', status: initial?.status || 'available' });
  const [area, setArea] = useState({ valid_from: '', area_sqm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.space_code.trim()) { setError('Space code is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, ...(area.valid_from && area.area_sqm ? { initial_measurement: { valid_from: area.valid_from, area_sqm: parseFloat(area.area_sqm) } } : {}) };
      if (initial) { await loc.spaces.update(initial.id, payload); }
      else { await loc.spaces.create(floorId, payload); }
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || t.common.error); }
    finally { setSaving(false); }
  };

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.spaceCode + ' *'}><input style={inputStyle} value={form.space_code} onChange={set('space_code')} placeholder="e.g. A-101" autoFocus /></Field>
        <Field label={tc.status}>
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            {['available','occupied','maintenance','vacant'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label={tc.description}><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 12 }}>{initial ? 'Add New Measurement' : tc.initialMeasurement}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label={tc.validFrom + (initial ? '' : ' *')}><input style={inputStyle} type="date" value={area.valid_from} onChange={e => setArea(a => ({ ...a, valid_from: e.target.value }))} /></Field>
          <Field label={tc.areaSqm + ' (m²)' + (initial ? '' : ' *')}><input style={inputStyle} type="number" min="0" step="0.01" value={area.area_sqm} onChange={e => setArea(a => ({ ...a, area_sqm: e.target.value }))} /></Field>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <button onClick={onClose} style={btnSecondary}>{t.common.cancel}</button>
        <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
      </div>
    </>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Patrimoine() {
  const { t } = useLanguage();
  const tc = t.commercial;

  const [companyCodes, setCompanyCodes]         = useState([]);
  const [selectedCC, setSelectedCC]             = useState(null);
  const [entities, setEntities]                 = useState([]);
  const [selectedBE, setSelectedBE]             = useState(null);
  const [buildings, setBuildings]               = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [floors, setFloors]                     = useState([]);
  const [selectedFloor, setSelectedFloor]       = useState(null);
  const [spaces, setSpaces]                     = useState([]);
  const [modal, setModal]                       = useState(null);
  const [editTarget, setEditTarget]             = useState(null); // { type, item }
  const [loading, setLoading]                   = useState(false);
  const [confirm, setConfirm]                   = useState(null);
  const [apiError, setApiError]                 = useState('');

  const loadCompanyCodes = useCallback(async () => { try { const r = await loc.companyCodes.list(); setCompanyCodes(r.data || []); } catch { setCompanyCodes([]); } }, []);
  const loadEntities  = useCallback(async (ccId) => { setLoading(true); try { const r = await loc.businessEntities.list(); setEntities((r.data || []).filter(e => !ccId || e.company_code_id === ccId)); } catch { setEntities([]); } finally { setLoading(false); } }, []);
  const loadBuildings = useCallback(async (id) => { try { const r = await loc.buildings.list(id); setBuildings(r.data); } catch { setBuildings([]); } }, []);
  const loadFloors    = useCallback(async (id) => { try { const r = await loc.floors.list(id); setFloors(r.data); } catch { setFloors([]); } }, []);
  const loadSpaces    = useCallback(async (id) => { try { const r = await loc.spaces.list(id); setSpaces(r.data); } catch { setSpaces([]); } }, []);

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
    } catch (e) {
      setApiError(e.response?.data?.detail || t.common.error);
    }
    setConfirm(null);
  };

  const openEdit = (type, item) => { setEditTarget({ type, item }); setModal('edit'); };
  const resetToCC = () => { setSelectedCC(null); setEntities([]); setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); };

  const cardStyle = (selected) => ({
    padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
    border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
    background: selected ? '#fffbf0' : 'white', transition: 'all .15s',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  });

  const cols = selectedCC ? (selectedBE ? (selectedBuilding ? (selectedFloor ? '180px 1fr 1fr 1fr 2fr' : '180px 1fr 1fr 1fr') : '180px 1fr 1fr') : '180px 1fr') : '280px';

  return (
    <div className="animate-fade">
      <PageHeader title={tc.patrimoineTitle} sub={tc.patrimoineSub} />

      {apiError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          ⚠️ {apiError}
          <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right', color: '#dc2626' }}>×</button>
        </div>
      )}

      {/* Breadcrumb */}
      {selectedBE && (
        <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => { setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>{tc.allEntities}</span>
          {selectedBE && <><span>›</span><span style={{ cursor: 'pointer', color: selectedBuilding ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedBuilding ? 400 : 600 }} onClick={() => { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>{selectedBE.name}</span></>}
          {selectedBuilding && <><span>›</span><span style={{ cursor: 'pointer', color: selectedFloor ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedFloor ? 400 : 600 }} onClick={() => { setSelectedFloor(null); setSpaces([]); }}>{selectedBuilding.name}</span></>}
          {selectedFloor && <><span>›</span><span style={{ color: 'var(--ink)', fontWeight: 600 }}>Floor {selectedFloor.floor_number}</span></>}
        </div>
      )}

      {/* Confirm delete */}
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

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 16 }}>

        {/* ── Company Codes ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.companyCodes || 'Company Codes'}</span>
            <button onClick={() => { setEditTarget(null); setModal('cc'); }} style={btnAdd}>+ {t.common.add}</button>
          </div>
          {companyCodes.map(cc => (
            <div key={cc.id} style={cardStyle(selectedCC?.id === cc.id)} onClick={() => setSelectedCC(cc)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{cc.code}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{cc.name}</div>
                <div style={{ fontSize: 11, color: '#9ea4be', marginTop: 2 }}>{cc.currency}{cc.country ? ` · ${cc.country}` : ''}</div>
              </div>
              <ActionBtns onEdit={() => openEdit('cc', cc)} onDelete={() => setConfirm({ type: 'cc', id: cc.id, label: cc.code })} />
            </div>
          ))}
          {companyCodes.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No company codes yet.</div>}
        </div>

        {/* ── Business Entities ── */}
        {selectedCC && <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.businessEntities}</span>
            <button onClick={() => { setEditTarget(null); setModal('be'); }} style={btnAdd}>+ {t.common.add}</button>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>{t.common.loading}</div>
          : entities.map(be => (
            <div key={be.id} style={cardStyle(selectedBE?.id === be.id)} onClick={() => setSelectedBE(be)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{be.name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{[be.city, be.country].filter(Boolean).join(', ')}{be.currency ? ` · ${be.currency}` : ''}</div>
              </div>
              <ActionBtns onEdit={() => openEdit('be', be)} onDelete={() => setConfirm({ type: 'be', id: be.id, label: be.name })} />
            </div>
          ))}
          {entities.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noEntities}</div>}
        </div>}

        {/* ── Buildings ── */}
        {selectedBE && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.buildings}</span>
              <button onClick={() => { setEditTarget(null); setModal('building'); }} style={btnAdd}>+ {t.common.add}</button>
            </div>
            {buildings.map(b => (
              <div key={b.id} style={cardStyle(selectedBuilding?.id === b.id)} onClick={() => setSelectedBuilding(b)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>
                    {b.total_area_sqm ? `${b.total_area_sqm.toLocaleString()} m²` : '—'}
                    {b.construction_year ? ` · ${b.construction_year}` : ''}
                  </div>
                </div>
                <ActionBtns onEdit={() => openEdit('building', b)} onDelete={() => setConfirm({ type: 'building', id: b.id, label: b.name })} />
              </div>
            ))}
            {buildings.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noBuildings}</div>}
          </div>
        )}

        {/* ── Floors ── */}
        {selectedBuilding && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.floors}</span>
              <button onClick={() => { setEditTarget(null); setModal('floor'); }} style={btnAdd}>+ {t.common.add}</button>
            </div>
            {floors.map(f => (
              <div key={f.id} style={cardStyle(selectedFloor?.id === f.id)} onClick={() => setSelectedFloor(f)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Floor {f.floor_number}{f.name ? ` — ${f.name}` : ''}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 3 }}>{f.area_sqm ? `${f.area_sqm} m²` : '—'}</div>
                </div>
                <ActionBtns onEdit={() => openEdit('floor', f)} onDelete={() => setConfirm({ type: 'floor', id: f.id, label: `Floor ${f.floor_number}` })} />
              </div>
            ))}
            {floors.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noFloors}</div>}
          </div>
        )}

        {/* ── Spaces ── */}
        {selectedFloor && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'DM Serif Display', fontSize: 16 }}>{tc.spaces}</span>
              <button onClick={() => { setEditTarget(null); setModal('space'); }} style={btnAdd}>+ {t.common.add}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {spaces.map(s => (
                <Card key={s.id} style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.space_code}</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Badge status={s.status} />
                      <ActionBtns onEdit={() => openEdit('space', s)} onDelete={() => setConfirm({ type: 'space', id: s.id, label: s.space_code })} />
                    </div>
                  </div>
                  {s.description && <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>{s.description}</div>}
                  {s.current_area_sqm && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: 'var(--ink)' }}>{s.current_area_sqm} m²</div>}
                </Card>
              ))}
            </div>
            {spaces.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{tc.noSpaces}</div>}
          </div>
        )}
      </div>

      {/* ── Create modals ── */}
      {modal === 'be' && !editTarget && (
        <Modal title={tc.newBusinessEntity} onClose={() => setModal(null)}>
          <BusinessEntityForm onSave={() => loadEntities(selectedCC?.id)} onClose={() => setModal(null)} t={t} companyCodeId={selectedCC?.id} />
        </Modal>
      )}
      {modal === 'building' && !editTarget && selectedBE && (
        <Modal title={tc.newBuilding} onClose={() => setModal(null)}>
          <BuildingForm beId={selectedBE.id} onSave={() => loadBuildings(selectedBE.id)} onClose={() => setModal(null)} t={t} />
        </Modal>
      )}
      {modal === 'floor' && !editTarget && selectedBuilding && (
        <Modal title={tc.newFloor} onClose={() => setModal(null)}>
          <FloorForm buildingId={selectedBuilding.id} onSave={() => loadFloors(selectedBuilding.id)} onClose={() => setModal(null)} t={t} />
        </Modal>
      )}
      {modal === 'space' && !editTarget && selectedFloor && (
        <Modal title={tc.newSpace} onClose={() => setModal(null)}>
          <SpaceForm floorId={selectedFloor.id} onSave={() => loadSpaces(selectedFloor.id)} onClose={() => setModal(null)} t={t} />
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
          <BusinessEntityForm initial={editTarget.item} onSave={() => { loadEntities(); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'building' && (
        <Modal title={`Edit — ${editTarget.item.name}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <BuildingForm initial={editTarget.item} beId={selectedBE?.id} onSave={() => { loadBuildings(selectedBE.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'floor' && (
        <Modal title={`Edit — Floor ${editTarget.item.floor_number}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <FloorForm initial={editTarget.item} buildingId={selectedBuilding?.id} onSave={() => { loadFloors(selectedBuilding.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'space' && (
        <Modal title={`Edit — ${editTarget.item.space_code}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <SpaceForm initial={editTarget.item} floorId={selectedFloor?.id} onSave={() => { loadSpaces(selectedFloor.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} />
        </Modal>
      )}
    </div>
  );
}
