import { useState } from "react";
import API from "../api";
import { useLanguage } from "../context/LanguageContext";
import { PageHeader, Card } from "../components/UI";

const STEPS = [
  {
    key: "business-partners",
    icon: "👥",
    title: "Step 1 — Business Partners",
    titleFr: "Étape 1 — Partenaires d'affaires",
    desc: "Import your tenants, landlords and other partners.",
    descFr: "Importez vos locataires, propriétaires et autres partenaires.",
    required: ["company_name", "role"],
    note: "role must be: master_tenant, guarantor, landlord, vendor, or contact_person",
    noteFr: "role doit être : master_tenant, guarantor, landlord, vendor ou contact_person",
  },
  {
    key: "properties",
    icon: "🏢",
    title: "Step 2 — Properties & Units",
    titleFr: "Étape 2 — Propriétés & Unités",
    desc: "Import your properties, buildings and rental units. One row per unit.",
    descFr: "Importez vos entités, bâtiments et unités locatives. Une ligne par unité.",
    required: ["entity_name", "building_name", "unit_code"],
    note: "Entities and buildings are created once and reused for multiple units.",
    noteFr: "Les entités et bâtiments sont créés une fois et réutilisés pour plusieurs unités.",
  },
  {
    key: "contracts",
    icon: "📋",
    title: "Step 3 — Contracts",
    titleFr: "Étape 3 — Contrats",
    desc: "Import active leases. Partners and units must be imported first.",
    descFr: "Importez les baux actifs. Les partenaires et unités doivent être importés en premier.",
    required: ["contract_number", "tenant_company_name", "entity_name", "unit_code", "start_date", "end_date", "condition_type", "condition_amount", "condition_valid_from"],
    note: "condition_type: base_rent, service_charge, advance_payment, flat_rate",
    noteFr: "condition_type : base_rent, service_charge, advance_payment, flat_rate",
  },
];

