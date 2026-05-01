import React, { useState, useEffect, useRef } from 'react';
import { PageHeader, Card } from '../components/UI';
import { mapAPI } from '../api';

// ─── Country lat/lon + ISO + continent ───────────────────────────────────────
const COUNTRIES = {
  'USA':          { lat: 37,   lon: -95,  iso: 'US', continent: 'North America' },
  'Canada':       { lat: 56,   lon: -96,  iso: 'CA', continent: 'North America' },
  'Mexico':       { lat: 23,   lon: -102, iso: 'MX', continent: 'North America' },
  'Brazil':       { lat: -10,  lon: -55,  iso: 'BR', continent: 'South America' },
  'Argentina':    { lat: -34,  lon: -64,  iso: 'AR', continent: 'South America' },
  'Colombia':     { lat: 4,    lon: -72,  iso: 'CO', continent: 'South America' },
  'Chile':        { lat: -30,  lon: -71,  iso: 'CL', continent: 'South America' },
  'Peru':         { lat: -10,  lon: -75,  iso: 'PE', continent: 'South America' },
  'France':       { lat: 46,   lon: 2,    iso: 'FR', continent: 'Europe' },
  'Germany':      { lat: 51,   lon: 10,   iso: 'DE', continent: 'Europe' },
  'UK':           { lat: 54,   lon: -2,   iso: 'GB', continent: 'Europe' },
  'Spain':        { lat: 40,   lon: -4,   iso: 'ES', continent: 'Europe' },
  'Italy':        { lat: 42,   lon: 12,   iso: 'IT', continent: 'Europe' },
  'Portugal':     { lat: 39,   lon: -8,   iso: 'PT', continent: 'Europe' },
  'Netherlands':  { lat: 52,   lon: 5,    iso: 'NL', continent: 'Europe' },
  'Sweden':       { lat: 60,   lon: 18,   iso: 'SE', continent: 'Europe' },
  'Norway':       { lat: 62,   lon: 10,   iso: 'NO', continent: 'Europe' },
  'Poland':       { lat: 52,   lon: 20,   iso: 'PL', continent: 'Europe' },
  'UAE':          { lat: 24,   lon: 54,   iso: 'AE', continent: 'Middle East' },
  'Saudi Arabia': { lat: 24,   lon: 45,   iso: 'SA', continent: 'Middle East' },
  'Qatar':        { lat: 25,   lon: 51,   iso: 'QA', continent: 'Middle East' },
  'Turkey':       { lat: 39,   lon: 35,   iso: 'TR', continent: 'Middle East' },
  'Israel':       { lat: 31,   lon: 35,   iso: 'IL', continent: 'Middle East' },
  'China':        { lat: 35,   lon: 105,  iso: 'CN', continent: 'Asia Pacific' },
  'Japan':        { lat: 36,   lon: 138,  iso: 'JP', continent: 'Asia Pacific' },
  'South Korea':  { lat: 36,   lon: 128,  iso: 'KR', continent: 'Asia Pacific' },
  'India':        { lat: 20,   lon: 78,   iso: 'IN', continent: 'Asia Pacific' },
  'Singapore':    { lat: 1,    lon: 104,  iso: 'SG', continent: 'Asia Pacific' },
  'Thailand':     { lat: 15,   lon: 101,  iso: 'TH', continent: 'Asia Pacific' },
  'Australia':    { lat: -27,  lon: 133,  iso: 'AU', continent: 'Asia Pacific' },
  'Indonesia':    { lat: -5,   lon: 120,  iso: 'ID', continent: 'Asia Pacific' },
  'Hong Kong':    { lat: 22,   lon: 114,  iso: 'HK', continent: 'Asia Pacific' },
  'Taiwan':       { lat: 23,   lon: 121,  iso: 'TW', continent: 'Asia Pacific' },
  'Malaysia':     { lat: 4,    lon: 108,  iso: 'MY', continent: 'Asia Pacific' },
  'Vietnam':      { lat: 16,   lon: 108,  iso: 'VN', continent: 'Asia Pacific' },
  'New Zealand':  { lat: -41,  lon: 174,  iso: 'NZ', continent: 'Asia Pacific' },
  'Philippines':  { lat: 13,   lon: 122,  iso: 'PH', continent: 'Asia Pacific' },
  'South Africa': { lat: -29,  lon: 25,   iso: 'ZA', continent: 'Africa' },
  'Nigeria':      { lat: 10,   lon: 8,    iso: 'NG', continent: 'Africa' },
  'Kenya':        { lat: -1,   lon: 37,   iso: 'KE', continent: 'Africa' },
  'Egypt':        { lat: 26,   lon: 30,   iso: 'EG', continent: 'Africa' },
  'Morocco':      { lat: 32,   lon: -5,   iso: 'MA', continent: 'Africa' },
};

