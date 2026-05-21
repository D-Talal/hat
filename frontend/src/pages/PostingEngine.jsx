import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { PageHeader, Card, Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, boxSizing: 'border-box' };
const btnPrimary   = { padding: '11px 24px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14 };
const btnSecondary = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans' };
const btnGreen     = { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700 };

const STATUS_COLORS = {
  completed: { bg: '#ecfdf5', text: '#10b981' },
  failed:    { bg: '#fef2f2', text: '#ef4444' },
  running:   { bg: '#eff6ff', text: '#3b82f6' },
  pending:   { bg: '#fafafa', text: '#9ca3af' },
};

const MODULES = [
  { value: 'all',     label: 'All Modules',       icon: '⚡' },
  { value: 'rent',    label: 'Rent Only',          icon: '🏠' },
  { value: 'scs',     label: 'Service Charges',    icon: '⚖️' },
  { value: 'sales',   label: 'Sales-Based Rent',   icon: '📊' },
  { value: 'vacancy', label: 'Vacancy Postings',   icon: '🏚️' },
  { value: 'deposit', label: 'Security Deposits',  icon: '🔒' },
  { value: 'ifrs16',  label: 'IFRS 16',            icon: '📋' },
];

const ENTRY_TYPE_COLORS = {
  base_rent:        { bg: '#eef0fd', text: '#4361ee', label: 'Base Rent' },
  service_charge:   { bg: '#ecfdf5', text: '#10b981', label: 'Service Charge' },
  advance_payment:  { bg: '#fff7ed', text: '#f97316', label: 'Advance Payment' },
  flat_rate:        { bg: '#f5f3ff', text: '#8b5cf6', label: 'Flat Rate' },
  sales_based_rent: { bg: '#eff6ff', text: '#3b82f6', label: 'Sales-Based' },
  markup_fee:       { bg: '#f1f5f9', text: '#64748b', label: 'Markup Fee' },
  rent_free:        { bg: '#fef2f2', text: '#ef4444', label: 'Rent-Free' },
  abatement:        { bg: '#fdf4ff', text: '#a855f7', label: 'Abatement' },
  ipc_adjustment:   { bg: '#fefce8', text: '#ca8a04', label: 'IPC Adjustment' },
  scs_settlement:   { bg: '#ecfdf5', text: '#059669', label: 'SCS Settlement' },
  vacancy_cost:     { bg: '#fff1f2', text: '#e11d48', label: 'Vacancy Cost' },
  deposit_charge:   { bg: '#fff7ed', text: '#ea580c', label: 'Deposit Charge' },
  ifrs16_interest:  { bg: '#f0fdfa', text: '#0d9488', label: 'IFRS16 Interest' },
  ifrs16_amort:     { bg: '#f0fdf4', text: '#16a34a', label: 'IFRS16 Amort' },
  catchup:          { bg: '#fafafa', text: '#6b7280', label: 'Catch-up' },
};

function fmtAmt(v, cur = 'USD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(v || 0);
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop: 24, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}

// ── Run Detail Modal ──────────────────────────────────────────────────────────
function RunDetail({ run, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/posting/runs/${run.id}/entries`)
      .then(r => setEntries(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [run.id]);

  const byType = entries.reduce((acc, e) => {
    acc[e.entry_type] = (acc[e.entry_type] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <Modal title={`Run #${run.id} — ${run.period_from} → ${run.period_to}`} onClose={onClose}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Entries', value: run.total_entries },
          { label: 'Total Amount', value: fmtAmt(run.total_amount) },
          { label: 'Errors', value: run.error_count },
        ].map(s => (
          <div key={s.label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontFamily: 'DM Serif Display', fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* By type */}
      {Object.keys(byType).length > 0 && (
        <>
          <SectionTitle>Breakdown by Type</SectionTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {Object.entries(byType).map(([type, total]) => {
              const tc = ENTRY_TYPE_COLORS[type] || { bg: '#f5f5f5', text: '#666', label: type };
              return (
                <div key={type} style={{ background: tc.bg, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
                  <span style={{ color: tc.text, fontWeight: 700 }}>{tc.label}</span>
                  <span style={{ color: 'var(--slate)', marginLeft: 8 }}>{fmtAmt(total)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Errors */}
      {run.errors?.length > 0 && (
        <>
          <SectionTitle>Errors</SectionTitle>
          {run.errors.map((e, i) => (
            <div key={i} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626', marginBottom: 6 }}>{e}</div>
          ))}
        </>
      )}

      {/* Entries table */}
      <SectionTitle>Entries ({entries.length})</SectionTitle>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)' }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--slate)', fontSize: 13 }}>No entries (dry run or no data).</div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
              <tr>{['Type', 'Contract', 'Period', 'Amount', 'Currency'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const tc = ENTRY_TYPE_COLORS[e.entry_type] || { bg: '#f5f5f5', text: '#666', label: e.entry_type };
                return (
                  <tr key={e.id} onMouseEnter={ev => ev.currentTarget.style.background = '#f8f9fa'} onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ background: tc.bg, color: tc.text, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>{tc.label}</span>
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 12 }}>{e.contract_id ? `#${e.contract_id}` : '—'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)', fontSize: 12 }}>{e.period_from} → {e.period_to}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: e.amount < 0 ? '#ef4444' : 'var(--ink)' }}>{fmtAmt(e.amount, e.currency)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{e.currency}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

// ── IFRS16 Setup Modal ────────────────────────────────────────────────────────
function Ifrs16Setup({ onSave, onClose }) {
  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({ contract_id: '', discount_rate: '', initial_direct_costs: '0' });
  const [result, setResult] = useState(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    API.get('/commercial/contracts?status=released').then(r => setContracts(r.data || [])).catch(() => {});
  }, []);

  const save = async () => {
    const r = await API.post('/posting/ifrs16/setup', {
      contract_id: parseInt(form.contract_id),
      discount_rate: parseFloat(form.discount_rate),
      initial_direct_costs: parseFloat(form.initial_direct_costs || 0),
    });
    setResult(r.data);
  };

  return (
    <>
      <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
        ℹ IFRS 16 initial recognition calculates the present value of all future lease payments using the Incremental Borrowing Rate (IBR). This builds the full amortization schedule.
      </div>
      {!result ? (
        <>
          <Field label="Contract (Released) *">
            <select style={inputStyle} value={form.contract_id} onChange={set('contract_id')}>
              <option value="">— Select —</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.business_partner?.company_name}</option>)}
            </select>
          </Field>
          <Field label="Discount Rate (IBR) — e.g. 0.045 for 4.5%"><input style={inputStyle} type="number" step="0.001" value={form.discount_rate} onChange={set('discount_rate')} placeholder="0.045" /></Field>
          <Field label="Initial Direct Costs"><input style={inputStyle} type="number" value={form.initial_direct_costs} onChange={set('initial_direct_costs')} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            <button onClick={save} style={btnPrimary}>Build Schedule</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ background: '#ecfdf5', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: '#10b981' }}>✓ IFRS 16 Schedule Created</div>
            {[
              ['Initial Liability (PV)', fmtAmt(result.initial_liability, result.currency)],
              ['Right-of-Use Asset',    fmtAmt(result.initial_rou, result.currency)],
              ['Discount Rate (IBR)',   `${(result.discount_rate * 100).toFixed(2)}%`],
              ['Useful Life',           `${result.useful_life_months} months`],
              ['Recognition Date',      result.recognition_date],
              ['Currency',              result.currency],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: 'var(--slate)' }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => { onSave(); onClose(); }} style={btnGreen}>Done</button>
          </div>
        </>
      )}
    </>
  );
}

// ── IPC Modal ─────────────────────────────────────────────────────────────────
function IpcModal({ onSave, onClose }) {
  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({ contract_id: '', new_index: '', applied_date: '' });
  const [result, setResult] = useState(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    API.get('/commercial/contracts?status=released').then(r => setContracts(r.data || [])).catch(() => {});
  }, []);

  const apply = async () => {
    const r = await API.post('/posting/ipc/apply', {
      contract_id: parseInt(form.contract_id),
      new_index: parseFloat(form.new_index),
      applied_date: form.applied_date,
    });
    setResult(r.data);
  };

  return (
    <>
      <div style={{ background: '#fefce8', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#854d0e' }}>
        ⚠ IPC revision will simultaneously update ALL linked conditions on this contract. Before ACE: *40 and *50. After ACE: *40 only.
      </div>
      {!result ? (
        <>
          <Field label="Contract *">
            <select style={inputStyle} value={form.contract_id} onChange={set('contract_id')}>
              <option value="">— Select —</option>
              {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.business_partner?.company_name}</option>)}
            </select>
          </Field>
          <Field label="New IPC Index *"><input style={inputStyle} type="number" step="0.01" value={form.new_index} onChange={set('new_index')} placeholder="e.g. 108.5" /></Field>
          <Field label="Applied Date *"><input style={inputStyle} type="date" value={form.applied_date} onChange={set('applied_date')} /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            <button onClick={apply} style={btnPrimary}>Apply IPC</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ background: '#ecfdf5', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: '#10b981' }}>✓ IPC Applied</div>
            {[
              ['Old Index',           result.old_index],
              ['New Index',           result.new_index],
              ['Revision',            `${result.revision_pct > 0 ? '+' : ''}${result.revision_pct.toFixed(2)}%`],
              ['Conditions Updated',  result.conditions_updated?.length || 0],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: 'var(--slate)' }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { onSave(); onClose(); }} style={btnGreen}>Done</button>
        </>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PostingEngine() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  const [form, setForm] = useState({
    period_from: new Date().toISOString().slice(0, 7) + '-01',
    period_to:   '',
    module:      'all',
    dry_run:     true,
  });

  // Auto-set period_to to end of month
  useEffect(() => {
    if (form.period_from) {
      const d = new Date(form.period_from);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setForm(f => ({ ...f, period_to: lastDay.toISOString().slice(0, 10) }));
    }
  }, [form.period_from]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([API.get('/posting/stats'), API.get('/posting/runs')]);
      setStats(s.data); setRuns(r.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runPosting = async () => {
    setRunning(true);
    try {
      const r = await API.post('/posting/run', form);
      setSelectedRun(r.data);
      load();
    } catch (e) {
      alert('Run failed: ' + (e.response?.data?.detail || e.message));
    } finally { setRunning(false); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="animate-fade">
      <PageHeader title="Posting Engine" sub="SAP RE-FX RERAPP-inspired — run period postings, IPC, IFRS 16" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Runs', value: loading ? '…' : stats?.total_runs || 0, color: 'var(--ink)' },
          { label: 'Last Run Period', value: loading ? '…' : (stats?.last_run_period || '—'), color: '#1d4ed8' },
          { label: 'Total Posted', value: loading ? '…' : fmtAmt(stats?.total_posted_amount || 0), color: '#10b981' },
          { label: 'Pending IFRS16 Lines', value: loading ? '…' : stats?.pending_ifrs16_lines || 0, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: s.color, borderRadius: 12, padding: '16px 20px', color: 'white' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontFamily: 'DM Serif Display' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>

        {/* Left — Run configuration */}
        <div>
          <Card style={{ padding: 24 }}>
            <div style={{ fontFamily: 'DM Serif Display', fontSize: 18, marginBottom: 20 }}>Run Period Posting</div>

            <Field label="Period From">
              <input style={inputStyle} type="date" value={form.period_from} onChange={set('period_from')} />
            </Field>
            <Field label="Period To">
              <input style={inputStyle} type="date" value={form.period_to} onChange={set('period_to')} />
            </Field>
            <Field label="Module">
              <select style={inputStyle} value={form.module} onChange={set('module')}>
                {MODULES.map(m => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
              </select>
            </Field>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', marginBottom: 20, padding: '12px 14px', background: form.dry_run ? '#eff6ff' : '#fef2f2', borderRadius: 8, border: `1.5px solid ${form.dry_run ? '#bfdbfe' : '#fca5a5'}` }}>
              <input type="checkbox" checked={form.dry_run} onChange={set('dry_run')} />
              <div>
                <div style={{ fontWeight: 700, color: form.dry_run ? '#1d4ed8' : '#dc2626' }}>
                  {form.dry_run ? '🔍 Dry Run (Simulation)' : '⚡ Live Run (Will Post)'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>
                  {form.dry_run ? 'Calculates amounts without creating entries' : 'Will generate real accounting entries'}
                </div>
              </div>
            </label>

            <button onClick={runPosting} disabled={running} style={{ ...btnPrimary, width: '100%', opacity: running ? 0.6 : 1 }}>
              {running ? '⏳ Running…' : form.dry_run ? '🔍 Run Simulation' : '⚡ Run Posting'}
            </button>

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 4 }}>Other Actions</div>
              <button onClick={() => setModal('ipc')} style={{ ...btnSecondary, textAlign: 'left', padding: '10px 14px' }}>📈 Apply IPC Revision</button>
              <button onClick={() => setModal('ifrs16')} style={{ ...btnSecondary, textAlign: 'left', padding: '10px 14px' }}>📋 Setup IFRS 16 Schedule</button>
            </div>
          </Card>
        </div>

        {/* Right — Run history */}
        <div>
          <div style={{ fontFamily: 'DM Serif Display', fontSize: 18, marginBottom: 16 }}>Run History</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 20 }}>Loading…</div>
          ) : runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--slate)' }}>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 8 }}>No runs yet</div>
              <div style={{ fontSize: 14 }}>Run a simulation to see results here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {runs.map(r => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                const module = MODULES.find(m => m.value === r.module);
                return (
                  <Card key={r.id} style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setSelectedRun(r)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>#{r.id}</span>
                          <span style={{ background: sc.bg, color: sc.text, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{r.status}</span>
                          {r.dry_run && <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>DRY RUN</span>}
                          {module && <span style={{ background: '#f5f5f5', borderRadius: 5, padding: '2px 8px', fontSize: 11 }}>{module.icon} {module.label}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--slate)' }}>
                          {r.period_from} → {r.period_to}
                          {r.completed_at && <span style={{ marginLeft: 12 }}>· {new Date(r.completed_at).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtAmt(r.total_amount)}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate)' }}>{r.total_entries} entries</div>
                        {r.error_count > 0 && <div style={{ fontSize: 12, color: '#ef4444' }}>{r.error_count} errors</div>}
                      </div>
                    </div>
                    {r.summary && Object.keys(r.summary).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {Object.entries(r.summary).map(([key, val]) => val.count > 0 ? (
                          <span key={key} style={{ background: '#f5f5f5', borderRadius: 5, padding: '2px 8px', fontSize: 11 }}>
                            {key}: {val.count} · {fmtAmt(val.total)}
                          </span>
                        ) : null)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'ipc' && (
        <Modal title="Apply IPC Revision" onClose={() => setModal(null)}>
          <IpcModal onSave={load} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'ifrs16' && (
        <Modal title="Setup IFRS 16 Schedule" onClose={() => setModal(null)}>
          <Ifrs16Setup onSave={load} onClose={() => setModal(null)} />
        </Modal>
      )}
      {selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}
    </div>
  );
}
