import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useLanguage } from "../../context/LanguageContext";

const CustomTooltip = ({ active, payload, label, unitsLabel }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eaf0", borderRadius: 10, padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 16px rgba(15,17,40,0.08)" }}>
      <p style={{ color: "#9ea4be", marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ color: "#0f1117", fontWeight: 500 }}>{payload[0].value} {unitsLabel}</p>
    </div>
  );
};

function OccCard({ label, data, colorClass, t }) {
  if (!data) return null;
  const rate = data.occupancy_rate || 0;
  const d = t.dashboard;
  const statusLabel = rate >= 80 ? d.excellent : rate >= 50 ? d.average : d.low;
  const statusColor = rate >= 80
    ? { bg: "#ecfdf5", fg: "#10b981" }
    : rate >= 50 ? { bg: "#fffbeb", fg: "#f59e0b" }
    : { bg: "#fef2f2", fg: "#ef4444" };

  return (
    <div className="occ-card">
      <div className="occ-card-header">
        <div>
          <p className="occ-card-label">{label}</p>
          <p className="occ-rate">{rate.toFixed(1)}%</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 11, color: "#9ea4be", marginBottom: 4 }}>{d.occupancyRate}</p>
          <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 20,
            fontSize: 11, fontWeight: 700, background: statusColor.bg, color: statusColor.fg }}>
            {statusLabel}
          </div>
        </div>
      </div>

      <div className="occ-bar-track">
        <div className={`occ-bar-fill ${colorClass}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>

      <div className="occ-stats">
        <div className="occ-stat">
          <strong>{data.occupied ?? data.occupied_tonight ?? 0}</strong>
          {data.occupied_tonight !== undefined ? d.occupiedTonight : 'Occupied'}
        </div>
        <div className="occ-stat">
          <strong>{data.vacant ?? data.available ?? 0}</strong>
          {d.available}
        </div>
        <div className="occ-stat">
          <strong>{data.total_units ?? data.total_rooms ?? 0}</strong>
          {d.total}
        </div>
      </div>
    </div>
  );
}

export default function OccupancySection({ data, module }) {
  const { t, language } = useLanguage();
  const d = t.dashboard;
  if (!data) return null;

  const trend = data.occupancy_trend || [];

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <div className="section-icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>🏢</div>
        <div>
          <h2 className="section-title">{d.occupancyTitle}</h2>
          <p className="section-subtitle">{d.occupancySub}</p>
        </div>
      </div>

      <div className="occ-grid">
        {(module === "commercial" || module === "all") && data.commercial && (
          <OccCard label={d.commercialReal} data={data.commercial} colorClass="commercial" t={t} />
        )}
        {(module === "hotel" || module === "all") && data.hotel && (
          <OccCard label={d.hotelsLabel} data={data.hotel} colorClass="hotel" t={t} />
        )}
      </div>

      {trend.length > 0 && (
        <div className="chart-wrapper">
          <p className="chart-title">{d.occupancyTrend}</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <CartesianGrid vertical={false} stroke="#f0f1f6" />
              <XAxis dataKey="month" tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ea4be", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unitsLabel={d.unitsOccupied} />} />
              <Line type="monotone" dataKey="occupied" stroke="#8b5cf6" strokeWidth={2.5}
                dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#8b5cf6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
