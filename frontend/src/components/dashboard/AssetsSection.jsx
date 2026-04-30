import KPICard from "../shared/KPICard";

export default function AssetsSection({ data, module }) {
  if (!data) return null;

  const byCityRows = (data.assets_by_city || []).sort(
    (a, b) => (b.properties + b.hotels) - (a.properties + a.hotels)
  );
  const byCountryRows = (data.assets_by_country || []).sort(
    (a, b) => (b.properties + b.hotels) - (a.properties + a.hotels)
  );

  return (
    <div className="dashboard-section">
      <div className="section-header">
        <div className="section-icon" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
          🏗️
        </div>
        <div>
          <h2 className="section-title">Actifs</h2>
          <p className="section-subtitle">Inventaire complet du portefeuille</p>
        </div>
      </div>

      <div className="kpi-grid">
        {(module === "commercial" || module === "all") && (
          <>
            <KPICard label="Propriétés commerciales" value={data.total_properties ?? 0} sub="Propriétés actives" color="orange" />
            <KPICard label="Unités totales" value={data.total_units ?? 0} sub="Unités locatives" color="blue" />
          </>
        )}
        {(module === "hotel" || module === "all") && (
          <>
            <KPICard label="Hôtels" value={data.total_hotels ?? 0} sub="Établissements" color="purple" />
            <KPICard label="Chambres totales" value={data.total_rooms ?? 0} sub="Chambres gérées" color="green" />
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {byCityRows.length > 0 && (
          <div className="assets-table-wrapper">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Ville</th>
                  {(module === "commercial" || module === "all") && <th>Propriétés</th>}
                  {(module === "hotel" || module === "all") && <th>Hôtels</th>}
                </tr>
              </thead>
              <tbody>
                {byCityRows.map((row) => (
                  <tr key={row.city}>
                    <td>{row.city}</td>
                    {(module === "commercial" || module === "all") && <td className="mono">{row.properties}</td>}
                    {(module === "hotel" || module === "all") && <td className="mono">{row.hotels}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {byCountryRows.length > 0 && (
          <div className="assets-table-wrapper">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Pays</th>
                  {(module === "commercial" || module === "all") && <th>Propriétés</th>}
                  {(module === "hotel" || module === "all") && <th>Hôtels</th>}
                </tr>
              </thead>
              <tbody>
                {byCountryRows.map((row) => (
                  <tr key={row.country}>
                    <td>{row.country}</td>
                    {(module === "commercial" || module === "all") && <td className="mono">{row.properties}</td>}
                    {(module === "hotel" || module === "all") && <td className="mono">{row.hotels}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