function ResultPanel({ result, onClose }) {
  if (!result) return null;
  const hasErrors = result.errors?.length > 0;
  return (
    <div style={{ marginTop: 16, border: `1px solid ${hasErrors ? '#fca5a5' : '#86efac'}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: hasErrors ? '#fef2f2' : '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ {result.imported} imported</span>
          {result.skipped > 0 && <span style={{ color: '#9ea4be' }}>⏭ {result.skipped} skipped (already exist)</span>}
          {hasErrors && <span style={{ color: '#dc2626', fontWeight: 600 }}>❌ {result.errors.length} errors</span>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ea4be' }}>×</button>
      </div>
      {hasErrors && (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fef2f2' }}>
                <th style={{ padding: '6px 12px', textAlign: 'left', color: '#6b7280' }}>Row</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', color: '#6b7280' }}>Record</th>
                <th style={{ padding: '6px 12px', textAlign: 'left', color: '#6b7280' }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((e, i) => (
                <tr key={i} style={{ borderTop: '1px solid #fca5a5' }}>
                  <td style={{ padding: '6px 12px', color: '#dc2626', fontWeight: 600 }}>#{e.row}</td>
                  <td style={{ padding: '6px 12px', color: '#374151' }}>{e.company || e.unit || e.contract || '—'}</td>
                  <td style={{ padding: '6px 12px', color: '#6b7280' }}>{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ImportStep({ step, language }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const title = language === 'fr' ? step.titleFr : step.title;
  const desc  = language === 'fr' ? step.descFr  : step.desc;
  const note  = language === 'fr' ? step.noteFr  : step.note;

  const downloadTemplate = async () => {
    try {
      const res = await API.get(`/import/template/${step.key}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${step.key}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download template');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await API.post(`/import/${step.key}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setFile(null);
    } catch (e) {
      setResult({ imported: 0, skipped: 0, errors: [{ row: '?', error: e.response?.data?.detail || e.message }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{step.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 4 }}>{desc}</div>
          <div style={{ fontSize: 11, color: '#9ea4be', fontStyle: 'italic' }}>{note}</div>
        </div>
        <button onClick={downloadTemplate} style={{
          padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}>
          📥 {language === 'fr' ? 'Template CSV' : 'CSV Template'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label style={{
          flex: 1, padding: '10px 14px', borderRadius: 8,
          border: `2px dashed ${file ? '#4361ee' : 'var(--border)'}`,
          cursor: 'pointer', fontSize: 13,
          background: file ? '#eef0fd' : 'transparent',
          color: file ? '#4361ee' : 'var(--slate)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <input type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files[0]); setResult(null); }} />
          {file ? `📄 ${file.name}` : (language === 'fr' ? '📂 Choisir un fichier CSV...' : '📂 Choose a CSV file...')}
        </label>
        <button
          onClick={handleImport}
          disabled={!file || loading}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: file && !loading ? '#4361ee' : '#e5e7eb',
            color: file && !loading ? 'white' : '#9ea4be',
            cursor: file && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 600, fontSize: 13,
          }}
        >
          {loading ? '⏳ Importing...' : (language === 'fr' ? '⬆ Importer' : '⬆ Import')}
        </button>
      </div>

      <ResultPanel result={result} onClose={() => setResult(null)} />
    </Card>
  );
}

export default function CsvImport() {
  const { t, language } = useLanguage();
  const [status, setStatus] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await API.get('/import/status');
      setStatus(res.data);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 780, margin: '0 auto' }}>
      <PageHeader
        title={language === 'fr' ? 'Import CSV' : 'CSV Import'}
        sub={language === 'fr' ? 'Migrez vos données existantes en 3 étapes' : 'Migrate your existing data in 3 steps'}
      />

      {/* Current counts */}
      <div style={{ background: '#f8f9fc', borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#9ea4be', textTransform: 'uppercase' }}>
          {language === 'fr' ? 'Données actuelles' : 'Current data'}
        </span>
        {status ? (
          <>
            {[
              ['Partners', status.business_partners],
              ['Properties', status.business_entities],
              ['Buildings', status.buildings],
              ['Units', status.rental_objects],
              ['Contracts', status.contracts],
            ].map(([label, count]) => (
              <span key={label} style={{ fontSize: 13 }}>
                <strong style={{ color: '#4361ee' }}>{count}</strong>{' '}
                <span style={{ color: '#6b7280' }}>{label}</span>
              </span>
            ))}
          </>
        ) : (
          <button onClick={loadStatus} style={{ fontSize: 12, color: '#4361ee', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {language === 'fr' ? 'Vérifier les données actuelles →' : 'Check current data →'}
          </button>
        )}
        {status && (
          <button onClick={loadStatus} style={{ fontSize: 11, color: '#9ea4be', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>↻</button>
        )}
      </div>

      {/* Import steps */}
      {STEPS.map(step => (
        <ImportStep key={step.key} step={step} language={language} />
      ))}

      {/* Instructions */}
      <div style={{ background: '#fff7ed', borderRadius: 10, padding: '14px 18px', fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
        <strong>⚠️ {language === 'fr' ? 'Important' : 'Important'}</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          <li>{language === 'fr' ? 'Respectez l\'ordre : Partenaires → Propriétés → Contrats' : 'Follow the order: Partners → Properties → Contracts'}</li>
          <li>{language === 'fr' ? 'Les lignes déjà existantes sont ignorées (pas de doublons)' : 'Existing records are skipped (no duplicates)'}</li>
          <li>{language === 'fr' ? 'Les colonnes avec * sont obligatoires' : 'Columns marked with * are required'}</li>
          <li>{language === 'fr' ? 'Format de date : AAAA-MM-JJ (ex: 2024-01-15)' : 'Date format: YYYY-MM-DD (e.g. 2024-01-15)'}</li>
          <li>{language === 'fr' ? 'Téléchargez les templates pour voir des exemples' : 'Download templates to see examples'}</li>
        </ul>
      </div>
    </div>
  );
}
