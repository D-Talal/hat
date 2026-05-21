import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import KPICard from "../shared/KPICard";
import { useLanguage } from "../../context/LanguageContext";

const fmt = (n, lang) =>
  new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    style: "currency", currency: "CAD", maximumFractionDigits: 0
  }).format(n || 0);

const CustomTooltip = ({ active, payload, label, lang, inLabel, outLabel }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 10, padding: "12px 16px", fontSize: 13, minWidth: 180, boxShadow: "0 4px 16px rgba(15,17,40,0.08)" }}>
      <p style={{ color: "#9ea4be", marginBottom: 8, fontWeight: 600, fontSize: 12 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 4 }}>
          <span style={{ color: p.color, fontWeight: 500 }}>{p.dataKey === 'inflow' ? inLabel : outLabel}</span>
          <span style={{ fontFamily: "DM Mono", color: "#0f1117", fontWeight: 500 }}>{fmt(p.value, lang)}</span>
        </div>
      ))}
    </div>
  );
};

export default function CashFlowSection({ data }) {
  const { t, language } = useLanguage();
  const d = t.dashboard;
  if (!data) return null;

  const chartData = (data.cashflow_by_month || []).map((item) => {
    const [year, month] = item.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...item,
      label: date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', { month: "short", year: "2-digit" }),
    };
  });

  const isPositive = (data.net_cashflow || 0) >= 0;

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <div className="section-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>📊</div>
        <div>
          <h2 className="section-title">{d.cashflowTitle}</h2>
          <p className="section-subtitle">{d.cashflowSub}</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard label={d.inflowThisMonth} value={fmt(data.inflow_this_month, language)} color="green" />
        <KPICard label={d.outflowThisMonth} value={fmt(data.outflow_this_month, language)} color="orange" />
        <KPICard label={d.netCashflow} value={fmt(data.net_cashflow, language)}
          color={isPositive ? "blue" : "red"} sub={isPositive ? d.surplus : d.deficit} />
      </div>

      {chartData.length > 0 && (
        <div className="chart-wrapper">
          <p className="chart-title">{d.cashflowChart}</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f0f1f6" />
              <XAxis dataKey="label" tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip lang={language} inLabel={d.inflows} outLabel={d.outflows} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ea4be", paddingTop: 16 }}
                formatter={(value) => value === 'inflow' ? d.inflows : d.outflows} />
              <Area type="monotone" dataKey="inflow"   name="inflow"   stroke="#10b981" strokeWidth={2.5} fill="url(#inflowGrad)"  dot={false} activeDot={{ r: 5, fill: "#10b981" }} />
              <Area type="monotone" dataKey="outflow"  name="outflow"  stroke="#ef4444" strokeWidth={2.5} fill="url(#outflowGrad)" dot={false} activeDot={{ r: 5, fill: "#ef4444" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
