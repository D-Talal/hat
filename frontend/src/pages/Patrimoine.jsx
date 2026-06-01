import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import GeoSelect from '../components/shared/GeoSelect';
import CurrencySelect from '../components/shared/CurrencySelect';
import { SPACE_STATUSES, USAGE_TYPES } from '../data/constants';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';

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
function CompanyCodeForm({ onSave, onClose, t, initial, existingItems = [] }) {
  const tc = t.commercial;
  const [form, setForm] = useState({
    code:        initial?.code        || '',
    name:        initial?.name        || '',
    currency:    initial?.currency    || 'USD',
    continent:   initial?.continent   || '',
    country:     initial?.country     || '',
    state:       initial?.state       || '',
    description: initial?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setGeo = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingItems, {
    fields: ['code', 'name'],
    labels: { code: 'Code', name: 'Nom' },
    editingId: initial?.id,
  });

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { setError('Code and name are required'); return; }
    const dupErr = checkDuplicate(form);
    if (dupErr) { setError(dupErr); return; }
    setSaving(true); setError('');
    try {
      const payload = { code: form.code, name: form.name, currency: form.currency, country: form.country, state: form.state, description: form.description };
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
          <DuplicateWarning value={form.code} field="code" />
        </Field>
        <Field label={(tc.companyName || 'Company Name') + ' *'}>
          <input style={inputStyle} value={form.name} onChange={set('name')} />
          <DuplicateWarning value={form.name} field="name" />
        </Field>
      </div>
      <Field label={tc.currency}>
        <CurrencySelect value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} />
      </Field>
      <Field label="Location">
        <GeoSelect
          value={{ continent: form.continent, country: form.country, state: form.state || '' }}
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
function BusinessEntityForm({ onSave, onClose, t, initial, companyCodeId, existingItems = [] }) {
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

  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingItems, {
    fields: ['name'],
    labels: { name: 'Nom' },
    editingId: initial?.id,
    scope: 'ce Company Code',
  });

  const save = async () => {
    if (!form.name.trim()) { setError(tc.name + ' is required'); return; }
    const dupErr = checkDuplicate(form);
    if (dupErr) { setError(dupErr); return; }
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
        <Field label={tc.name + ' *'}>
          <input style={inputStyle} value={form.name} onChange={set('name')} autoFocus />
          <DuplicateWarning value={form.name} field="name" />
        </Field>
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

  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingBuildings, {
    fields: ['name'],
    labels: { name: 'Nom' },
    editingId: initial?.id,
    scope: 'cette entité',
  });

  const save = async () => {
    if (!form.name.trim()) { setError(tc.name + ' is required'); return; }
    const dupErr = checkDuplicate(form);
    if (dupErr) { setError(dupErr); return; }
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
        <Field label={tc.name + ' *'}>
          <input style={inputStyle} value={form.name} onChange={set('name')} autoFocus />
          <DuplicateWarning value={form.name} field="name" />
        </Field>
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

  // Duplicate check on floor_number (must be unique per building)
  const { checkDuplicate: checkDupNum, DuplicateWarning: WarnNum } = useDuplicateCheck(existingFloors, {
    fields: ['floor_number'],
    labels: { floor_number: 'Numéro d\'étage' },
    editingId: initial?.id,
    scope: 'ce bâtiment',
  });
  // Duplicate check on name (optional but warn if same)
  const { DuplicateWarning: WarnName } = useDuplicateCheck(
    existingFloors.filter(f => f.name),
    { fields: ['name'], labels: { name: 'Nom' }, editingId: initial?.id, scope: 'ce bâtiment' }
  );

  // Sum of all other floors' areas
  const otherFloorsSum = existingFloors
    .filter(f => f.id !== initial?.id)
    .reduce((acc, f) => acc + (parseFloat(f.area_sqm) || 0), 0);
  const currentArea = parseFloat(form.area_sqm) || 0;
  const totalUsed   = otherFloorsSum + currentArea;
  const areaExceeds = buildingTotalSqm && totalUsed > parseFloat(buildingTotalSqm);

  const save = async () => {
    if (form.floor_number === '') { setError('Floor number is required'); return; }
    const dupErr = checkDupNum({ floor_number: String(form.floor_number) });
    if (dupErr) { setError(dupErr); return; }
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
        <Field label={(tc.floorNumber || 'Floor #') + ' *'}>
          <input style={inputStyle} type="number" value={form.floor_number} onChange={set('floor_number')} autoFocus />
          <WarnNum value={String(form.floor_number)} field="floor_number" />
        </Field>
        <Field label={tc.floorName || 'Name'}>
          <input style={inputStyle} value={form.name} onChange={set('name')} />
          {form.name && <WarnName value={form.name} field="name" />}
        </Field>
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
  const [area, setArea]   = useState({ valid_from: new Date().toISOString().slice(0, 10), area_sqm: initial?.current_area_sqm || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingSpaces, {
    fields: ['space_code'],
    labels: { space_code: 'Code espace' },
    editingId: initial?.id,
    scope: 'cet étage',
  });

  // Sum of existing spaces (excluding current if editing)
  const otherSpacesSum = existingSpaces
    .filter(s => s.id !== initial?.id)
    .reduce((acc, s) => acc + (parseFloat(s.current_area_sqm) || 0), 0);
  const newArea     = parseFloat(area.area_sqm) || 0;
  const totalUsed   = otherSpacesSum + newArea;
  const areaExceeds = floorAreaSqm && newArea && totalUsed > parseFloat(floorAreaSqm);

  const save = async () => {
    if (!form.space_code.trim()) { setError('Space code is required'); return; }
    const dupErr = checkDuplicate(form);
    if (dupErr) { setError(dupErr); return; }
    if (areaExceeds) { setError(`La somme des superficies des espaces (${totalUsed.toLocaleString()} m²) dépasse la superficie de l'étage (${parseFloat(floorAreaSqm).toLocaleString()} m²).`); return; }
    setSaving(true); setError('');
    try {
      const hasMeasurement = area.area_sqm !== '' && area.area_sqm !== null && area.area_sqm !== undefined && parseFloat(area.area_sqm) > 0;
      const measurementDate = area.valid_from || new Date().toISOString().slice(0, 10);
      const payload = {
        ...form,
        ...(hasMeasurement ? { initial_measurement: { valid_from: measurementDate, area_sqm: parseFloat(area.area_sqm) } } : {}),
      };
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
        <Field label={(tc.spaceCode || 'Space Code') + ' *'}>
          <input style={inputStyle} value={form.space_code} onChange={set('space_code')} placeholder="e.g. A-101" autoFocus />
          <DuplicateWarning value={form.space_code} field="space_code" />
        </Field>
        <Field label={tc.status || 'Status'}>
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            {['available','occupied','maintenance','vacant'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label={tc.description || 'Description'}><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 12 }}>
          {initial ? 'Nouvelle mesure' : 'Superficie'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Superficie (m²)">
            <input style={inputStyle} type="number" min="0" step="0.01" value={area.area_sqm} onChange={e => setArea(a => ({ ...a, area_sqm: e.target.value }))} placeholder="ex: 45.50" />
          </Field>
          <Field label="Date de validité">
            <input style={inputStyle} type="date" value={area.valid_from} onChange={e => setArea(a => ({ ...a, valid_from: e.target.value }))} />
            <div style={{ fontSize: 10, color: 'var(--slate)', marginTop: 3 }}>Laissez vide = aujourd'hui</div>
          </Field>
        </div>
        {floorAreaSqm && newArea > 0 && (
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

  // ── Top-level state ──
  const [companyCodes, setCompanyCodes] = useState([]);
  const [selectedCC,   setSelectedCC]   = useState(null);
  const [modal,        setModal]        = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [confirm,      setConfirm]      = useState(null);
  const [apiError,     setApiError]     = useState('');

  // ── Detail panel state — lives under selected CC, fully reset on CC change ──
  const [entities,         setEntities]         = useState([]);
  const [selectedBE,       setSelectedBE]       = useState(null);
  const [buildings,        setBuildings]        = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [floors,           setFloors]           = useState([]);
  const [selectedFloor,    setSelectedFloor]    = useState(null);
  const [spaces,           setSpaces]           = useState([]);
  const [loadingBE,        setLoadingBE]        = useState(false);

  // ── Loaders ──
  const loadCompanyCodes = useCallback(async () => {
    try { const r = await loc.companyCodes.list(); setCompanyCodes(r.data || []); } catch { setCompanyCodes([]); }
  }, []);

  const loadEntities = useCallback(async (ccId) => {
    setLoadingBE(true);
    try { const r = await loc.businessEntities.list(); setEntities((r.data || []).filter(e => e.company_code_id === ccId)); }
    catch { setEntities([]); }
    finally { setLoadingBE(false); }
  }, []);

  const loadBuildings = useCallback(async (beId) => {
    try { const r = await loc.buildings.list(beId); setBuildings(r.data || []); } catch { setBuildings([]); }
  }, []);

  const loadFloors = useCallback(async (bId) => {
    try { const r = await loc.floors.list(bId); setFloors(r.data || []); } catch { setFloors([]); }
  }, []);

  const loadSpaces = useCallback(async (fId) => {
    try { const r = await loc.spaces.list(fId); setSpaces(r.data || []); } catch { setSpaces([]); }
  }, []);

  useEffect(() => { loadCompanyCodes(); }, [loadCompanyCodes]);

  // ── When CC changes: reset EVERYTHING below ──
  const selectCC = (cc) => {
    if (selectedCC?.id === cc.id) return; // already selected
    setSelectedCC(cc);
    setSelectedBE(null);
    setBuildings([]);
    setSelectedBuilding(null);
    setFloors([]);
    setSelectedFloor(null);
    setSpaces([]);
    setEntities([]);
    loadEntities(cc.id);
  };

  // ── When BE changes: reset buildings and below ──
  const selectBE = (be) => {
    if (selectedBE?.id === be.id) { setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); return; }
    setSelectedBE(be);
    setSelectedBuilding(null);
    setFloors([]);
    setSelectedFloor(null);
    setSpaces([]);
    loadBuildings(be.id);
  };

  // ── When Building changes: reset floors and below ──
  const selectBuilding = (b) => {
    if (selectedBuilding?.id === b.id) { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); return; }
    setSelectedBuilding(b);
    setSelectedFloor(null);
    setSpaces([]);
    loadFloors(b.id);
  };

  // ── When Floor changes: reset spaces ──
  const selectFloor = (f) => {
    if (selectedFloor?.id === f.id) { setSelectedFloor(null); setSpaces([]); return; }
    setSelectedFloor(f);
    loadSpaces(f.id);
  };

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!confirm) return;
    setApiError('');
    try {
      if (confirm.type === 'cc') {
        await loc.companyCodes.delete(confirm.id);
        if (selectedCC?.id === confirm.id) { setSelectedCC(null); setEntities([]); setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }
        loadCompanyCodes();
      } else if (confirm.type === 'be') {
        await loc.businessEntities.delete(confirm.id);
        if (selectedBE?.id === confirm.id) { setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }
        if (selectedCC) loadEntities(selectedCC.id);
      } else if (confirm.type === 'building') {
        await loc.buildings.delete(confirm.id);
        if (selectedBuilding?.id === confirm.id) { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }
        if (selectedBE) loadBuildings(selectedBE.id);
      } else if (confirm.type === 'floor') {
        await loc.floors.delete(confirm.id);
        if (selectedFloor?.id === confirm.id) { setSelectedFloor(null); setSpaces([]); }
        if (selectedBuilding) loadFloors(selectedBuilding.id);
      } else if (confirm.type === 'space') {
        await loc.spaces.delete(confirm.id);
        if (selectedFloor) loadSpaces(selectedFloor.id);
      }
    } catch (e) { setApiError(e.response?.data?.detail || t.common.error); }
    setConfirm(null);
  };

  const openEdit = (type, item) => { setEditTarget({ type, item }); setModal('edit'); };

  // ── Computed stats ──
  const floorsAreaSum  = floors.reduce((acc, f) => acc + (parseFloat(f.area_sqm) || 0), 0);
  const spacesAreaSum  = spaces.reduce((acc, s) => acc + (parseFloat(s.current_area_sqm) || 0), 0);
  const spacesByStatus = spaces.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});

  // ── Styles ──
  const sideItem = (active) => ({
    padding: '10px 14px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
    border: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
    background: active ? '#fffbf0' : 'transparent',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    transition: 'all .12s',
  });

  const panelCard = (active) => ({
    padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
    border: `2px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    background: active ? '#fffbf0' : 'white', transition: 'all .15s',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: active ? '0 2px 8px rgba(212,175,55,.2)' : 'none',
  });

  // ── Determine what the right panel should show ──
  // 4 possible views: empty, entities list, buildings+, floors+spaces
  const view = !selectedCC ? 'empty'
    : !selectedBE ? 'entities'
    : !selectedBuilding ? 'buildings'
    : 'floors';

  return (
    <div className="animate-fade">
      <PageHeader title={tc.patrimoineTitle || 'Patrimoine'} sub={tc.patrimoineSub || 'Gestion hiérarchique du patrimoine'} />

      {apiError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          ⚠️ {apiError}
          <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right', color: '#dc2626' }}>×</button>
        </div>
      )}

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

      {/* ── Breadcrumb ── */}
      {selectedCC && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 13, flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => { setSelectedCC(null); setEntities([]); setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}>
            🏦 Tous
          </span>
          <span style={{ color: '#ccc' }}>›</span>
          <span
            style={{ cursor: selectedBE ? 'pointer' : 'default', color: selectedBE ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedBE ? 400 : 700 }}
            onClick={selectedBE ? () => { setSelectedBE(null); setBuildings([]); setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } : undefined}
          >
            {selectedCC.code} — {selectedCC.name}
          </span>
          {selectedBE && <>
            <span style={{ color: '#ccc' }}>›</span>
            <span
              style={{ cursor: selectedBuilding ? 'pointer' : 'default', color: selectedBuilding ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedBuilding ? 400 : 700 }}
              onClick={selectedBuilding ? () => { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); } : undefined}
            >
              {selectedBE.name}
            </span>
          </>}
          {selectedBuilding && <>
            <span style={{ color: '#ccc' }}>›</span>
            <span
              style={{ cursor: selectedFloor ? 'pointer' : 'default', color: selectedFloor ? 'var(--gold)' : 'var(--ink)', fontWeight: selectedFloor ? 400 : 700 }}
              onClick={selectedFloor ? () => { setSelectedFloor(null); setSpaces([]); } : undefined}
            >
              {selectedBuilding.name}
            </span>
          </>}
          {selectedFloor && <>
            <span style={{ color: '#ccc' }}>›</span>
            <span style={{ color: 'var(--ink)', fontWeight: 700 }}>Étage {selectedFloor.floor_number}{selectedFloor.name ? ` — ${selectedFloor.name}` : ''}</span>
          </>}
        </div>
      )}

      {/* ── MASTER / DETAIL LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 0, minHeight: 500, border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'white' }}>

        {/* ── LEFT SIDEBAR: Company Codes ── */}
        <div style={{ borderRight: '1.5px solid var(--border)', background: '#fafafa', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 14, color: 'var(--ink)' }}>🏦 Company Codes</span>
            <button onClick={() => { setEditTarget(null); setModal('cc'); }} style={btnAdd}>+</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
            {companyCodes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--slate)', fontSize: 12 }}>Aucun code société</div>
            )}
            {companyCodes.map(cc => (
              <div key={cc.id} style={sideItem(selectedCC?.id === cc.id)} onClick={() => selectCC(cc)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{cc.code}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cc.name}</div>
                  {cc.country && <div style={{ fontSize: 10, color: '#9ea4be', marginTop: 1 }}>{cc.country}{cc.state ? `, ${cc.state}` : ''}</div>}
                </div>
                <ActionBtns onEdit={() => openEdit('cc', cc)} onDelete={() => setConfirm({ type: 'cc', id: cc.id, label: cc.code })} />
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL: changes based on selection ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Empty state */}
          {view === 'empty' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', gap: 12 }}>
              <div style={{ fontSize: 52 }}>🏦</div>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: 18 }}>Sélectionnez un Company Code</div>
              <div style={{ fontSize: 13, maxWidth: 280, textAlign: 'center', lineHeight: 1.5 }}>Choisissez un code société dans la liste pour explorer son patrimoine</div>
            </div>
          )}

          {/* ── ENTITIES LIST ── */}
          {view === 'entities' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                <span style={{ fontFamily: 'DM Serif Display', fontSize: 14 }}>🏛 Entités — <span style={{ color: 'var(--gold)' }}>{selectedCC.code}</span></span>
                <button onClick={() => { setEditTarget(null); setModal('be'); }} style={btnAdd}>+ Ajouter</button>
              </div>
              <div style={{ padding: 20 }}>
                {loadingBE && <div style={{ color: 'var(--slate)', fontSize: 13, padding: 20, textAlign: 'center' }}>{t.common.loading}</div>}
                {!loadingBE && entities.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🏛</div>
                    <div style={{ fontFamily: 'DM Serif Display', fontSize: 16, marginBottom: 6 }}>Aucune entité</div>
                    <div style={{ fontSize: 13 }}>Ajoutez une entité à ce code société</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {entities.map(be => (
                    <div key={be.id}
                      onClick={() => selectBE(be)}
                      style={{ padding: '16px 18px', borderRadius: 12, border: '1.5px solid var(--border)', cursor: 'pointer', background: 'white', transition: 'all .15s', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(212,175,55,.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{be.name}</div>
                        <ActionBtns onEdit={() => openEdit('be', be)} onDelete={() => setConfirm({ type: 'be', id: be.id, label: be.name })} />
                      </div>
                      {be.legal_name && <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 4 }}>{be.legal_name}</div>}
                      <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[be.city, be.state, be.country].filter(Boolean).length > 0 && <span>📍 {[be.city, be.state, be.country].filter(Boolean).join(', ')}</span>}
                        {be.currency && <span>💱 {be.currency}</span>}
                        {be.tax_id && <span>🔢 {be.tax_id}</span>}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>Voir les bâtiments →</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BUILDINGS VIEW ── */}
          {view === 'buildings' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              {/* Entities sub-nav */}
              <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: '#fafafa', display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto' }}>
                <span style={{ fontSize: 12, color: 'var(--slate)', whiteSpace: 'nowrap' }}>Entité :</span>
                {entities.map(be => (
                  <button key={be.id}
                    onClick={() => selectBE(be)}
                    style={{
                      padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${selectedBE?.id === be.id ? 'var(--gold)' : 'var(--border)'}`,
                      background: selectedBE?.id === be.id ? '#fffbf0' : 'white',
                      fontFamily: 'DM Sans', fontSize: 12, fontWeight: selectedBE?.id === be.id ? 700 : 400,
                      cursor: 'pointer', whiteSpace: 'nowrap', color: 'var(--ink)',
                    }}
                  >{be.name}</button>
                ))}
                <button onClick={() => { setEditTarget(null); setModal('be'); }} style={{ ...btnAdd, fontSize: 11, padding: '4px 10px', marginLeft: 4, whiteSpace: 'nowrap' }}>+ Entité</button>
              </div>

              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Serif Display', fontSize: 14 }}>🏗 Bâtiments — <span style={{ color: 'var(--gold)' }}>{selectedBE.name}</span></span>
                <button onClick={() => { setEditTarget(null); setModal('building'); }} style={btnAdd}>+ Ajouter</button>
              </div>
              <div style={{ padding: 20 }}>
                {buildings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🏗</div>
                    <div style={{ fontFamily: 'DM Serif Display', fontSize: 16, marginBottom: 6 }}>Aucun bâtiment</div>
                    <div style={{ fontSize: 13 }}>Ajoutez un bâtiment à cette entité</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {buildings.map(b => (
                    <div key={b.id}
                      onClick={() => selectBuilding(b)}
                      style={{ padding: '16px 18px', borderRadius: 12, border: `2px solid ${selectedBuilding?.id === b.id ? 'var(--gold)' : 'var(--border)'}`, cursor: 'pointer', background: selectedBuilding?.id === b.id ? '#fffbf0' : 'white', transition: 'all .15s', boxShadow: selectedBuilding?.id === b.id ? '0 4px 16px rgba(212,175,55,.2)' : '0 1px 4px rgba(0,0,0,.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{b.name}</div>
                        <ActionBtns onEdit={() => openEdit('building', b)} onDelete={() => setConfirm({ type: 'building', id: b.id, label: b.name })} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {b.total_area_sqm && <span>📐 {b.total_area_sqm.toLocaleString()} m²</span>}
                        {b.construction_year && <span>📅 {b.construction_year}</span>}
                        {[b.city, b.state, b.country].filter(Boolean).length > 0 && <span>📍 {[b.city, b.state, b.country].filter(Boolean).join(', ')}</span>}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
                        {selectedBuilding?.id === b.id ? '▼ Voir les étages' : '→ Voir les étages'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FLOORS + SPACES VIEW ── */}
          {view === 'floors' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 0 }}>

              {/* Floors list */}
              <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'DM Serif Display', fontSize: 13 }}>🏢 Étages</span>
                  <button onClick={() => { setEditTarget(null); setModal('floor'); }} style={{ ...btnAdd, padding: '4px 10px', fontSize: 11 }}>+</button>
                </div>

                {/* Building area bar */}
                {selectedBuilding.total_area_sqm && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--slate)' }}>
                      <span>Superficie</span>
                      <span style={{ color: floorsAreaSum > selectedBuilding.total_area_sqm ? '#dc2626' : 'var(--ink)', fontWeight: 600 }}>
                        {floorsAreaSum.toLocaleString()} / {selectedBuilding.total_area_sqm.toLocaleString()} m²
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: floorsAreaSum > selectedBuilding.total_area_sqm ? '#dc2626' : 'var(--gold)', width: `${Math.min(100, (floorsAreaSum / selectedBuilding.total_area_sqm) * 100)}%`, transition: 'width .3s' }} />
                    </div>
                    {floorsAreaSum > selectedBuilding.total_area_sqm && <div style={{ color: '#dc2626', fontSize: 10, marginTop: 3 }}>⚠️ Dépassement!</div>}
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {floors.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)', fontSize: 12 }}>Aucun étage</div>}
                  {floors.map(f => (
                    <div key={f.id} style={{ ...panelCard(selectedFloor?.id === f.id), marginBottom: 6 }} onClick={() => selectFloor(f)}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Étage {f.floor_number}{f.name ? ` — ${f.name}` : ''}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{f.area_sqm ? `${f.area_sqm.toLocaleString()} m²` : '—'}</div>
                      </div>
                      <ActionBtns onEdit={() => openEdit('floor', f)} onDelete={() => setConfirm({ type: 'floor', id: f.id, label: `Floor ${f.floor_number}` })} />
                    </div>
                  ))}
                </div>

                {/* Back to buildings */}
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => { setSelectedBuilding(null); setFloors([]); setSelectedFloor(null); setSpaces([]); }}
                    style={{ width: '100%', padding: '7px 0', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, color: 'var(--slate)' }}
                  >← Retour aux bâtiments</button>
                </div>
              </div>

              {/* Spaces */}
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                {!selectedFloor ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', gap: 10 }}>
                    <div style={{ fontSize: 36 }}>📦</div>
                    <div style={{ fontFamily: 'DM Serif Display', fontSize: 15 }}>Sélectionnez un étage</div>
                    <div style={{ fontSize: 12 }}>Les espaces s'afficheront ici</div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#fafafa' }}>
                      <span style={{ fontFamily: 'DM Serif Display', fontSize: 13 }}>
                        📦 Espaces — Étage {selectedFloor.floor_number}{selectedFloor.name ? ` · ${selectedFloor.name}` : ''}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Status badges */}
                        {Object.entries(spacesByStatus).map(([status, count]) => {
                          const c = SPACE_STATUS_COLORS[status] || { bg: '#f5f5f5', text: '#666' };
                          return <span key={status} style={{ background: c.bg, color: c.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{count} {status}</span>;
                        })}
                        <button onClick={() => { setEditTarget(null); setModal('space'); }} style={btnAdd}>+ Espace</button>
                      </div>
                    </div>

                    {/* Floor area bar */}
                    {selectedFloor.area_sqm && (
                      <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--slate)', whiteSpace: 'nowrap' }}>Superficie étage :</span>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: spacesAreaSum > selectedFloor.area_sqm ? '#dc2626' : '#22c55e', width: `${Math.min(100, (spacesAreaSum / selectedFloor.area_sqm) * 100)}%`, transition: 'width .3s' }} />
                        </div>
                        <span style={{ color: spacesAreaSum > selectedFloor.area_sqm ? '#dc2626' : 'var(--slate)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {spacesAreaSum.toLocaleString()} / {selectedFloor.area_sqm.toLocaleString()} m²
                        </span>
                        {spacesAreaSum > selectedFloor.area_sqm && <span style={{ color: '#dc2626' }}>⚠️</span>}
                      </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                      {spaces.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                          <div style={{ fontFamily: 'DM Serif Display', fontSize: 15, marginBottom: 4 }}>Aucun espace</div>
                          <div style={{ fontSize: 12 }}>Ajoutez des espaces à cet étage</div>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
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
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create modals ── */}
      {modal === 'cc' && !editTarget && (
        <Modal title={tc.newCompanyCode || 'New Company Code'} onClose={() => setModal(null)}>
          <CompanyCodeForm onSave={() => { loadCompanyCodes(); setModal(null); }} onClose={() => setModal(null)} t={t} existingItems={companyCodes} />
        </Modal>
      )}
      {modal === 'be' && !editTarget && (
        <Modal title={tc.newBusinessEntity || 'New Business Entity'} onClose={() => setModal(null)}>
          <BusinessEntityForm onSave={() => { if (selectedCC) loadEntities(selectedCC.id); setModal(null); }} onClose={() => setModal(null)} t={t} companyCodeId={selectedCC?.id} existingItems={entities} />
        </Modal>
      )}
      {modal === 'building' && !editTarget && selectedBE && (
        <Modal title={tc.newBuilding || 'New Building'} onClose={() => setModal(null)}>
          <BuildingForm beId={selectedBE.id} onSave={() => loadBuildings(selectedBE.id)} onClose={() => setModal(null)} t={t} existingBuildings={buildings} />
        </Modal>
      )}
      {modal === 'floor' && !editTarget && selectedBuilding && (
        <Modal title={tc.newFloor || 'New Floor'} onClose={() => setModal(null)}>
          <FloorForm buildingId={selectedBuilding.id} onSave={() => loadFloors(selectedBuilding.id)} onClose={() => setModal(null)} t={t} buildingTotalSqm={selectedBuilding.total_area_sqm} existingFloors={floors} />
        </Modal>
      )}
      {modal === 'space' && !editTarget && selectedFloor && (
        <Modal title={tc.newSpace || 'New Space'} onClose={() => setModal(null)}>
          <SpaceForm floorId={selectedFloor.id} onSave={() => loadSpaces(selectedFloor.id)} onClose={() => setModal(null)} t={t} floorAreaSqm={selectedFloor.area_sqm} existingSpaces={spaces} />
        </Modal>
      )}

      {/* ── Edit modals ── */}
      {modal === 'edit' && editTarget?.type === 'cc' && (
        <Modal title={`Edit — ${editTarget.item.code}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <CompanyCodeForm initial={editTarget.item} onSave={() => { loadCompanyCodes(); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} existingItems={companyCodes} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'be' && (
        <Modal title={`Edit — ${editTarget.item.name}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <BusinessEntityForm initial={editTarget.item} onSave={() => { if (selectedCC) loadEntities(selectedCC.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} existingItems={entities} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'building' && (
        <Modal title={`Edit — ${editTarget.item.name}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <BuildingForm initial={editTarget.item} beId={selectedBE?.id} onSave={() => { if (selectedBE) loadBuildings(selectedBE.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} existingBuildings={buildings} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'floor' && (
        <Modal title={`Edit — Floor ${editTarget.item.floor_number}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <FloorForm initial={editTarget.item} buildingId={selectedBuilding?.id} onSave={() => { if (selectedBuilding) loadFloors(selectedBuilding.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} buildingTotalSqm={selectedBuilding?.total_area_sqm} existingFloors={floors} />
        </Modal>
      )}
      {modal === 'edit' && editTarget?.type === 'space' && (
        <Modal title={`Edit — ${editTarget.item.space_code}`} onClose={() => { setModal(null); setEditTarget(null); }}>
          <SpaceForm initial={editTarget.item} floorId={selectedFloor?.id} onSave={() => { if (selectedFloor) loadSpaces(selectedFloor.id); setModal(null); setEditTarget(null); }} onClose={() => { setModal(null); setEditTarget(null); }} t={t} floorAreaSqm={selectedFloor?.area_sqm} existingSpaces={spaces} />
        </Modal>
      )}
    </div>
  );
}
