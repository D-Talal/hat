import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "../components/Dashboard.css";
import { useLanguage } from "../context/LanguageContext";
import FinanceSection from "../components/dashboard/FinanceSection";
import OccupancySection from "../components/dashboard/OccupancySection";
import CashFlowSection from "../components/dashboard/CashFlowSection";
import AssetsSection from "../components/dashboard/AssetsSection";

export default function Dashboard() {
  const { t, language } = useLanguage();
  const d = t.dashboard;

  const MODULES = [
    { value: "all",        label: d.globalView },
    { value: "commercial", label: d.commercial },
    { value: "hotel",      label: d.hotels },
  ];

  const [module, setModule] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { module };
      const [finance, occupancy, cashflow, assets] = await Promise.all([
        axios.get("/api/dashboard/finance", { params }),
        axios.get("/api/dashboard/occupancy", { params }),
        axios.get("/api/dashboard/cashflow", { params }),
        axios.get("/api/dashboard/assets", { params }),
      ]);
      setData({
        finance: finance.data,
        occupancy: occupancy.data,
        cashflow: cashflow.data,
        assets: assets.data,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(d.error);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const activeModuleLabel = MODULES.find((m) => m.value === module)?.label;

  const timeStr = lastUpdated?.toLocaleTimeString(
    language === 'fr' ? 'fr-CA' : 'en-CA',
    { hour: "2-digit", minute: "2-digit" }
  );

  return (
    <div className="dashboard-root">
      <div className="dashboard-header">
        <div className="dashboard-title-block">
          <h1 className="dashboard-title">{d.title}</h1>
          {lastUpdated && (
            <span className="dashboard-updated">{d.updatedAt} {timeStr}</span>
          )}
        </div>

        <div className="dashboard-controls">
          <div className="module-filter">
            {MODULES.map((m) => (
              <button
                key={m.value}
                className={`module-btn ${module === m.value ? "active" : ""}`}
                onClick={() => setModule(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button className="refresh-btn" onClick={fetchDashboard} disabled={loading} title={d.refresh}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={loading ? "spinning" : ""}>
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="module-badge-row">
        <span className="module-badge">{activeModuleLabel}</span>
      </div>

      {error ? (
        <div className="dashboard-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchDashboard}>{d.retry}</button>
        </div>
      ) : loading ? (
        <div className="dashboard-skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-section">
              <div className="skeleton-title" />
              <div className="skeleton-cards">
                {[...Array(4)].map((_, j) => <div key={j} className="skeleton-card" />)}
              </div>
              <div className="skeleton-chart" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="dashboard-sections">
          <FinanceSection data={data.finance} module={module} />
          <OccupancySection data={data.occupancy} module={module} />
          <CashFlowSection data={data.cashflow} />
          <AssetsSection data={data.assets} module={module} />
        </div>
      ) : null}
    </div>
  );
}
