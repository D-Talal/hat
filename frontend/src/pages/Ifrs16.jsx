import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import API from '../api';
import { posting } from '../api';
import { PageHeader } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { inputStyle, btnPrimary, btnSecondary } from '../data/styles';

// ── Helpers ───────────────────────────────────────────────────────────────────
const money = (n, cur = '') => {
  if (n === null || n === undefined) return '—';
  return `${cur ? cur + ' ' : ''}${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const moneyShort = (n) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return Number(n || 0).toFixed(0);
};
const fmtMonth = (dateStr, lang) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short', year: 'numeric' });
};

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8eaf0', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 16px rgba(15,17,40,0.08)' }}>
      <p style={{ color: '#9ea4be', marginBottom: 6, fontSize: 12 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {money(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── KPI box ───────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: '#f8f9fa', borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: 'var(--ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Ifrs16() {
  const { t, language } = useLanguage();
  const tc = t.commercial;

  const [schedules, setSchedules] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [selected, setSelected] = useState(null);  // schedule object
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [error, setError] = useState('');

  // Load schedules + contract map
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sch, ctr] = await Promise.all([
        posting.ifrs16List(),
        API.get('/commercial/contracts'),
      ]);
      setSchedules(sch.data || []);
      setContracts(ctr.data || []);
    } catch (e) {
      setError('Impossible de charger les échéanciers IFRS 16.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load lines when a schedule is selected
  useEffect(() => {
    if (!selected) { setLines([]); return; }
    setLoadingLines(true);
    posting.ifrs16Lines(selected.id)
      .then(r => setLines(r.data || []))
      .catch(() => setLines([]))
      .finally(() => setLoadingLines(false));
  }, [selected]);

  const contractLabel = (cid) => {
    const c = contracts.find(x => x.id === cid);
    if (!c) return `#${cid}`;
    return c.contract_number || `#${cid}`;
  };
  const contractTenant = (cid) => {
    const c = contracts.find(x => x.id === cid);
    return c?.business_partner?.company_name || '—';
  };

  // Chart data: liability vs RoU balance over time
  const chartData = lines.map(l => ({
    label: fmtMonth(l.period_date, language),
    Passif: l.liability_close,
    RoU: l.rou_close,
  }));

  // Progress: how much of the schedule is posted
  const postedCount = lines.filter(l => l.posted).length;
  const progressPct = lines.length ? Math.round(postedCount / lines.length * 100) : 0;

  return (
    <div className="animate-fade">
      <PageHeader
        title={tc.ifrs16Title || 'IFRS 16 — Échéanciers'}
        sub={tc.ifrs16Sub || "Actifs de droit d'utilisation et passifs locatifs"}
      />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          ⚠️ {error}
          <button onClick={load} style={{ ...btnSecondary, marginLeft: 12, padding: '4px 12px', fontSize: 12 }}>Réessayer</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: schedule list ── */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 14, position: 'sticky', top: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 12 }}>
            Échéanciers actifs ({schedules.length})
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>Chargement…</div>
          ) : schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--slate)', fontSize: 13 }}>
              Aucun échéancier IFRS 16.
              <div style={{ fontSize: 12, marginTop: 6 }}>Créez-en un depuis le Posting Engine (Setup IFRS 16).</div>
            </div>
          ) : (
            schedules.map(s => {
              const active = selected?.id === s.id;
              return (
                <div key={s.id}
                  onClick={() => setSelected(s)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 8,
                    border: `1.5px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
                    background: active ? 'var(--cream)' : 'white', transition: 'all .12s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--gold)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border)'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{contractLabel(s.contract_id)}</span>
                    <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                      {(s.discount_rate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{contractTenant(s.contract_id)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate)' }}>
                    <span>Passif: <strong style={{ color: '#dc2626' }}>{moneyShort(s.liability_balance)}</strong></span>
                    <span>RoU: <strong style={{ color: '#4361ee' }}>{moneyShort(s.rou_balance)}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── RIGHT: detail panel ── */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: 24, minHeight: 400 }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--slate)', textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.4 }}>📋</div>
              <div style={{ fontFamily: 'DM Serif Display', fontSize: 18, marginBottom: 6 }}>Sélectionnez un échéancier</div>
              <div style={{ fontSize: 13, maxWidth: 300 }}>
                Choisissez un contrat à gauche pour voir son tableau d'amortissement IFRS 16 complet.
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontFamily: 'DM Serif Display', fontSize: 22 }}>{contractLabel(selected.contract_id)}</div>
                  <div style={{ fontSize: 13, color: 'var(--slate)', marginTop: 2 }}>
                    {contractTenant(selected.contract_id)} · Reconnaissance: {selected.recognition_date} · Taux: {(selected.discount_rate * 100).toFixed(2)}%
                  </div>
                </div>
                <span style={{ background: '#f0fdfa', color: '#0d9488', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700 }}>
                  {selected.currency}
                </span>
              </div>

              {/* KPIs */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <Kpi label="Passif initial" value={money(selected.initial_liability, selected.currency)} accent="#dc2626" />
                <Kpi label="Actif RoU initial" value={money(selected.initial_rou, selected.currency)} accent="#4361ee" />
                <Kpi label="Passif restant" value={money(selected.liability_balance, selected.currency)} sub={`Amorti cumulé: ${money(selected.accumulated_amort)}`} accent="#f59e0b" />
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>
                  <span>Progression de la comptabilisation</span>
                  <span><strong>{postedCount}</strong> / {lines.length} périodes ({progressPct}%)</span>
                </div>
                <div style={{ height: 8, background: '#f0f1f6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${progressPct}%`, height: '100%', background: '#0d9488', borderRadius: 99, transition: 'width .5s' }} />
                </div>
              </div>

              {/* Chart: liability vs RoU over time */}
              {chartData.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)', marginBottom: 12 }}>Évolution Passif vs Actif RoU</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#f0f1f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ea4be' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ea4be' }} axisLine={false} tickLine={false} tickFormatter={moneyShort} width={48} />
                      <Tooltip content={<ChartTip />} />
                      <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Passif" stroke="#dc2626" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="RoU" stroke="#4361ee" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Amortization table */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)', marginBottom: 12 }}>Tableau d'amortissement</div>
              {loadingLines ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>Chargement des lignes…</div>
              ) : lines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--slate)', fontSize: 13 }}>Aucune ligne d'amortissement.</div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', maxHeight: 420, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ background: '#f5f7ff' }}>
                        {['Période', 'Paiement', 'Intérêts', 'Remb. passif', 'Passif clôture', 'Amort. RoU', 'RoU clôture', ''].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: h && h !== 'Période' ? 'right' : 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--slate)', borderBottom: '1.5px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f0f1f6', background: l.posted ? '#f8fdf9' : 'transparent' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMonth(l.period_date, language)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{money(l.lease_payment)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#dc2626' }}>{money(l.interest_charge)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{money(l.liability_repay)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{money(l.liability_close)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#4361ee' }}>{money(l.rou_amort)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{money(l.rou_close)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                            {l.posted
                              ? <span title="Comptabilisé" style={{ color: '#16a34a', fontSize: 13 }}>✓</span>
                              : <span title="En attente" style={{ color: '#d1d5db', fontSize: 13 }}>○</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
