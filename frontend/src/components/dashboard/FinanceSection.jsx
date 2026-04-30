import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import KPICard from "../shared/KPICard";

const fmt = (n) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);

const pct = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#181c27", border: "0.5px solid #2a2f45",
      borderRadius: 8, padding: "10px 14px", fontSize: 13,
    }}>
      <p style={{ color: "#8b90a8", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#e8eaf2", fontFamily: "DM Mono, monospace" }}>
        {fmt(payload[0].value)}
      </p>
    </div>
  );
};

export default function FinanceSection({ data, module }) {
  if (!data) return null;

  const trend = pct(data.revenue_this_month, data.revenue_last_month);

  const chartData = (data.revenue_by_month || []).map((d) => {
    const [year, month] = d.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...d,
      label: date.toLocaleDateString("fr-CA", { month: "short", year: "2-digit" }),
    };
  });

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <div className="section-icon" style={{ background: "rgba(74,124,255,0.12)", color: "#4a7cff" }}>
          💰
        </div>
        <div>
          <h2 className="section-title">Finance & Revenus</h2>
          <p className="section-subtitle">Revenus encaissés, factures et tendances</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard
          label="Revenus ce mois"
          value={fmt(data.revenue_this_month)}
          color="blue"
          trend={trend}
        />
        <KPICard
          label="Revenus totaux"
          value={fmt(data.total_revenue)}
          sub="Depuis le début"
          color="green"
        />
        {(module === "commercial" || module === "all") && (
          <KPICard
            label="Factures en attente"
            value={fmt(data.outstanding_invoices)}
            color="orange"
          />
        )}
        {(module === "commercial" || module === "all") && (
          <KPICard
            label="Factures en retard"
            value={fmt(data.overdue_invoices)}
            color="red"
          />
        )}
      </div>

      {chartData.length > 0 && (
        <div className="chart-wrapper">
          <p className="chart-title">Revenus mensuels — 12 derniers mois</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#2a2f45" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#555c78", fontSize: 11, fontFamily: "DM Sans" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: "#555c78", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(74,124,255,0.06)" }} />
              <Bar dataKey="amount" fill="#4a7cff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
