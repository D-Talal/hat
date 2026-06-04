import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import KPICard from "../shared/KPICard";
import { useLanguage } from "../../context/LanguageContext";
import { useFormat } from "../../data/format";

const pct = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

const CustomTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 10, padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 16px rgba(15,17,40,0.08)" }}>
      <p style={{ color: "#9ea4be", marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ color: "#0f1117", fontFamily: "DM Mono, monospace", fontWeight: 500 }}>{fmt ? fmt(payload[0].value) : (payload[0].value || 0)}</p>
    </div>
  );
};

export default function FinanceSection({ data, module }) {
  const { t } = useLanguage();
  const { money, date: fmtDate } = useFormat();
  const fmt = (n) => money(n, { maximumFractionDigits: 0 });
  const d = t.dashboard;
  if (!data) return null;

  const trend = pct(data.revenue_this_month, data.revenue_last_month);
  const isCommercial = module === "commercial" || module === "all";

  const chartData = (data.revenue_by_month || []).map((item) => {
    const [year, month] = item.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...item,
      label: fmtDate(date, { month: "short", year: "2-digit" }),
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

      {/* Revenue KPIs */}
      <div className="kpi-grid">
        <KPICard label={d.revenueThisMonth} value={fmt(data.revenue_this_month)} color="blue"
          trend={trend} trendLabel={d.vsPrevMonth} />
        <KPICard label={d.totalRevenue} value={fmt(data.total_revenue)} sub={d.sinceBeginning} color="green" />
        {isCommercial && (
          <KPICard label={d.pendingInvoices} value={fmt(data.outstanding_invoices)} color="orange" />
        )}
        {isCommercial && (
          <KPICard label={d.overdueInvoices} value={fmt(data.overdue_invoices)} color="red" />
        )}
      </div>

      {/* Commercial operational KPIs */}
      {isCommercial && (data.active_contracts > 0 || data.expiring_soon > 0 || data.pending_maintenance > 0) && (
        <div className="kpi-grid" style={{ marginTop: 12 }}>
          {data.active_contracts != null && (
            <KPICard label={d.activeContracts} value={data.active_contracts} color="blue" />
          )}
          {data.expiring_soon != null && (
            <KPICard label={d.expiringSoon} value={data.expiring_soon}
              color={data.expiring_soon > 0 ? "orange" : "green"} />
          )}
          {data.pending_maintenance != null && (
            <KPICard label={d.pendingMaintenance} value={data.pending_maintenance}
              color={data.pending_maintenance > 0 ? "orange" : "green"} />
          )}
        </div>
      )}

      {/* Monthly revenue chart */}
      {chartData.length > 0 && (
        <div className="chart-wrapper">
          <p className="chart-title">{d.monthlyRevenue}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="32%">
              <CartesianGrid vertical={false} stroke="#f0f1f6" strokeDasharray="0" />
              <XAxis dataKey="label" tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip fmt={fmt} />} cursor={{ fill: "rgba(67,97,238,0.05)", radius: 6 }} />
              <Bar dataKey="amount" fill="#4361ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
