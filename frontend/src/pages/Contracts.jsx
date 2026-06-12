import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Modal } from '../components/UI';
import { DAY_COUNT_METHODS, CONTRACT_TYPES, PAYMENT_TIMINGS } from '../data/constants';
import { useLanguage } from '../context/LanguageContext';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { inputStyle, btnPrimary, btnSecondary, btnDanger } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';
import { daysUntil } from '../data/dates';
import { getCountries } from '../data/geo';
import { getContractStatus } from '../data/contractStatus';
import { parseApiError } from '../data/apiError';




const CONDITION_TYPES = {
  base_rent: { label: 'Base Rent', color: '#1a237e', bg: '#e8eaf6' },
  service_charge: { label: 'Service Charge', color: '#1b5e20', bg: '#e8f5e9' },
  advance_payment: { label: 'Advance Payment', color: '#e65100', bg: '#fff3e0' },
  flat_rate: { label: 'Flat Rate', color: '#4a148c', bg: '#f3e5f5' },
  sales_based: { label: 'Sales-Based', color: '#01579b', bg: '#e1f5fe' },
  markup_fee: { label: 'Markup Fee', color: '#37474f', bg: '#eceff1' },
  rent_free: { label: 'Rent-Free', color: '#c62828', bg: '#fce4ec' },
  abatement: { label: 'Abatement', color: '#6a1b9a', bg: '#f3e5f5' },
};



function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 24, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

