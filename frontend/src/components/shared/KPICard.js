export default function KPICard({ label, value, sub, color = "blue", trend, trendLabel }) {
  return (
    <div className={`kpi-card ${color}`}>
      <p className="kpi-label">{label}</p>
      <h2 className="kpi-value">{value}</h2>
      {sub && <p className="kpi-sub">{sub}</p>}
      {trend !== undefined && trend !== null && (
        <span className={`kpi-badge ${trend >= 0 ? "up" : "down"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% {trendLabel || 'vs prev. month'}
        </span>
      )}
    </div>
  );
}
