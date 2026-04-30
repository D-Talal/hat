/**
 * KPICard — reusable metric card
 * Props:
 *   label    string  — metric name
 *   value    string  — formatted value (e.g. "$12,500")
 *   sub      string? — secondary line
 *   color    "blue"|"green"|"orange"|"red"|"purple"
 *   trend    number? — percentage change vs last month (shows badge)
 */
export default function KPICard({ label, value, sub, color = "blue", trend }) {
  return (
    <div className={`kpi-card ${color}`}>
      <p className="kpi-label">{label}</p>
      <h2 className="kpi-value">{value}</h2>
      {sub && <p className="kpi-sub">{sub}</p>}
      {trend !== undefined && trend !== null && (
        <span className={`kpi-badge ${trend >= 0 ? "up" : "down"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs mois préc.
        </span>
      )}
    </div>
  );
}
