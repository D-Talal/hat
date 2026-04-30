import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#181c27", border: "0.5px solid #2a2f45",
      borderRadius: 8, padding: "10px 14px", fontSize: 13,
    }}>
      <p style={{ color: "#8b90a8", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#e8eaf2" }}>{payload[0].value} unités occupées</p>
    </div>
  );
};

function OccCard({ label, data, colorClass }) {
  if (!data) return null;
  const rate = data.occupancy_rate || 0;

  return (
    <div className="occ-card">
      <div className="occ-card-header">
        <div>
          <p className="occ-card-label">{label}</p>
          <p className="occ-rate">{rate.toFixed(1)}%</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 11, color: "#555c78", marginBottom: 2 }}>Taux d'occupation</p>
          <div style={{
            display: "inline-flex", alignItems: "center",
            padding: "3px 9px", borderRadius: 20,
            fontSize: 11, fontWeight: 600,
            background: rate >= 80 ? "rgba(52,211,153,0.12)" : rate >= 50 ? "rgba(245,158,11,0.12)" : "rgba(248,113,113,0.12)",
            color: rate >= 80 ? "#34d399" : rate >= 50 ? "#f59e0b" : "#f87171",
          }}>
            {rate >= 80 ? "Excellent" : rate >= 50 ? "Moyen" : "Faible"}
          </div>
        </div>
      </div>

      <div className="occ-bar-track">
        <div
          className={`occ-bar-fill ${colorClass}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>

      <div className="occ-stats">
        <div className="occ-stat">
          <strong>{data.occupied ?? data.occupied_tonight ?? 0}</strong>
          Occupé{data.occupied_tonight !== undefined ? "e(s) ce soir" : ""}
        </div>
        <div className="occ-stat">
          <strong>{data.vacant ?? data.available ?? 0}</strong>
          Disponible(s)
        </div>
        <div className="occ-stat">
          <strong>{data.total_units ?? data.total_rooms ?? 0}</strong>
          Total
        </div>
      </div>
    </div>
  );
}

export default function OccupancySection({ data, module }) {
  if (!data) return null;
  const trend = data.occupancy_trend || [];

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <div className="section-icon" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
          🏢
        </div>
        <div>
          <h2 className="section-title">Occupation & Vacance</h2>
          <p className="section-subtitle">Taux d'occupation en temps réel</p>
        </div>
      </div>

      <div className="occ-grid">
        {(module === "commercial" || module === "all") && data.commercial && (
          <OccCard label="Immobilier commercial" data={data.commercial} colorClass="commercial" />
        )}
        {(module === "hotel" || module === "all") && data.hotel && (
          <OccCard label="Hôtels" data={data.hotel} colorClass="hotel" />
        )}
      </div>

      {trend.length > 0 && (
        <div className="chart-wrapper">
          <p className="chart-title">Tendance d'occupation — 6 derniers mois (commercial)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid vertical={false} stroke="#2a2f45" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: "#555c78", fontSize: 11, fontFamily: "DM Sans" }}
                axisLine={false} tickLine={false}
              />
              <YAxis tick={{ fill: "#555c78", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="occupied" stroke="#a78bfa" strokeWidth={2}
                dot={{ r: 3, fill: "#a78bfa", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
