import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import API from '../api';
import { useLanguage } from '../context/LanguageContext';
import '../components/Dashboard.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n, currency = '') => {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${currency}${(n / 1_000).toFixed(0)}k`;
  return `${currency}${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const pctChange = (current, prev) => {
  if (!prev || prev === 0) return null;
  return ((current - prev) / prev) * 100;
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KPI({ label, value, sub, color = 'blue', trend, icon, onClick, alert }) {
  return (
    <div
      onClick={onClick}
      className={`kpi-card ${color}`}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      {icon && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          fontSize: 22, opacity: 0.12,
        }}>{icon}</div>
      )}
      {alert && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: '#ef4444', color: '#fff',
          borderRadius: 20, fontSize: 10, fontWeight: 700,
          padding: '2px 7px', minWidth: 18, textAlign: 'center',
        }}>{alert}</div>
      )}
      <p className="kpi-label">{label}</p>
      <h2 className="kpi-value" style={{ fontSize: '1.6rem' }}>{value}</h2>
      {sub && <p className="kpi-sub">{sub}</p>}
      {trend !== null && trend !== undefined && (
        <span className={`kpi-badge ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs mois préc.
        </span>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, sub, action }) {
  return (
    <div className="section-header" style={{ marginBottom: '1.2rem' }}>
      <div className="section-icon" style={{ background: 'var(--db-blue-light)', color: 'var(--db-blue)' }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p className="section-title">{title}</p>
        {sub && <p className="section-subtitle">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function AlertBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div style={{
      background: '#fff8e1', border: '1.5px solid #f9a825',
      borderRadius: 12, padding: '12px 18px', marginBottom: 24,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
      <div>
        {alerts.map((a, i) => (
          <div key={i} style={{ fontSize: 13, color: '#e65100', marginBottom: i < alerts.length - 1 ? 4 : 0 }}>
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e8eaf0',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
      boxShadow: '0 4px 16px rgba(15,17,40,0.08)',
    }}>
      <p style={{ color: '#9ea4be', marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ color: '#0f1117', fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
        {prefix}{Number(payload[0].value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}

function OccupancyRing({ rate, label, total, occupied, vacant }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = (rate / 100) * circ;
  const color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e8eaf0', borderRadius: 16,
      padding: '20px 24px', boxShadow: 'var(--db-shadow)', flex: 1,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 16 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width={100} height={100} viewBox="0 0 100 100">
          <circle cx={50} cy={50} r={r} fill="none" stroke="#e8eaf0" strokeWidth={10} />
          <circle
            cx={50} cy={50} r={r} fill="none"
            stroke={color} strokeWidth={10}
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
          <text x={50} y={54} textAnchor="middle" style={{ fontFamily: 'DM Mono', fontSize: 16, fill: '#0f1117', fontWeight: 500 }}>
            {rate.toFixed(0)}%
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9ea4be', textTransform: 'uppercase', letterSpacing: '.05em' }}>Occupés</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 500, color: '#0f1117' }}>{occupied}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ea4be', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vacants</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 500, color: '#ef4444' }}>{vacant}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#9ea4be', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 18, fontWeight: 500, color: '#0f1117' }}>{total}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractStatusBadge({ status }) {
  const cfg = {
    released:   { bg: '#ecfdf5', color: '#059669', label: 'Actif' },
    draft:      { bg: '#fff8e1', color: '#d97706', label: 'Brouillon' },
    terminated: { bg: '#fef2f2', color: '#dc2626', label: 'Résilié' },
    expired:    { bg: '#f3f4f6', color: '#6b7280', label: 'Expiré' },
  }[status] || { bg: '#f3f4f6', color: '#6b7280', label: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

const DONUT_COLORS = ['#4361ee', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CommercialDashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [finance,   setFinance]   = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fin, occ, ctr, st] = await Promise.all([
        API.get('/dashboard/finance', { params: { module: 'commercial' } }),
        API.get('/dashboard/occupancy', { params: { module: 'commercial' } }),
        API.get('/commercial/contracts'),
        API.get('/commercial/stats'),
      ]);
      setFinance(fin.data);
      setOccupancy(occ.data);
      setContracts(ctr.data || []);
      setStats(st.data);
      setLastUpdated(new Date());
    } catch (e) {
      setError('Impossible de charger les données du tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const expiringContracts = contracts.filter(c => {
    const d = daysUntil(c.absolute_end_date);
    return d !== null && d <= 90 && d > 0 && c.status === 'released';
  }).sort((a, b) => new Date(a.absolute_end_date) - new Date(b.absolute_end_date));

  const draftContracts = contracts.filter(c => c.status === 'draft');
  const activeContracts = contracts.filter(c => c.status === 'released');

  const alerts = [];
  if (expiringContracts.length > 0)
    alerts.push(`${expiringContracts.length} contrat${expiringContracts.length > 1 ? 's' : ''} expire${expiringContracts.length === 1 ? '' : 'nt'} dans les 90 prochains jours`);
  if (finance?.overdue_invoices > 0)
    alerts.push(`${fmt(finance.overdue_invoices, '')} en factures impayées en souffrance`);
  if (draftContracts.length > 0)
    alerts.push(`${draftContracts.length} contrat${draftContracts.length > 1 ? 's' : ''} en statut brouillon — à finaliser`);

  // Revenue chart data
  const revenueData = (finance?.revenue_by_month || []).map(item => {
    const [year, month] = item.month.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return {
      label: d.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', { month: 'short', year: '2-digit' }),
      amount: item.amount,
    };
  });

  // Occupancy trend chart
  const occupancyTrend = (occupancy?.occupancy_trend || []).map(item => ({
    label: item.month,
    contrats: item.occupied,
  }));

  // Status donut data
  const statusCounts = ['released', 'draft', 'terminated', 'expired'].map(s => ({
    name: { released: 'Actifs', draft: 'Brouillons', terminated: 'Résiliés', expired: 'Expirés' }[s],
    value: contracts.filter(c => c.status === s).length,
  })).filter(d => d.value > 0);

  const occ = occupancy?.commercial || {};
  const revTrend = pctChange(finance?.revenue_this_month, finance?.revenue_last_month);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="dashboard-root animate-fade">
        <div className="dashboard-skeleton">
          {[1, 2].map(i => (
            <div key={i} className="skeleton-section">
              <div className="skeleton-title" />
              <div className="skeleton-cards">
                {[1, 2, 3, 4].map(j => <div key={j} className="skeleton-card" />)}
              </div>
              <div className="skeleton-chart" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-root">
        <div className="dashboard-error">
          <span>{error}</span>
          <button onClick={load}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root animate-fade">

      {/* ── Header ── */}
      <div className="dashboard-header" style={{ marginBottom: 8 }}>
        <div>
          <h1 className="dashboard-title">Tableau de bord Commercial</h1>
          {lastUpdated && (
            <span className="dashboard-updated">
              Mis à jour à {lastUpdated.toLocaleTimeString(language === 'fr' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="dashboard-controls">
          <button
            onClick={load}
            className="refresh-btn"
            title="Rafraîchir"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/commercial/contracts')}
            style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--db-blue)', color: '#fff', cursor: 'pointer' }}
          >
            + Nouveau contrat
          </button>
        </div>
      </div>

      {/* ── Alert banner ── */}
      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      <div className="dashboard-sections">

        {/* ══ SECTION 1 — PERFORMANCE FINANCIÈRE ══ */}
        <div className="dashboard-section">
          <SectionHeader icon="💰" title="Performance financière" sub="Loyers encaissés, en attente et tendances" />

          <div className="kpi-grid">
            <KPI
              label="Revenus ce mois"
              value={fmt(finance?.revenue_this_month, '')}
              sub="Factures payées"
              color="blue"
              trend={revTrend}
              icon="💳"
            />
            <KPI
              label="En attente"
              value={fmt(finance?.outstanding_invoices, '')}
              sub="Factures non réglées"
              color="amber"
              icon="⏳"
              onClick={() => navigate('/commercial/invoices')}
            />
            <KPI
              label="En souffrance"
              value={fmt(finance?.overdue_invoices, '')}
              sub="Échéance dépassée"
              color={finance?.overdue_invoices > 0 ? 'red' : 'green'}
              icon="🚨"
              onClick={() => navigate('/commercial/invoices')}
            />
            <KPI
              label="Total encaissé"
              value={fmt(finance?.total_revenue, '')}
              sub="Depuis le début"
              color="purple"
              icon="📈"
            />
          </div>

          {/* Revenue chart */}
          {revenueData.length > 0 && (
            <div className="chart-wrapper">
              <p className="chart-title">Revenus mensuels — 12 derniers mois</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#f0f1f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ea4be' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ea4be' }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmt(v)} width={52} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {revenueData.map((_, i) => (
                      <Cell key={i} fill={i === revenueData.length - 1 ? '#4361ee' : '#c7d0f8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ══ SECTION 2 — OCCUPATION DU PATRIMOINE ══ */}
        <div className="dashboard-section">
          <SectionHeader
            icon="🏢"
            title="Occupation du patrimoine"
            sub="Taux d'occupation, espaces vacants et tendance"
            action={
              <button
                onClick={() => navigate('/commercial/patrimoine')}
                style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e8eaf0', background: '#fff', color: '#5a5f7a', cursor: 'pointer' }}
              >
                Voir patrimoine →
              </button>
            }
          />

          <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <OccupancyRing
              label="Taux d'occupation"
              rate={occ.occupancy_rate || 0}
              total={occ.total_units || 0}
              occupied={occ.occupied || 0}
              vacant={occ.vacant || 0}
            />

            {/* Status donut */}
            {statusCounts.length > 0 && (
              <div style={{
                background: '#fff', border: '1.5px solid #e8eaf0', borderRadius: 16,
                padding: '20px 24px', boxShadow: 'var(--db-shadow)', flex: 1, minWidth: 220,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 8 }}>Contrats par statut</p>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={statusCounts} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={3}>
                      {statusCounts.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 160 }}>
              {[
                { label: 'Contrats actifs', value: activeContracts.length, color: '#10b981', bg: '#ecfdf5', nav: '/commercial/contracts' },
                { label: 'Brouillons', value: draftContracts.length, color: '#d97706', bg: '#fff8e1', nav: '/commercial/contracts' },
                { label: 'Maintenance', value: finance?.pending_maintenance || 0, color: '#8b5cf6', bg: '#f5f3ff', nav: null },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={() => item.nav && navigate(item.nav)}
                  style={{
                    background: item.bg, borderRadius: 12, padding: '12px 16px',
                    cursor: item.nav ? 'pointer' : 'default',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: `1px solid ${item.color}22`,
                  }}
                >
                  <span style={{ fontSize: 12, color: item.color, fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 500, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Occupancy trend */}
          {occupancyTrend.length > 0 && (
            <div className="chart-wrapper">
              <p className="chart-title">Évolution des contrats actifs — 6 derniers mois</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={occupancyTrend} barCategoryGap="40%">
                  <CartesianGrid vertical={false} stroke="#f0f1f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ea4be' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ea4be' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="contrats" fill="#4361ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ══ SECTION 3 — ALERTES & CONTRATS EXPIRANTS ══ */}
        {expiringContracts.length > 0 && (
          <div className="dashboard-section">
            <SectionHeader
              icon="⚡"
              title="Contrats expirant bientôt"
              sub="Dans les 90 prochains jours — action requise"
              action={
                <button
                  onClick={() => navigate('/commercial/contracts')}
                  style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1.5px solid #f9a825', background: '#fff8e1', color: '#d97706', cursor: 'pointer' }}
                >
                  Voir tous →
                </button>
              }
            />
            <div style={{
              background: '#fff', border: '1.5px solid #e8eaf0', borderRadius: 16,
              overflow: 'hidden', boxShadow: 'var(--db-shadow)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f6fa' }}>
                    {['Contrat', 'Locataire', 'Bien', 'Expiration', 'Jours restants', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ea4be', borderBottom: '1.5px solid #e8eaf0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expiringContracts.slice(0, 8).map(c => {
                    const days = daysUntil(c.absolute_end_date);
                    const urgency = days <= 30 ? { color: '#dc2626', bg: '#fef2f2' } : { color: '#d97706', bg: '#fff8e1' };
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate('/commercial/contracts')}
                        style={{ cursor: 'pointer', borderBottom: '1px solid #f0f1f6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8f9ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'DM Mono', fontWeight: 600, fontSize: 12 }}>{c.contract_number || `#${c.id}`}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.business_partner?.company_name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#9ea4be' }}>{c.business_entity?.name || '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#5a5f7a' }}>{c.absolute_end_date}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: urgency.bg, color: urgency.color, borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>
                            {days}j
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <ContractStatusBadge status={c.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {expiringContracts.length > 8 && (
                <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: 12, color: '#9ea4be', borderTop: '1px solid #f0f1f6' }}>
                  + {expiringContracts.length - 8} autres contrats — <span onClick={() => navigate('/commercial/contracts')} style={{ color: '#4361ee', cursor: 'pointer', fontWeight: 600 }}>voir tous</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ SECTION 4 — ACCÈS RAPIDES ══ */}
        <div className="dashboard-section">
          <SectionHeader icon="🚀" title="Accès rapides" sub="Actions fréquentes" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { icon: '📄', label: 'Contrats', sub: `${activeContracts.length} actifs`, path: '/commercial/contracts', color: '#eef0fd', accent: '#4361ee' },
              { icon: '🏢', label: 'Patrimoine', sub: `${occ.total_units || 0} espaces`, path: '/commercial/patrimoine', color: '#f0fdf4', accent: '#10b981' },
              { icon: '🤝', label: 'Partenaires', sub: 'Locataires & BP', path: '/commercial/partners', color: '#f5f3ff', accent: '#8b5cf6' },
              { icon: '🧾', label: 'Factures', sub: `${fmt(finance?.outstanding_invoices || 0)} en attente`, path: '/commercial/invoices', color: '#fffbeb', accent: '#f59e0b' },
              { icon: '🔒', label: 'Dépôts', sub: 'Garanties', path: '/commercial/deposit-contracts', color: '#fef2f2', accent: '#ef4444' },
              { icon: '📊', label: 'Décl. CA', sub: 'Loyer variable', path: '/commercial/sales-declarations', color: '#f0fdf4', accent: '#06b6d4' },
              { icon: '⚡', label: 'Posting Engine', sub: 'Comptabilisation', path: '/commercial/posting-engine', color: '#fafafa', accent: '#1a1a2e' },
              { icon: '📂', label: 'Import CSV', sub: 'Import données', path: '/commercial/csv-import', color: '#fafafa', accent: '#6b7280' },
            ].map(item => (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  background: item.color, borderRadius: 14, padding: '16px 18px',
                  cursor: 'pointer', border: `1px solid ${item.accent}22`,
                  transition: 'transform .15s, box-shadow .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: item.accent, marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#9ea4be' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
