import { useState, useEffect, useCallback } from "react";
import API from "../api";
import "../components/Dashboard.css";
import { useLanguage } from "../context/LanguageContext";
import CommercialDashboard from "./CommercialDashboard";
import HotelDashboard from "./HotelDashboard";
import FinanceSection from "../components/dashboard/FinanceSection";
import AssetsSection from "../components/dashboard/AssetsSection";

const LS_KEY = "propmanager_dashboard_module";

// ── Consolidated "Global" view — only what makes sense combined ──────────────
function GlobalView() {
  const { t } = useLanguage();
  const d = t.dashboard;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { module: "all" };
      const [finance, assets] = await Promise.all([
        API.get("/dashboard/finance", { params }),
        API.get("/dashboard/assets", { params }),
      ]);
      setData({ finance: finance.data, assets: assets.data });
    } catch (e) {
      setError(d.error || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="dashboard-skeleton">
        {[1, 2].map(i => (
          <div key={i} className="skeleton-section">
            <div className="skeleton-title" />
            <div className="skeleton-cards">
              {[1, 2, 3, 4].map(j => <div key={j} className="skeleton-card" />)}
            </div>
            <div className="skeleton-chart" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <span>⚠️ {error}</span>
        <button onClick={load}>{d.retry || "Réessayer"}</button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="dashboard-sections">
      <FinanceSection data={data.finance} module="all" />
      <AssetsSection data={data.assets} module="all" />
    </div>
  );
}

export default function Dashboard() {
  const { t, language } = useLanguage();
  const d = t.dashboard;
  const fr = language === "fr";

  const MODULES = [
    { value: "commercial", label: fr ? "Commercial" : "Commercial" },
    { value: "hotel",      label: fr ? "Hôtellerie" : "Hospitality" },
    { value: "all",        label: fr ? "Global"     : "Global" },
  ];

  // Default to last-used module, fallback to commercial (the core module)
  const [module, setModule] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || "commercial"; }
    catch { return "commercial"; }
  });

  const selectModule = (m) => {
    setModule(m);
    try { localStorage.setItem(LS_KEY, m); } catch { /* ignore */ }
  };

  const titleByModule = {
    commercial: fr ? "Tableau de bord — Commercial" : "Dashboard — Commercial",
    hotel:      fr ? "Tableau de bord — Hôtellerie" : "Dashboard — Hospitality",
    all:        fr ? "Tableau de bord — Global"     : "Dashboard — Global",
  };

  return (
    <div className="dashboard-root animate-fade">

      {/* ── Unified header with module toggle ── */}
      <div className="dashboard-header" style={{ marginBottom: 20 }}>
        <div className="dashboard-title-block">
          <h1 className="dashboard-title">{titleByModule[module]}</h1>
          <span className="dashboard-updated">
            {new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        <div className="dashboard-controls">
          <div className="module-filter">
            {MODULES.map((m) => (
              <button
                key={m.value}
                className={`module-btn ${module === m.value ? "active" : ""}`}
                onClick={() => selectModule(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Routed content ── */}
      {module === "commercial" && <CommercialDashboard embedded />}
      {module === "hotel"      && <HotelDashboard embedded />}
      {module === "all"        && <GlobalView />}

    </div>
  );
}
