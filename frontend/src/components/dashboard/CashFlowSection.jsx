import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import KPICard from "../shared/KPICard";

const fmt = (n) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#181c27", border: "0.5px solid #2a2f45",
      borderRadius: 8, padding: "12px 16px", fontSize: 13, minWidth: 180,
    }}>
      <p style={{ color: "#8b90a8", marginBottom: 8, fontWeight: 500 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 4 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontFamily: "DM Mono", color: "#e8eaf2" }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function CashFlowSection({ data }) {
  if (!data) return null;

  const chartData = (data.cashflow_by_month || []).map((d) => {
    const [year, month] = d.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...d,
      label: date.toLocaleDateString("fr-CA", { month: "short", year: "2-digit" }),
    };
  });

  const isPositive = (data.net_cashflow || 0) >= 0;

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <div className="section-icon" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
          📊
        </div>
        <div>
          <h2 className="section-title">Flux de Trésorerie</h2>
          <p className="section-subtitle">Entrées, sorties et solde net mensuel</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard label="Entrées ce mois" value={fmt(data.inflow_this_month)} color="green" />
        <KPICard label="Sorties ce mois" value={fmt(data.outflow_this_month)} color="orange" />
        <KPICard
          label="Solde net"
          value={fmt(data.net_cashflow)}
          color={isPositive ? "blue" : "red"}
          sub={isPositive ? "Excédent" : "Déficit"}
        />
      </div>

      {chartData.length > 0 && (
        <div className="chart-wrapper">
          <p className="chart-title">Flux de trésorerie — 12 derniers mois</p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#8b90a8", paddingTop: 12 }} />
              <Area
                type="monotone" dataKey="inflow" name="Entrées"
                stroke="#34d399" strokeWidth={2} fill="url(#inflowGrad)"
                dot={false} activeDot={{ r: 4, fill: "#34d399" }}
              />
              <Area
                type="monotone" dataKey="outflow" name="Sorties"
                stroke="#f87171" strokeWidth={2} fill="url(#outflowGrad)"
                dot={false} activeDot={{ r: 4, fill: "#f87171" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