function fmtRev(v) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
}

// Inject Leaflet CSS once
function ensureLeafletCSS() {
  const id = 'leaflet-css';
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

function loadScript(src, globalKey) {
  return new Promise((resolve) => {
    if (window[globalKey]) { resolve(); return; }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { existing.addEventListener('load', resolve); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

// ─── Leaflet Map component ────────────────────────────────────────────────────
function LeafletMap({ byCountry, onCountryClick }) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || !window.L) return;
    const L = window.L;

    // Destroy previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Init map
    const map = L.map(containerRef.current, {
      center: [20, 10],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Dark tile layer (CartoDB dark matter — no API key needed)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Country name labels (subtle)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      opacity: 0.5,
    }).addTo(map);

    const maxRev = Math.max(...Object.values(byCountry).map(d => d.revenue), 1);

    // Draw a circle marker for each country with data
    layersRef.current = [];
    Object.entries(byCountry).forEach(([country, stats]) => {
      const info = COUNTRIES[country];
      if (!info) return;

      const rev = stats.revenue;
      const ratio = rev / maxRev;

      // Bubble radius: 8–50px
      const radius = 8 + ratio * 42;

      // Color: interpolate from steel blue → gold
      const r = Math.round(28 + ratio * (201 - 28));
      const g = Math.round(90 + ratio * (168 - 90));
      const b = Math.round(160 + ratio * (76 - 160));
      const color = `rgb(${r},${g},${b})`;

      const circle = L.circleMarker([info.lat, info.lon], {
        radius,
        fillColor: color,
        fillOpacity: 0.75,
        color: color,
        weight: 1.5,
        opacity: 0.9,
      }).addTo(map);

      // Tooltip
      circle.bindTooltip(`
        <div style="font-family:'DM Sans',sans-serif;padding:6px 2px;min-width:140px">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">${country}</div>
          <div style="font-size:17px;font-weight:700;color:#C9A84C">${fmtRev(rev)}</div>
          <div style="font-size:11px;opacity:0.5;margin-top:3px">${stats.count} propert${stats.count === 1 ? 'y' : 'ies'}</div>
        </div>
      `, {
        className: 'pm-map-tooltip',
        direction: 'top',
        offset: [0, -radius],
      });

      circle.on('click', () => onCountryClick(info.continent));
      layersRef.current.push(circle);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byCountry]);

  return (
    <>
      <style>{`
        .pm-map-tooltip {
          background: rgba(10,12,20,0.97) !important;
          border: 1px solid rgba(201,168,76,0.25) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
          color: white !important;
          padding: 10px 14px !important;
        }
        .pm-map-tooltip::before { display: none !important; }
        .leaflet-control-zoom a {
          background: rgba(15,17,23,0.9) !important;
          color: rgba(255,255,255,0.7) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(201,168,76,0.2) !important;
          color: #C9A84C !important;
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: 520, background: '#0f1117' }} />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RevenueMap() {
  const [module, setModule] = useState('hotel');
  const [view, setView] = useState('world');
  const [selectedContinent, setSelectedContinent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);

  // Load Leaflet once
  useEffect(() => {
    ensureLeafletCSS();
    loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'L')
      .then(() => setLeafletReady(true));
  }, []);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    mapAPI.stats(module)
      .then(r => setData(r.data))
      .catch(() => setData({ by_country: {}, by_continent: {} }))
      .finally(() => setLoading(false));
  }, [module]);

  const handleCountryClick = (continent) => {
    setSelectedContinent(continent);
    setView('continent');
  };

  const totalRevenue = data ? Object.values(data.by_continent || {}).reduce((s, d) => s + d.revenue, 0) : 0;
  const totalProperties = data ? Object.values(data.by_continent || {}).reduce((s, d) => s + d.count, 0) : 0;
  const totalCountries = data ? Object.keys(data.by_country || {}).length : 0;

  const showMap = !loading && leafletReady && data && view === 'world';

  return (
    <div className="animate-fade">
      <PageHeader title="Revenue Map" sub="Global portfolio performance by region and country" />

      {/* Module toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['hotel', 'retail'].map(m => (
          <button key={m}
            onClick={() => { setModule(m); setView('world'); setSelectedContinent(null); }}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: module === m ? 'var(--ink)' : 'white', color: module === m ? 'var(--gold)' : 'var(--slate)', transition: 'all 0.15s' }}>
            {m === 'hotel' ? '▲ Hospitality' : '▦ Commercial'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: fmtRev(totalRevenue) },
          { label: 'Properties', value: totalProperties.toLocaleString() },
          { label: 'Countries', value: totalCountries },
          { label: 'Continents', value: Object.keys(data?.by_continent || {}).length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--ink)', borderRadius: 12, padding: '20px 24px', color: 'white' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'DM Serif Display' }}>{loading ? '…' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        {view === 'continent' && (
          <button onClick={() => setView('world')}
            style={{ background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans' }}>
            ← World View
          </button>
        )}
        <span style={{ fontSize: 13, color: 'var(--slate)', marginLeft: 'auto' }}>
          {view === 'world'
            ? 'Scroll to zoom · Drag to pan · Click a bubble to drill down'
            : `Showing: ${selectedContinent}`}
        </span>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* World map */}
        {view === 'world' && (
          <>
            {!showMap && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 520, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 22, background: '#0f1117' }}>
                Loading map…
              </div>
            )}
            {showMap && (
              <LeafletMap
                key={module}
                byCountry={data.by_country || {}}
                onCountryClick={handleCountryClick}
              />
            )}
          </>
        )}

        {/* Continent drill-down */}
        {view === 'continent' && (() => {
          const contData = data?.by_continent?.[selectedContinent];
          const countries = Object.entries(data?.by_country || {})
            .filter(([, d]) => d.continent === selectedContinent)
            .sort((a, b) => b[1].revenue - a[1].revenue);
          const totalRev = contData?.revenue || 0;

          return (
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Revenue', value: fmtRev(totalRev), color: 'var(--ink)' },
                  { label: 'Properties', value: (contData?.count || 0).toLocaleString(), color: '#2D4A3E' },
                  { label: 'Countries', value: countries.length, color: '#3D3520' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.color, borderRadius: 10, padding: '16px 20px', color: 'white' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontFamily: 'DM Serif Display' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {countries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>No properties in this continent yet.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr>
                        {['Country', 'Revenue', 'Properties', 'Revenue Share'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {countries.map(([country, stats]) => {
                        const share = totalRev > 0 ? (stats.revenue / totalRev * 100).toFixed(1) : 0;
                        return (
                          <tr key={country}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{country}</td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--sage)', fontWeight: 600 }}>{fmtRev(stats.revenue)}</td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>{stats.count}</td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', minWidth: 160 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                                  <div style={{ width: `${share}%`, height: '100%', background: 'var(--gold)', borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 12, minWidth: 36 }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
