import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import KPICard from "../shared/KPICard";
import { useLanguage } from "../../context/LanguageContext";

const fmt = (n, lang) =>
  new Intl.NumberFormat(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    style: "currency", currency: "CAD", maximumFractionDigits: 0
  }).format(n || 0);

const pct = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

const CustomTooltip = ({ active, payload, label, lang }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 10, padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 16px rgba(15,17,40,0.08)" }}>
      <p style={{ color: "#9ea4be", marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ color: "#0f1117", fontFamily: "DM Mono, monospace", fontWeight: 500 }}>{fmt(payload[0].value, lang)}</p>
    </div>
  );
};

export default function FinanceSection({ data, module }) {
  const { t, language } = useLanguage();
  const d = t.dashboard;
  if (!data) return null;

  const trend = pct(data.revenue_this_month, data.revenue_last_month);

  const chartData = (data.revenue_by_month || []).map((item) => {
    const [year, month] = item.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...item,
      label: date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', { month: "short", year: "2-digit" }),
    };
  });

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <div className="section-icon" style={{ background: "#eef0fd", color: "#4361ee" }}>💰</div>
        <div>
          <h2 className="section-title">{d.financeTitle}</h2>
          <p className="section-subtitle">{d.financeSub}</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard label={d.revenueThisMonth} value={fmt(data.revenue_this_month, language)} color="blue"
          trend={trend} trendLabel={d.vsPrevMonth} />
        <KPICard label={d.totalRevenue} value={fmt(data.total_revenue, language)} sub={d.sinceBeginning} color="green" />
        {(module === "commercial" || module === "all") && (
          <KPICard label={d.pendingInvoices} value={fmt(data.outstanding_invoices, language)} color="orange" />
        )}
        {(module === "commercial" || module === "all") && (
          <KPICard label={d.overdueInvoices} value={fmt(data.overdue_invoices, language)} color="red" />
        )}
      </div>

      {chartData.length > 0 && (
        <div className="chart-wrapper">
          <p className="chart-title">{d.monthlyRevenue}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="32%">
              <CartesianGrid vertical={false} stroke="#f0f1f6" strokeDasharray="0" />
              <XAxis dataKey="label" tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip lang={language} />} cursor={{ fill: "rgba(67,97,238,0.05)", radius: 6 }} />
              <Bar dataKey="amount" fill="#4361ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