function ContractForm({ onSave, onClose, initial, existingItems = [] }) {
  const { t } = useLanguage();
  const tc = t.commercial;
  const [partners, setPartners] = useState([]);
  const [entities, setEntities] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedObjects, setSelectedObjects] = useState(initial?.space_ids || []);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    contract_number: initial?.contract_number || '',
    title: initial?.title || '',
    jurisdiction: initial?.jurisdiction || '',
    business_partner_id: initial?.business_partner_id || initial?.business_partner?.id || '',
    business_entity_id: initial?.business_entity_id || initial?.business_entity?.id || '',
    contract_type: initial?.contract_type || 'lease_out',
    start_date: initial?.start_date || '',
    first_end_date: initial?.first_end_date || '',
    probable_end_date: initial?.probable_end_date || '',
    absolute_end_date: initial?.absolute_end_date || '',
    notice_date: initial?.notice_date || '',
    signing_date: initial?.signing_date || '',
    relevant_to_sales: initial?.relevant_to_sales || false,
    is_multi_object: initial?.is_multi_object || false,
    payment_timing: initial?.payment_timing || 'in_advance',
    day_count_method: initial?.day_count_method || 'act_365',
    pro_rata_enabled: initial?.pro_rata_enabled !== undefined ? initial.pro_rata_enabled : true,
    notes: initial?.notes || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // Only check contract_number duplicate if manually entered (not auto-generated)
  const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingItems, {
    fields: ['contract_number'],
    labels: { contract_number: 'Numéro de contrat' },
    editingId: initial?.id,
  });

  const [loadingRO, setLoadingRO] = useState(false);
  const [refreshRO, setRefreshRO] = useState(0);

  // Load partners and entities once on mount
  useEffect(() => {
    Promise.all([
      API.get('/commercial/business-partners'),
      API.get('/commercial/business-entities'),
    ])
      .then(([bp, be]) => {
        setPartners(bp.data || []);
        setEntities(be.data || []);
      })
      .catch(() => {});
  }, []);

  // Inherit currency from selected BusinessEntity
  const selectedEntity = entities.find(e => String(e.id) === String(form.business_entity_id));
  useEffect(() => {
    if (selectedEntity?.currency && !initial?.id) {
      // Show inheritance hint — don't auto-set, let user see it
    }
  }, [form.business_entity_id, selectedEntity]);

  // Load spaces: leasable ones for the entity + the contract's own linked spaces
  useEffect(() => {
    if (!form.business_entity_id) {
      setSpaces([]);
      if (!initial?.id) setSelectedObjects([]);
      return;
    }
    setLoadingRO(true);

    const leasableReq = API.get('/commercial/spaces-leasable')
      .then(r => r.data || [])
      .catch(() => []);

    // In edit mode, also fetch the contract's own spaces (they're occupied, so
    // they won't show in spaces-leasable). Self-contained endpoint.
    const linkedReq = initial?.id
      ? API.get(`/commercial/contracts/${initial.id}/spaces`).then(r => r.data || []).catch(() => [])
      : Promise.resolve([]);

    Promise.all([leasableReq, linkedReq])
      .then(([leasable, linked]) => {
        const forEntity = leasable.filter(ro => {
          const beId = ro.business_entity_id;
          if (beId == null) return true;
          return String(beId) === String(form.business_entity_id);
        });

        // Merge linked spaces that aren't already in the leasable list
        linked.forEach(sp => {
          if (!forEntity.some(s => s.id === sp.id)) forEntity.push(sp);
        });

        setSpaces(forEntity);

        if (initial?.id) {
          // Pre-select the contract's linked spaces
          setSelectedObjects(linked.map(sp => sp.id));
        } else {
          setSelectedObjects([]);
        }
      })
      .finally(() => setLoadingRO(false));
  }, [form.business_entity_id, refreshRO, initial]);

  const toggleObject = id => setSelectedObjects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // Validate date coherence before submitting. Returns an error string or null.
  const validateDates = () => {
    const { start_date, first_end_date, probable_end_date, absolute_end_date, notice_date, signing_date } = form;

    if (!start_date) return "La date de début est obligatoire.";

    const d = (v) => (v ? new Date(v) : null);
    const s = d(start_date);
    const fe = d(first_end_date);
    const pe = d(probable_end_date);
    const ae = d(absolute_end_date);
    const nd = d(notice_date);
    const sd = d(signing_date);

    // All end dates must be after the start date
    if (fe && fe <= s) return "La première date de fin doit être postérieure à la date de début.";
    if (pe && pe <= s) return "La date de fin probable doit être postérieure à la date de début.";
    if (ae && ae <= s) return "La date de fin absolue doit être postérieure à la date de début.";

    // Logical ordering between end dates: first ≤ probable ≤ absolute
    if (fe && pe && pe < fe) return "La date de fin probable ne peut pas être antérieure à la première date de fin.";
    if (pe && ae && ae < pe) return "La date de fin absolue ne peut pas être antérieure à la date de fin probable.";
    if (fe && ae && ae < fe) return "La date de fin absolue ne peut pas être antérieure à la première date de fin.";

    // Notice date should fall within the contract window
    if (nd && nd < s) return "La date de préavis ne peut pas être antérieure à la date de début.";
    if (nd && ae && nd > ae) return "La date de préavis ne peut pas être postérieure à la date de fin absolue.";

    // Signing date sanity: not absurdly far before start (> 1 year) and not after end
    if (sd && ae && sd > ae) return "La date de signature ne peut pas être postérieure à la fin du contrat.";

    return null;
  };

  const save = async () => {
    setFormError('');

    // Required relations
    if (!form.business_entity_id) { setFormError("Veuillez sélectionner une Business Entity."); return; }
    if (!form.business_partner_id) { setFormError("Veuillez sélectionner un Business Partner."); return; }

    // Date coherence
    const dateErr = validateDates();
    if (dateErr) { setFormError(dateErr); return; }

    // Only check duplicate on manual contract_number (non-empty, non-edit)
    if (!initial?.id && form.contract_number.trim()) {
      const dupErr = checkDuplicate(form);
      if (dupErr) { setFormError(dupErr); return; }
    }

    // Strip empty-string fields so the backend receives null, not ""
    const clean = (obj) => {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = v === '' ? null : v;
      }
      return out;
    };

    try {
      if (initial?.id) {
        const isDraft = initial.status === 'draft';
        // Draft contracts: full edit. Released/terminated: only end dates + notes.
        const patch = isDraft ? clean({
          title: form.title,
          jurisdiction: form.jurisdiction,
          business_partner_id: form.business_partner_id,
          contract_type: form.contract_type,
          start_date: form.start_date,
          first_end_date: form.first_end_date,
          probable_end_date: form.probable_end_date,
          absolute_end_date: form.absolute_end_date,
          notice_date: form.notice_date,
          signing_date: form.signing_date,
          payment_timing: form.payment_timing,
          day_count_method: form.day_count_method,
          pro_rata_enabled: form.pro_rata_enabled,
          relevant_to_sales: form.relevant_to_sales,
          notes: form.notes,
          space_ids: selectedObjects,
        }) : clean({
          title: form.title,
          jurisdiction: form.jurisdiction,
          probable_end_date: form.probable_end_date,
          absolute_end_date: form.absolute_end_date,
          notes: form.notes,
        });
        await API.patch(`/commercial/contracts/${initial.id}`, patch);
      } else {
        await API.post('/commercial/contracts', { ...clean(form), space_ids: selectedObjects });
      }
      onSave(); onClose();
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  const isEdit = !!initial?.id;
  const isDraft = !isEdit || initial?.status === 'draft';
  const lockStructural = isEdit && !isDraft; // released/terminated: lock structural fields

  // Red border when a date field is invalid
  const dateInputStyle = (invalid) => invalid
    ? { ...inputStyle, border: '1.5px solid #dc2626', background: '#fef2f2' }
    : inputStyle;

  // Live coherence hint shown under the dates block (non-blocking, informative)
  const liveDateHint = (() => {
    const d = (v) => (v ? new Date(v) : null);
    const s = d(form.start_date), fe = d(form.first_end_date), pe = d(form.probable_end_date), ae = d(form.absolute_end_date);
    if (fe && s && fe <= s) return "La première date de fin doit être après la date de début.";
    if (pe && s && pe <= s) return "La date de fin probable doit être après la date de début.";
    if (ae && s && ae <= s) return "La date de fin absolue doit être après la date de début.";
    if (fe && pe && pe < fe) return "Fin probable antérieure à la première date de fin.";
    if (pe && ae && ae < pe) return "Fin absolue antérieure à la fin probable.";
    return null;
  })();

  return (
    <>
      {formError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{formError}</div>}
      <SectionTitle>Contract Information</SectionTitle>
      <Field label="Contract Title / Name">
        <input style={inputStyle} value={form.title} onChange={set('title')} placeholder="e.g. Lease — Acme Retail, Ground Floor Unit A" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label={tc.contractNumber}>
          <input style={inputStyle} value={form.contract_number} onChange={set('contract_number')} placeholder="Auto-generated if empty" disabled={isEdit} />
          {!isEdit && form.contract_number && <DuplicateWarning value={form.contract_number} field="contract_number" />}
        </Field>
        <Field label={tc.contractType}>
          <select style={inputStyle} value={form.contract_type} onChange={set('contract_type')} disabled={lockStructural}>
            <option value="lease_out">Lease Out (LO) — Landlord → Tenant</option>
            <option value="lease_in">Lease In (LI) — Tenant from Landlord</option>
          </select>
        </Field>
        <Field label="Jurisdiction (tax)">
          <select style={inputStyle} value={form.jurisdiction} onChange={set('jurisdiction')}>
            <option value="">— Select —</option>
            {getCountries().map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>Détermine le régime fiscal applicable au contrat.</div>
        </Field>
        <Field label={tc.businessEntity + " *"}>
          <select style={inputStyle} value={form.business_entity_id} onChange={set('business_entity_id')} disabled={isEdit}>
            <option value="">— Select —</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}{e.currency ? ` (${e.currency})` : ''}</option>)}
          </select>
          {selectedEntity && (
            <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selectedEntity.currency && <span style={{ background: '#e8eaf6', color: '#1a237e', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>💱 {selectedEntity.currency}</span>}
              {selectedEntity.country && <span style={{ background: '#f5f5f5', color: '#555', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>📍 {[selectedEntity.city, selectedEntity.country].filter(Boolean).join(', ')}</span>}
            </div>
          )}
        </Field>
        <Field label={tc.businessPartner + " *"}>
          <select style={inputStyle} value={form.business_partner_id} onChange={set('business_partner_id')} disabled={lockStructural}>
            <option value="">— Select —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
          </select>
        </Field>
      </div>

      <SectionTitle>Key Dates (time-dependent)</SectionTitle>
      <div style={{ background: '#f0f7ff', borderRadius: 10, padding: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#1565c0', marginBottom: 12 }}>ℹ Any modification to these dates creates a new time slot.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Field label={tc.startDate + " *"}><input style={dateInputStyle(!form.start_date)} type="date" value={form.start_date} onChange={set('start_date')} disabled={lockStructural} /></Field>
          <Field label={tc.firstEndDate}><input style={dateInputStyle(form.first_end_date && form.start_date && new Date(form.first_end_date) <= new Date(form.start_date))} type="date" value={form.first_end_date} onChange={set('first_end_date')} disabled={lockStructural} min={form.start_date || undefined} /></Field>
          <Field label={tc.probableEndDate}><input style={dateInputStyle(form.probable_end_date && form.start_date && new Date(form.probable_end_date) <= new Date(form.start_date))} type="date" value={form.probable_end_date} onChange={set('probable_end_date')} min={form.start_date || undefined} /></Field>
          <Field label={tc.absoluteEndDate}><input style={dateInputStyle(form.absolute_end_date && form.start_date && new Date(form.absolute_end_date) <= new Date(form.start_date))} type="date" value={form.absolute_end_date} onChange={set('absolute_end_date')} min={form.start_date || undefined} /></Field>
          <Field label={tc.noticeDate}><input style={inputStyle} type="date" value={form.notice_date} onChange={set('notice_date')} disabled={lockStructural} min={form.start_date || undefined} /></Field>
          <Field label={tc.signingDate}><input style={inputStyle} type="date" value={form.signing_date} onChange={set('signing_date')} disabled={lockStructural} /></Field>
        </div>
        {liveDateHint && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#c62828', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠ {liveDateHint}
          </div>
        )}
      </div>

      {!isEdit && (
        <>
          <SectionTitle>Posting Parameters</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label={tc.paymentTiming}>
              <select style={inputStyle} value={form.payment_timing} onChange={set('payment_timing')}>
                <option value="in_advance">In Advance (start of month)</option>
                <option value="in_arrears">In Arrears (end of month)</option>
              </select>
            </Field>
            <Field label={tc.dayCountMethod}>
              <select style={inputStyle} value={form.day_count_method} onChange={set('day_count_method')}>
                <option value="act_365">Actual / 365</option>
                <option value="act_360">Actual / 360</option>
                <option value="act_act">Actual / Actual</option>
                <option value="30_360">30 / 360</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            {[['pro_rata_enabled', 'Enable pro-rata'], ['relevant_to_sales', 'Relevant to Sales'], ['is_multi_object', 'Multi-object']].map(([k, lbl]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={form[k]} onChange={set(k)} />{lbl}
              </label>
            ))}
          </div>
        </>
      )}

      {/* Rental spaces — shown in both create and edit modes */}
      <>
          <SectionTitle>
            Espaces locatifs
            <button
              onClick={() => setRefreshRO(n => n + 1)}
              style={{ marginLeft: 12, fontSize: 11, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', fontFamily: 'DM Sans', color: 'var(--slate)', verticalAlign: 'middle' }}
              title="Actualiser la liste"
            >↻ Actualiser</button>
          </SectionTitle>
          {isEdit && (
            lockStructural ? (
              <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400e' }}>
                🔒 Ce contrat est <strong>actif</strong> — les espaces ne peuvent pas être modifiés.
                Pour changer les espaces, résiliez puis renouvelez le contrat, ou créez-en un nouveau.
              </div>
            ) : (
              <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#166534' }}>
                ✏️ Ce contrat est en <strong>brouillon</strong> — vous pouvez ajouter ou retirer des espaces, puis enregistrer.
              </div>
            )
          )}
          {!form.business_entity_id ? (
            <div style={{ background: '#f0f7ff', border: '1px solid #93c5fd', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
              ℹ️ Sélectionnez d'abord une <strong>Business Entity</strong> pour voir les espaces disponibles.
            </div>
          ) : loadingRO ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--slate)', fontSize: 13 }}>Chargement…</div>
          ) : spaces.length === 0 ? (
            <div style={{ background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              ⚠️ Aucun espace disponible trouvé pour cette entité.
              <div style={{ fontSize: 12, marginTop: 4 }}>Créez des espaces dans Patrimoine et assignez-leur un usage type.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {spaces.map(ro => {
                const s = (ro.status || '').toLowerCase();
                const isSelected = selectedObjects.includes(ro.id);
                // A space is clickable if it's leasable OR already selected
                // (so an occupied space linked to THIS contract can be unchecked).
                const isLeasable = s === 'available' || s === 'vacant';
                const isClickable = !lockStructural && (isLeasable || isSelected);
                return (
                  <div key={ro.id}
                    onClick={() => isClickable && toggleObject(ro.id)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 13, transition: 'all .12s',
                      border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                      background: isSelected ? '#fffbf0' : isLeasable ? 'white' : '#f9fafb',
                      cursor: isClickable ? 'pointer' : 'not-allowed',
                      opacity: isClickable ? 1 : 0.5,
                    }}>
                    <div style={{ fontWeight: 700 }}>{ro.space_code}</div>
                    <div style={{ color: 'var(--slate)', fontSize: 11, marginTop: 2 }}>{ro.usage_type || '—'}{ro.current_area_sqm ? ` · ${ro.current_area_sqm} m²` : ''}</div>
                    <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600, textTransform: 'uppercase',
                      color: s === 'available' ? '#15803d' : s === 'vacant' ? '#dc2626' : '#6b7280' }}>
                      {ro.status}{isSelected && !isLeasable ? ' · lié à ce contrat' : ''}
                    </div>
                    {ro.building_name && <div style={{ fontSize: 10, color: '#9ea4be', marginTop: 2 }}>🏗 {ro.building_name} · Étage {ro.floor_number}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>

      <Field label={tc.notes}><textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.notes} onChange={set('notes')} /></Field>

      {!isEdit && (
        <div style={{ background: '#fff8e1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e65100', marginBottom: 16 }}>
          ⚠ Contract will be created in <strong>Draft</strong> status. No FI postings until Released.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={btnSecondary}>Cancel</button>
        <button onClick={save} style={btnPrimary}>{isEdit ? 'Save Changes' : 'Create Contract'}</button>
      </div>
    </>
  );
}

function ContractDetail({ contract, onClose, onRelease, onEdit, onDelete, t, onRefresh }) {
  const toast = useToast();
  const [conditions, setConditions] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [invoices, setInvoices] = useState([]);

  // IPC modal state
  const [ipcModal, setIpcModal]     = useState(false);
  const [ipcIndex, setIpcIndex]     = useState('');
  const [ipcDate, setIpcDate]       = useState('');
  const [ipcLoading, setIpcLoading] = useState(false);
  const [ipcResult, setIpcResult]   = useState(null);
  const [ipcError, setIpcError]     = useState('');

  // Quittancement modal state
  const [qModal, setQModal]         = useState(false);
  const [qFrom, setQFrom]           = useState('');
  const [qTo, setQTo]               = useState('');
  const [qLoading, setQLoading]     = useState(false);
  const [qResult, setQResult]       = useState(null);
  const [qError, setQError]         = useState('');

  // Termination modal state
  const [termModal, setTermModal]     = useState(false);
  const [termNotice, setTermNotice]   = useState('');
  const [termEffective, setTermEffective] = useState('');
  const [termReason, setTermReason]   = useState('');
  const [termVacancy, setTermVacancy] = useState(true);
  const [termRent, setTermRent]       = useState('');
  const [termLoading, setTermLoading] = useState(false);
  const [termResult, setTermResult]   = useState(null);
  const [termError, setTermError]     = useState('');

  // Renewal modal state
  const [renewModal, setRenewModal]     = useState(false);
  const [renewStart, setRenewStart]     = useState('');
  const [renewEnd, setRenewEnd]         = useState('');
  const [renewCopyConds, setRenewCopyConds] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewResult, setRenewResult]   = useState(null);
  const [renewError, setRenewError]     = useState('');

  // Pre-fill quittancement with current month
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    setQFrom(`${y}-${m}-01`);
    setQTo(`${y}-${m}-${lastDay}`);
    setIpcDate(`${y}-${m}-01`);
    const todayStr = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`;
    setTermNotice(todayStr);
    setTermEffective(todayStr);
  }, []);

  const downloadInvoicePdf = async (invoiceId) => {
    try {
      const res = await API.get(`/pdf/invoice/${invoiceId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_INV-${String(invoiceId).padStart(5, '0')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Échec du téléchargement du PDF');
    }
  };
  const s = getContractStatus(contract.status, t);
  const days = daysUntil(contract.absolute_end_date);
  const expiringSoon = days !== null && days <= 90 && days > 0;
  const expired = days !== null && days <= 0;

  useEffect(() => {
    if (activeTab === 'invoices') {
      API.get(`/commercial/invoices?contract_id=${contract.id}`).then(r => setInvoices(r.data || [])).catch(() => {});
    }
    if (activeTab === 'conditions') {
      API.get(`/commercial/conditions?contract_id=${contract.id}`)
        .then(r => setConditions(r.data || [])).catch(() => {});
    }
  }, [activeTab, contract.id]);

  return (
    <>
      {/* Status + badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ background: s.bg, color: s.text, borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{s.label}</span>
        <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{contract.contract_type === 'lease_out' ? 'LO' : 'LI'}</span>
        {contract.relevant_to_sales && <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>Sales-Based</span>}
        {expiringSoon && <span style={{ background: '#fff8e1', color: '#f57f17', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>⚠ Expires in {days} days</span>}
        {expired && <span style={{ background: '#fce4ec', color: '#c62828', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>⛔ Expired {Math.abs(days)} days ago</span>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        {['info', 'conditions', 'invoices'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? 'var(--ink)' : 'var(--slate)', borderBottom: activeTab === tab ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -2, textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            ['Tenant', contract.business_partner?.company_name],
            ['Business Entity', contract.business_entity?.name],
            ['Start Date', contract.start_date],
            ['Absolute End', contract.absolute_end_date],
            ['Probable End', contract.probable_end_date],
            ['Notice Date', contract.notice_date],
            ['Payment', contract.payment_timing === 'in_advance' ? 'In Advance' : 'In Arrears'],
            ['Day Count', contract.day_count_method],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontWeight: 600 }}>{val || '—'}</div>
            </div>
          ))}
          {contract.notes && (
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>{contract.notes}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'conditions' && (
        <div>
          {conditions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>No conditions on this contract yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Type', 'Amount', 'Frequency', 'Valid From', 'Valid To'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {conditions.map(c => {
                  const ct = CONDITION_TYPES[c.condition_type] || {};
                  return (
                    <tr key={c.id}>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ background: ct.bg, color: ct.text, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{ct.label || c.condition_type}</span>
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.amount ? `${Number(c.amount).toLocaleString()} ${c.currency}` : c.condition_type === 'markup_fee' ? `${((c.markup_rate || 0) * 100).toFixed(0)}%` : '—'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.frequency}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_from}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{c.valid_to || '∞'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Actions */}
      {contract.status === 'draft' && (
        <div style={{ background: '#e8f5e9', border: '1.5px solid #86efac', borderRadius: 10, padding: '14px 16px', marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#15803d', marginBottom: 4, fontWeight: 700 }}>✓ Prêt à activer ce contrat ?</div>
          <div style={{ fontSize: 12, color: '#166534', marginBottom: 12 }}>
            Une fois Released, les postings FI peuvent commencer. Assurez-vous d'avoir au moins une condition (loyer de base, etc.) avant de continuer.
          </div>
          <button onClick={() => onRelease(contract.id)}
            style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#15803d', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14 }}>
            🚀 Release Contract
          </button>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div>
          {/* ── Quittancement automatique ── */}
          {contract.status === 'released' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>⚡ Quittancement automatique</div>
                  <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Génère les appels de loyer selon les conditions actives du contrat</div>
                </div>
                <button onClick={() => { setQResult(null); setQError(''); setQModal(true); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#15803d', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                  📄 Générer
                </button>
              </div>
            </div>
          )}

          {invoices.length === 0 ? (
            <p style={{ color: 'var(--slate)', fontSize: 13 }}>Aucune facture trouvée pour ce contrat.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f7ff' }}>
                  {['Période', 'Type', 'Montant', 'Échéance', 'Statut', 'PDF'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px' }}>{inv.period_from ? `${inv.period_from} – ${inv.period_to}` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{(inv.condition_type || '—').replace(/_/g, ' ')}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{inv.currency} {parseFloat(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px 10px' }}>{inv.due_date || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                        background: inv.status === 'paid' ? '#ecfdf5' : inv.status === 'overdue' ? '#fef2f2' : '#fff7ed',
                        color: inv.status === 'paid' ? '#10b981' : inv.status === 'overdue' ? '#ef4444' : '#f97316' }}>
                        {(inv.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => downloadInvoicePdf(inv.id)} title="Download receipt PDF"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>📥</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Bottom action bar ── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button onClick={onEdit} style={btnPrimary}>✏️ Edit</button>
        {contract.status === 'released' && (
          <button onClick={() => { setIpcResult(null); setIpcError(''); setIpcModal(true); }}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#ca8a04', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
            📈 Révision IPC
          </button>
        )}
        {contract.status === 'released' && (
          <button onClick={() => { setTermResult(null); setTermError(''); setTermModal(true); }}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
            🛑 Résilier
          </button>
        )}
        {['released', 'terminated', 'expired'].includes(contract.status) && (
          <button onClick={() => {
            setRenewResult(null); setRenewError('');
            // Pre-fill: start = day after current end, end left blank (backend mirrors duration)
            const end = contract.absolute_end_date || contract.probable_end_date || contract.first_end_date;
            if (end) {
              const d = new Date(end);
              d.setDate(d.getDate() + 1);
              setRenewStart(d.toISOString().slice(0, 10));
            } else {
              setRenewStart('');
            }
            setRenewEnd('');
            setRenewCopyConds(true);
            setRenewModal(true);
          }}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#4361ee', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 }}>
            🔄 Renouveler
          </button>
        )}
        {contract.status === 'draft' && <button onClick={onDelete} style={btnDanger}>🗑 Delete</button>}
      </div>

      {/* ── Quittancement modal ── */}
      {qModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 4 }}>📄 Quittancement automatique</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 20 }}>Contrat {contract.contract_number}</div>
            {qError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{qError}</div>}
            {qResult ? (
              <div>
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 8 }}>✅ {qResult.total_created} facture(s) créée(s)</div>
                  {qResult.created.map((c, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                      • {c.condition_type.replace(/_/g, ' ')} — <strong>{c.currency} {parseFloat(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> — échéance {c.due_date}
                    </div>
                  ))}
                  {qResult.total_skipped > 0 && <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 8 }}>{qResult.total_skipped} doublon(s) ignoré(s)</div>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setQModal(false); setQResult(null); if (onRefresh) onRefresh(); API.get(`/commercial/invoices?contract_id=${contract.id}`).then(r => setInvoices(r.data || [])); }}
                    style={btnPrimary}>Fermer</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Période du</label>
                    <input style={inputStyle} type="date" value={qFrom} onChange={e => setQFrom(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Au</label>
                    <input style={inputStyle} type="date" value={qTo} onChange={e => setQTo(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={async () => {
                    if (!qFrom || !qTo) { setQError('Sélectionnez les dates de période'); return; }
                    setQLoading(true); setQError('');
                    try {
                      const r = await API.post(`/commercial/contracts/${contract.id}/generate-invoices?period_from=${qFrom}&period_to=${qTo}`);
                      setQResult(r.data);
                    } catch(e) { setQError(parseApiError(e, 'Erreur lors de la génération')); }
                    finally { setQLoading(false); }
                  }} style={btnPrimary} disabled={qLoading}>
                    {qLoading ? 'Génération…' : '⚡ Générer'}
                  </button>
                  <button onClick={() => setQModal(false)} style={btnSecondary}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── IPC modal ── */}
      {ipcModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 4 }}>📈 Révision IPC</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 20 }}>Contrat {contract.contract_number} — révise toutes les conditions IPC actives</div>
            {ipcError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{ipcError}</div>}
            {ipcResult ? (
              <div>
                <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#854d0e', marginBottom: 8 }}>✅ Révision appliquée</div>
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>📊 Ancien indice : <strong>{ipcResult.old_index}</strong></span>
                    <span>📊 Nouvel indice : <strong>{ipcResult.new_index}</strong></span>
                    <span>📈 Variation : <strong style={{ color: ipcResult.revision_pct >= 0 ? '#15803d' : '#dc2626' }}>{ipcResult.revision_pct >= 0 ? '+' : ''}{ipcResult.revision_pct}%</strong></span>
                    <span>📋 {ipcResult.conditions_updated} condition(s) mise(s) à jour</span>
                  </div>
                </div>
                <button onClick={() => { setIpcModal(false); setIpcResult(null); }} style={btnPrimary}>Fermer</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Nouvel indice *</label>
                    <input style={inputStyle} type="number" step="0.01" value={ipcIndex} onChange={e => setIpcIndex(e.target.value)} placeholder="ex: 115.30" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Date d'application *</label>
                    <input style={inputStyle} type="date" value={ipcDate} onChange={e => setIpcDate(e.target.value)} />
                  </div>
                </div>
                <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#854d0e', marginBottom: 16 }}>
                  ⚠️ Cette action crée de nouvelles conditions avec le loyer révisé et ferme les anciennes. Elle est irréversible.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={async () => {
                    if (!ipcIndex || !ipcDate) { setIpcError('Indice et date requis'); return; }
                    setIpcLoading(true); setIpcError('');
                    try {
                      const r = await API.post(`/commercial/contracts/${contract.id}/apply-ipc?new_index=${ipcIndex}&applied_date=${ipcDate}`);
                      setIpcResult(r.data);
                    } catch(e) { setIpcError(parseApiError(e, 'Erreur lors de la révision IPC')); }
                    finally { setIpcLoading(false); }
                  }} style={{ ...btnPrimary, background: '#ca8a04' }} disabled={ipcLoading}>
                    {ipcLoading ? 'Application…' : '📈 Appliquer'}
                  </button>
                  <button onClick={() => setIpcModal(false)} style={btnSecondary}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Termination modal ── */}
      {termModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 4 }}>🛑 Résiliation du contrat</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 20 }}>Contrat {contract.contract_number}</div>
            {termError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>{termError}</div>}
            {termResult ? (
              <div>
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>✅ Contrat résilié</div>
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>📅 Date effective : <strong>{termResult.effective_date}</strong></span>
                    <span>🏠 Espaces libérés : <strong>{termResult.spaces_freed.join(', ') || 'aucun'}</strong></span>
                    <span>📋 Conditions fermées : <strong>{termResult.conditions_closed}</strong></span>
                    {termResult.vacancy_postings_created.length > 0 && (
                      <span>🏚️ Vacancy postings créés : <strong>{termResult.vacancy_postings_created.join(', ')}</strong></span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setTermModal(false); setTermResult(null); if (onRefresh) onRefresh(); onClose(); }} style={btnPrimary}>Fermer</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Date de préavis *</label>
                    <input style={inputStyle} type="date" value={termNotice} onChange={e => setTermNotice(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Date effective *</label>
                    <input style={inputStyle} type="date" value={termEffective} onChange={e => setTermEffective(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Motif (optionnel)</label>
                  <input style={inputStyle} value={termReason} onChange={e => setTermReason(e.target.value)} placeholder="ex: Départ anticipé du locataire" />
                </div>
                <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={termVacancy} onChange={e => setTermVacancy(e.target.checked)} />
                    <span style={{ fontWeight: 600 }}>Créer des vacancy postings pour les espaces libérés</span>
                  </label>
                  {termVacancy && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6 }}>Loyer de marché (/m²/an)</label>
                      <input style={inputStyle} type="number" step="0.01" value={termRent} onChange={e => setTermRent(e.target.value)} placeholder="ex: 250" />
                    </div>
                  )}
                </div>
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>
                  ⚠️ Cette action ferme le contrat, libère les espaces (statut → vacant) et clôt les conditions actives. Elle est irréversible.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={async () => {
                    if (!termNotice || !termEffective) { setTermError('Dates de préavis et effective requises'); return; }
                    setTermLoading(true); setTermError('');
                    try {
                      let url = `/commercial/contracts/${contract.id}/terminate?notice_date=${termNotice}&effective_date=${termEffective}&create_vacancy=${termVacancy}`;
                      if (termRent) url += `&market_rent=${termRent}`;
                      if (termReason) url += `&reason=${encodeURIComponent(termReason)}`;
                      const r = await API.post(url);
                      setTermResult(r.data);
                    } catch(e) { setTermError(parseApiError(e, 'Erreur lors de la résiliation')); }
                    finally { setTermLoading(false); }
                  }} style={{ ...btnPrimary, background: '#dc2626' }} disabled={termLoading}>
                    {termLoading ? 'Résiliation…' : '🛑 Confirmer la résiliation'}
                  </button>
                  <button onClick={() => setTermModal(false)} style={btnSecondary}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Renewal modal ── */}
      {renewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 460, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 4 }}>🔄 Renouveler le contrat</div>
            <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 20 }}>
              Crée un nouveau contrat en <strong>brouillon</strong> à partir de {contract.contract_number}, avec les mêmes espaces, partenaire et conditions.
            </div>

            {renewResult ? (
              <div>
                <div style={{ background: '#ecfdf5', border: '1px solid #86efac', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', marginBottom: 4 }}>✓ Contrat renouvelé</div>
                  <div style={{ fontSize: 13, color: '#166534' }}>
                    Nouveau contrat <strong>{renewResult.contract_number}</strong> créé en brouillon.
                    Vérifiez les conditions puis activez-le (Release).
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setRenewModal(false); if (onRefresh) onRefresh(); }} style={btnPrimary}>Fermer</button>
                </div>
              </div>
            ) : (
              <>
                {renewError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
                    ⚠️ {renewError}
                  </div>
                )}
                <Field label="Date de début du nouveau contrat">
                  <input type="date" value={renewStart} onChange={e => setRenewStart(e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Date de fin (optionnel — sinon même durée que l'original)">
                  <input type="date" value={renewEnd} onChange={e => setRenewEnd(e.target.value)} style={inputStyle} />
                </Field>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--slate)', marginBottom: 20, cursor: 'pointer' }}>
                  <input type="checkbox" checked={renewCopyConds} onChange={e => setRenewCopyConds(e.target.checked)} />
                  Copier les conditions (loyers, charges) sur le nouveau contrat
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={async () => {
                    setRenewLoading(true); setRenewError('');
                    try {
                      const params = new URLSearchParams();
                      if (renewStart) params.set('new_start_date', renewStart);
                      if (renewEnd) params.set('new_end_date', renewEnd);
                      params.set('copy_conditions', renewCopyConds);
                      const r = await API.post(`/commercial/contracts/${contract.id}/renew?${params.toString()}`);
                      setRenewResult(r.data);
                    } catch (e) {
                      setRenewError(parseApiError(e, 'Erreur lors du renouvellement.'));
                    } finally {
                      setRenewLoading(false);
                    }
                  }} style={{ ...btnPrimary, background: '#4361ee', color: 'white' }} disabled={renewLoading}>
                    {renewLoading ? '...' : '🔄 Créer le renouvellement'}
                  </button>
                  <button onClick={() => setRenewModal(false)} style={btnSecondary}>Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Compact contract card for the left list panel ────────────────────────────
function ContractListItem({ contract, active, onClick, t }) {
  const s = getContractStatus(contract.status, t);
  const days = daysUntil(contract.absolute_end_date);
  const expiring = days !== null && days <= 90 && days > 0 && contract.status === 'released';
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
        border: `1.5px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
        background: active ? 'var(--cream)' : 'white',
        transition: 'all .12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--gold)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{contract.contract_number || `#${contract.id}`}</span>
        <span style={{ background: s.bg, color: s.text, borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{s.label}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{contract.business_partner?.company_name || '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--slate)' }}>{contract.business_entity?.name || '—'}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{contract.contract_type === 'lease_out' ? 'LO' : 'LI'}</span>
        {expiring && (
          <span style={{ color: '#f57f17', fontSize: 11, fontWeight: 700 }}>⚠ {days}j</span>
        )}
      </div>
    </div>
  );
}

export default function Contracts() {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;

  const downloadStatement = async (contractId, contractNumber) => {
    try {
      const res = await API.get(`/pdf/lease-statement/${contractId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `lease_statement_${contractNumber || contractId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Échec du téléchargement du PDF');
    }
  };

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);   // 'new' | 'edit' | null
  const [selected, setSelected] = useState(null);   // contract shown in right panel
  const [editTarget, setEditTarget] = useState(null);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [confirm, setConfirm]   = useState(null);
  const [releaseError, setReleaseError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API.get('/commercial/contracts');
      setContracts(r.data);
      // keep right-panel selection fresh after a reload
      setSelected(prev => prev ? (r.data || []).find(c => c.id === prev.id) || null : null);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const release = async (id) => {
    setReleaseError('');
    try {
      await API.patch(`/commercial/contracts/${id}`, { status: 'released' });
      const r = await API.get('/commercial/contracts');
      setContracts(r.data);
      const updated = (r.data || []).find(c => c.id === id);
      if (updated) setSelected(updated);
    } catch (e) {
      setReleaseError(parseApiError(e, 'Erreur lors de la mise en Released.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/commercial/contracts/${id}`);
      toast.success('Contrat supprimé');
      setConfirm(null);
      if (selected?.id === id) setSelected(null);
      load();
    } catch {
      toast.error(t.common.deleteFailed);
    }
  };

  // Filter + search
  const filtered = contracts.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${c.contract_number || ''} ${c.business_partner?.company_name || ''} ${c.business_entity?.name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const expiringCount = contracts.filter(c => {
    const d = daysUntil(c.absolute_end_date);
    return d !== null && d <= 90 && d > 0 && c.status === 'released';
  }).length;

  const filterCounts = {
    all: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    released: contracts.filter(c => c.status === 'released').length,
    terminated: contracts.filter(c => c.status === 'terminated').length,
    expired: contracts.filter(c => c.status === 'expired').length,
  };

  return (
    <div className="animate-fade">
      <PageHeader title={tc.contractsTitle} sub={tc.contractsSub} />

      {expiringCount > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #f9a825', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#e65100' }}>
          ⚠ <strong>{expiringCount} contrat{expiringCount > 1 ? 's' : ''}</strong> expire{expiringCount > 1 ? 'nt' : ''} dans les 90 prochains jours
        </div>
      )}

      {/* ── Split panel layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ─── LEFT: list panel ─── */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 14, position: 'sticky', top: 16, maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>

          {/* New button */}
          <button onClick={() => { setEditTarget(null); setModal('new'); }} style={{ ...btnPrimary, width: '100%', marginBottom: 12 }}>
            + {tc.newContract}
          </button>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher (n°, locataire, bien)…"
            style={{ ...inputStyle, marginBottom: 10, fontSize: 13 }}
          />

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {['all', 'draft', 'released', 'terminated', 'expired'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: filter === f ? 'var(--ink)' : 'white', color: filter === f ? 'var(--gold)' : 'var(--slate)', textTransform: 'capitalize' }}>
                {f === 'all' ? (t.commercial?.allStatuses || 'Tous') : getContractStatus(f, t).label} ({filterCounts[f]})
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 200 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>{t.common.loading}</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>
                {contracts.length === 0 ? 'Aucun contrat. Créez-en un.' : 'Aucun résultat.'}
              </div>
            ) : (
              filtered.map(c => (
                <ContractListItem
                  key={c.id}
                  contract={c}
                  active={selected?.id === c.id}
                  onClick={() => { setSelected(c); setReleaseError(''); }}
                  t={t}
                />
              ))
            )}
          </div>
        </div>

        {/* ─── RIGHT: detail panel ─── */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24, minHeight: 400 }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--slate)', textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.4 }}>📄</div>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: 18, marginBottom: 6 }}>Sélectionnez un contrat</div>
              <div style={{ fontSize: 13, maxWidth: 280 }}>Choisissez un contrat dans la liste pour voir ses détails, conditions et factures.</div>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontFamily: 'DM Serif Display', fontSize: 22 }}>{selected.title || selected.contract_number || `#${selected.id}`}</div>
                  <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>
                    {selected.title ? `${selected.contract_number || `#${selected.id}`} · ` : ''}{selected.business_partner?.company_name || '—'}
                    {selected.jurisdiction ? ` · ⚖ ${selected.jurisdiction}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => downloadStatement(selected.id, selected.contract_number)} title="Télécharger le relevé PDF"
                    style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 15 }}>📄</button>
                  <button onClick={() => { setSelected(null); }} title="Fermer le détail"
                    style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans' }}>✕</button>
                </div>
              </div>

              {releaseError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
                  ⚠️ {releaseError}
                </div>
              )}

              <ContractDetail
                key={selected.id}
                contract={selected}
                onClose={() => setSelected(null)}
                onRelease={release}
                onEdit={() => { setEditTarget(selected); setModal('edit'); }}
                onDelete={() => setConfirm(selected)}
                onRefresh={load}
                t={t}
              />
            </>
          )}
        </div>
      </div>

      {/* ── New/Edit form modal (form input — modal is appropriate here) ── */}
      {(modal === 'new' || modal === 'edit') && (
        <Modal title={modal === 'edit' ? `${t.common.edit} — ${editTarget?.contract_number || "#" + editTarget?.id}` : tc.newContract} onClose={() => setModal(null)}>
          <ContractForm onSave={load} onClose={() => setModal(null)} initial={modal === 'edit' ? editTarget : null} existingItems={contracts} />
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      {confirm && (
        <Modal title={t.common.confirm + " " + t.common.delete} onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>Supprimer le contrat <strong>{confirm.contract_number}</strong> ? {t.common.deleteConfirm}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)} style={btnDanger}>Supprimer</button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>{t.common.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
