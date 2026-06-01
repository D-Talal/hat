import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { USAGE_TYPES, SPACE_STATUSES } from '../data/constants';
import { useLanguage } from '../context/LanguageContext';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnDanger    = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 };
const STATUS_COLORS = { available: { bg: '#e8f5e9', text: '#2e7d32' }, occupied: { bg: '#e3f2fd', text: '#1565c0' }, maintenance: { bg: '#fff8e1', text: '#f57f17' }, vacant: { bg: '#fce4ec', text: '#c62828' } };

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

function RentalObjectForm({ onSave, onClose, initial, existingItems = [] }) {
  const { t } = useLanguage();
  const tc = t.commercial;

  // Cascade: BusinessEntity → Building → Spaces
  const [entities,  setEntities]  = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [spaces,    setSpaces]    = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [error, setError] = useState('');

  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [form, setForm] = useState({
    building_id:  initial?.building_id  || '',
    code:         initial?.code         || '',
    description:  initial?.description  || '',
    usage_type:   initial?.usage_type   || 'retail',
    status:       initial?.status       || 'available',
    cost_center:  initial?.cost_center  || '',
    im_key:       initial?.im_key       || '',
  });
  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const isEdit = !!initial?.id;

  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingItems, {
    fields: ['code'], labels: { code: 'Code' }, editingId: initial?.id,
  });

  // Load all entities on mount
  useEffect(() => {
    API.get('/commercial/business-entities').then(r => setEntities(r.data || [])).catch(() => {});
  }, []);

  // When entity changes → load buildings for that entity
  useEffect(() => {
    if (!selectedEntityId) { setBuildings([]); setForm(f => ({ ...f, building_id: '' })); return; }
    API.get(`/commercial/business-entities/${selectedEntityId}/buildings`)
      .then(r => setBuildings(r.data || []))
      .catch(() => setBuildings([]));
  }, [selectedEntityId]);

  // When building changes → load available spaces
  useEffect(() => {
    if (!form.building_id || isEdit) { setSpaces([]); return; }
    API.get(`/commercial/buildings/${form.building_id}/available-spaces`)
      .then(r => setSpaces(r.data || []))
      .catch(() => setSpaces([]));
  }, [form.building_id, isEdit]);

  // Pre-select entity if editing — load building info directly
  useEffect(() => {
    if (initial?.building_id) {
      // Load building to get business_entity_id
      API.get('/commercial/buildings').then(r => {
        const allBuildings = r.data || [];
        const b = allBuildings.find(b => b.id === parseInt(initial.building_id));
        if (b) {
          setSelectedEntityId(String(b.business_entity_id));
          setBuildings(allBuildings.filter(bl => bl.business_entity_id === b.business_entity_id));
        }
      }).catch(() => {});
    }
  }, [initial?.building_id]);

  const save = async () => {
    if (!form.code.trim()) { setError('Code is required'); return; }
    const dupErr = checkDuplicate(form);
    if (dupErr) { setError(dupErr); return; }
    setError('');
    try {
      if (isEdit) await API.put(`/commercial/rental-objects/${initial.id}`, { ...form, space_ids: selectedSpaces });
      else        await API.post('/commercial/rental-objects', { ...form, space_ids: selectedSpaces });
      onSave(); onClose();
    } catch (e) { setError(e.response?.data?.detail || 'Error'); }
  };

  // Find selected building for context display
  const selectedBuilding = buildings.find(b => String(b.id) === String(form.building_id));
  const selectedEntity   = entities.find(e => String(e.id) === String(selectedEntityId));

  return (
    <>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{error}</div>}
      <div style={{ background: '#e3f2fd', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1565c0' }}>
        ℹ Un Rental Object regroupe un ou plusieurs espaces physiques pour la location.
      </div>

      {/* Localisation — read-only in edit, cascade in create */}
      <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 12 }}>
          Localisation {isEdit && <span style={{ fontWeight: 400, color: '#9ea4be', textTransform: 'none', letterSpacing: 0 }}>(non modifiable après création)</span>}
        </div>
        {isEdit ? (
          /* Read-only context in edit mode */
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedEntity   && <span style={{ background: '#e8eaf6', color: '#1a237e', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>🏛 {selectedEntity.name}</span>}
            {selectedBuilding && <span style={{ background: '#e8f5e9', color: '#1b5e20', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>🏗 {selectedBuilding.name}</span>}
            {selectedBuilding?.city && <span style={{ background: '#f5f5f5', color: '#555', borderRadius: 8, padding: '6px 14px', fontSize: 13 }}>📍 {[selectedBuilding.city, selectedBuilding.country].filter(Boolean).join(', ')}</span>}
            {!selectedEntity && !selectedBuilding && (
              <span style={{ color: 'var(--slate)', fontSize: 13 }}>Chargement…</span>
            )}
          </div>
        ) : (
          /* Cascade selects in create mode */
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Business Entity *">
                <select style={inputStyle} value={selectedEntityId} onChange={e => { setSelectedEntityId(e.target.value); setForm(f => ({ ...f, building_id: '' })); }}>
                  <option value="">— Sélectionner —</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </Field>
              <Field label={tc.buildings + ' *'}>
                <select style={inputStyle} value={form.building_id} onChange={set('building_id')} disabled={!selectedEntityId}>
                  <option value="">{selectedEntityId ? '— Sélectionner —' : '— Choisir une entité d'abord —'}</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}{b.city ? ` (${b.city})` : ''}</option>)}
                </select>
              </Field>
            </div>
            {(selectedEntity || selectedBuilding) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {selectedEntity  && <span style={{ background: '#e8eaf6', color: '#1a237e', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>🏛 {selectedEntity.name}</span>}
                {selectedBuilding && <span style={{ background: '#e8f5e9', color: '#1b5e20', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>🏗 {selectedBuilding.name}</span>}
                {selectedBuilding?.city && <span style={{ background: '#f5f5f5', color: '#555', borderRadius: 6, padding: '3px 10px', fontSize: 11 }}>📍 {[selectedBuilding.city, selectedBuilding.country].filter(Boolean).join(', ')}</span>}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Code *">
          <input style={inputStyle} value={form.code} onChange={set('code')} placeholder="ex: RO-A101" disabled={isEdit} />
          {!isEdit && <DuplicateWarning value={form.code} field="code" />}
        </Field>
        <Field label={tc.status}>
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            {['available','occupied','maintenance','vacant'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label={tc.usageType}>
          <select style={inputStyle} value={form.usage_type} onChange={set('usage_type')}>
            {Object.entries(USAGE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label={tc.costCenter}><input style={inputStyle} value={form.cost_center} onChange={set('cost_center')} placeholder="ex: CC-1001" /></Field>
        <Field label={tc.imKey}><input style={inputStyle} value={form.im_key} onChange={set('im_key')} placeholder="ex: ASSET-4200" /></Field>
      </div>
      <Field label={tc.description}><input style={inputStyle} value={form.description} onChange={set('description')} /></Field>

      {!isEdit && (
        <>
          <SectionTitle>Espaces physiques à associer</SectionTitle>
          {!form.building_id ? (
            <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16, background: '#f8f9fa', borderRadius: 8, padding: '12px 16px' }}>
              📋 Sélectionnez un bâtiment pour voir les espaces disponibles.
            </div>
          ) : spaces.length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16, background: '#fff8e1', borderRadius: 8, padding: '12px 16px', border: '1px solid #f59e0b' }}>
              ⚠️ Aucun espace disponible dans ce bâtiment. Créez des espaces dans Patrimoine d'abord.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {spaces.map(s => (
                <div key={s.id}
                  onClick={() => setSelectedSpaces(ss => ss.includes(s.id) ? ss.filter(x => x !== s.id) : [...ss, s.id])}
                  style={{ padding: '10px 14px', borderRadius: 8, border: `2px solid ${selectedSpaces.includes(s.id) ? 'var(--gold)' : 'var(--border)'}`, background: selectedSpaces.includes(s.id) ? '#fffbf0' : 'white', cursor: 'pointer', transition: 'all .12s' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.space_code}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)' }}>{s.current_area_sqm ? `${s.current_area_sqm} m²` : 'Pas de mesure'}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={btnSecondary}>Annuler</button>
        <button onClick={save} style={btnPrimary}>{isEdit ? 'Sauvegarder' : 'Créer'}</button>
      </div>
    </>
  );
}

export default function RentalObjects() {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [objects, setObjects]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get('/commercial/rental-objects'); setObjects(r.data || []); }
    catch { setObjects([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade">
      <PageHeader title={tc.rentalObjectsTitle || 'Rental Objects'} sub={tc.rentalObjectsSub || 'Usage view — groups physical spaces'} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => { setSelected(null); setModal('new'); }} style={btnPrimary}>+ {tc.newRentalObject || 'Nouveau'}</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)', fontSize: 18 }}>{t.common.loading}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {objects.map(ro => {
            const sc = STATUS_COLORS[ro.status] || STATUS_COLORS.available;
            return (
              <Card key={ro.id} style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{ro.code}</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ background: sc.bg, color: sc.text, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{ro.status}</span>
                    <button onClick={() => { setSelected(ro); setModal('edit'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                    <button onClick={() => setConfirm(ro)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626' }}>🗑</button>
                  </div>
                </div>
                {ro.description && <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>{ro.description}</div>}
                <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {ro.building && <span>🏗 {ro.building.name}</span>}
                  {ro.usage_type && <span>🏷 {ro.usage_type}</span>}
                  {ro.spaces?.length > 0 && <span>📦 {ro.spaces.length} espace{ro.spaces.length > 1 ? 's' : ''}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {objects.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--slate)' }}>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 8 }}>Aucun Rental Object</div>
          <div style={{ fontSize: 13 }}>Créez des espaces physiques dans Patrimoine, puis regroupez-les ici.</div>
        </div>
      )}
      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? `Edit — ${selected?.code}` : (tc.newRentalObject || 'Nouveau Rental Object')} onClose={() => setModal(null)}>
          <RentalObjectForm onSave={load} onClose={() => setModal(null)} initial={modal === 'edit' ? selected : null} existingItems={objects} />
        </Modal>
      )}
      {confirm && (
        <Modal title="Confirmer la suppression" onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Supprimer <strong>{confirm.code}</strong> ?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={async () => { await API.delete(`/commercial/rental-objects/${confirm.id}`); load(); setConfirm(null); }} style={btnDanger}>Supprimer</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
