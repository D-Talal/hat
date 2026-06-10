import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader, Card } from '../components/UI';
import { mapAPI } from '../api';
import { useFormat } from '../data/format';

const COUNTRIES = {
  'USA':          { lat: 37,   lon: -95,  continent: 'North America' },
  'Canada':       { lat: 56,   lon: -96,  continent: 'North America' },
  'Mexico':       { lat: 23,   lon: -102, continent: 'North America' },
  'Brazil':       { lat: -10,  lon: -55,  continent: 'South America' },
  'Argentina':    { lat: -34,  lon: -64,  continent: 'South America' },
  'Colombia':     { lat: 4,    lon: -72,  continent: 'South America' },
  'Chile':        { lat: -30,  lon: -71,  continent: 'South America' },
  'Peru':         { lat: -10,  lon: -75,  continent: 'South America' },
  'France':       { lat: 46,   lon: 2,    continent: 'Europe' },
  'Germany':      { lat: 51,   lon: 10,   continent: 'Europe' },
  'UK':           { lat: 54,   lon: -2,   continent: 'Europe' },
  'Spain':        { lat: 40,   lon: -4,   continent: 'Europe' },
  'Italy':        { lat: 42,   lon: 12,   continent: 'Europe' },
  'Portugal':     { lat: 39,   lon: -8,   continent: 'Europe' },
  'Netherlands':  { lat: 52,   lon: 5,    continent: 'Europe' },
  'Sweden':       { lat: 60,   lon: 18,   continent: 'Europe' },
  'Norway':       { lat: 62,   lon: 10,   continent: 'Europe' },
  'Poland':       { lat: 52,   lon: 20,   continent: 'Europe' },
  'UAE':          { lat: 24,   lon: 54,   continent: 'Middle East' },
  'Saudi Arabia': { lat: 24,   lon: 45,   continent: 'Middle East' },
  'Qatar':        { lat: 25,   lon: 51,   continent: 'Middle East' },
  'Turkey':       { lat: 39,   lon: 35,   continent: 'Middle East' },
  'Israel':       { lat: 31,   lon: 35,   continent: 'Middle East' },
  'China':        { lat: 35,   lon: 105,  continent: 'Asia Pacific' },
  'Japan':        { lat: 36,   lon: 138,  continent: 'Asia Pacific' },
  'South Korea':  { lat: 36,   lon: 128,  continent: 'Asia Pacific' },
  'India':        { lat: 20,   lon: 78,   continent: 'Asia Pacific' },
  'Singapore':    { lat: 1,    lon: 104,  continent: 'Asia Pacific' },
  'Thailand':     { lat: 15,   lon: 101,  continent: 'Asia Pacific' },
  'Australia':    { lat: -27,  lon: 133,  continent: 'Asia Pacific' },
  'Indonesia':    { lat: -5,   lon: 120,  continent: 'Asia Pacific' },
  'Hong Kong':    { lat: 22,   lon: 114,  continent: 'Asia Pacific' },
  'Taiwan':       { lat: 23,   lon: 121,  continent: 'Asia Pacific' },
  'Malaysia':     { lat: 4,    lon: 108,  continent: 'Asia Pacific' },
  'Vietnam':      { lat: 16,   lon: 108,  continent: 'Asia Pacific' },
  'New Zealand':  { lat: -41,  lon: 174,  continent: 'Asia Pacific' },
  'Philippines':  { lat: 13,   lon: 122,  continent: 'Asia Pacific' },
  'South Africa': { lat: -29,  lon: 25,   continent: 'Africa' },
  'Nigeria':      { lat: 10,   lon: 8,    continent: 'Africa' },
  'Kenya':        { lat: -1,   lon: 37,   continent: 'Africa' },
  'Egypt':        { lat: 26,   lon: 30,   continent: 'Africa' },
  'Morocco':      { lat: 32,   lon: -5,   continent: 'Africa' },
};

function fmtRev(v, cur = '$') {
  if (!v) return `${cur}0`;
  if (v >= 1e9) return `${cur}${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${cur}${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${cur}${(v / 1e3).toFixed(0)}k`;
  return `${cur}${v.toLocaleString()}`;
}

// Map ISO currency to a short display symbol for the compact map labels.
const CURRENCY_SYMBOL = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', CHF: 'CHF ',
  JPY: '¥', CNY: '¥', INR: '₹', BRL: 'R$', MXN: 'MX$', ZAR: 'R',
  AED: 'AED ', SAR: 'SAR ', SGD: 'S$', HKD: 'HK$', SEK: 'kr ',
  NOK: 'kr ', DKK: 'kr ', PLN: 'zł ',
};

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

function LeafletMap({ byCountry, onCountryClick, cur = '$' }) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !window.L) return;
    const L = window.L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: [20, 10],
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      opacity: 0.5,
    }).addTo(map);

    const maxRev = Math.max(...Object.values(byCountry).map(d => d.revenue), 1);

    Object.entries(byCountry).forEach(([country, stats]) => {
      const info = COUNTRIES[country];
      if (!info) return;

      const rev = stats.revenue;
      const ratio = rev / maxRev;
      const radius = 8 + ratio * 42;

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

      circle.bindTooltip(`
        <div style="font-family:'DM Sans',sans-serif;padding:6px 2px;min-width:140px">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px">${country}</div>
          <div style="font-size:17px;font-weight:700;color:#C9A84C">${fmtRev(rev, cur)}</div>
          <div style="font-size:11px;opacity:0.5;margin-top:3px">${stats.count} propert${stats.count === 1 ? 'y' : 'ies'}</div>
        </div>
      `, {
        className: 'pm-map-tooltip',
        direction: 'top',
        offset: [0, -radius],
      });

      circle.on('click', () => onCountryClick(info.continent));
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [byCountry, onCountryClick, cur]);

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

export default function RevenueMap() {
  const { settings } = useFormat();
  const cur = CURRENCY_SYMBOL[settings.default_currency] || '$';
  const [module, setModule] = useState('retail');
  const [view, setView] = useState('world');
  const [selectedContinent, setSelectedContinent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    ensureLeafletCSS();
    loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'L')
      .then(() => setLeafletReady(true));
  }, []);

  useEffect(() => {
    setLoading(true);
    mapAPI.stats(module)
      .then(r => setData(r.data))
      .catch(() => setData({ by_country: {}, by_continent: {} }))
      .finally(() => setLoading(false));
  }, [module]);

  const handleCountryClick = useCallback((continent) => {
    setSelectedContinent(continent);
    setView('continent');
  }, []);

  const totalRevenue = data ? Object.values(data.by_continent || {}).reduce((s, d) => s + d.revenue, 0) : 0;
  const totalProperties = data ? Object.values(data.by_continent || {}).reduce((s, d) => s + d.count, 0) : 0;
  const totalCountries = data ? Object.keys(data.by_country || {}).length : 0;

  const showMap = !loading && leafletReady && data && view === 'world';

  return (
    <div className="animate-fade">
      <PageHeader title="Revenue Map" sub="Your global portfolio at a glance — revenue by region, country, and property" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['retail', 'hotel'].map(m => (
          <button key={m}
            onClick={() => { setModule(m); setView('world'); setSelectedContinent(null); }}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: module === m ? 'var(--ink)' : 'white', color: module === m ? 'var(--gold)' : 'var(--slate)', transition: 'all 0.15s' }}>
            {m === 'retail' ? '▦ Commercial' : '▲ Hospitality'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: fmtRev(totalRevenue, cur), icon: '◆', accent: true },
          { label: 'Properties', value: totalProperties.toLocaleString(), icon: '▦' },
          { label: 'Countries', value: totalCountries, icon: '◉' },
          { label: 'Continents', value: Object.keys(data?.by_continent || {}).length, icon: '✦' },
        ].map(s => (
          <div key={s.label} style={{
            position: 'relative', overflow: 'hidden',
            background: s.accent
              ? 'linear-gradient(135deg, #1a1d2e 0%, #0f1117 100%)'
              : 'var(--ink)',
            borderRadius: 14, padding: '22px 24px', color: 'white',
            border: s.accent ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              position: 'absolute', top: 16, right: 18, fontSize: 18,
              color: s.accent ? 'var(--gold)' : 'rgba(255,255,255,0.18)',
            }}>{s.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.55, marginBottom: 10 }}>{s.label}</div>
            <div style={{
              fontSize: 30, fontFamily: 'DM Serif Display', lineHeight: 1,
              color: s.accent ? 'var(--gold)' : 'white',
            }}>{loading ? '…' : s.value}</div>
          </div>
        ))}
      </div>

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
                cur={cur}
              />
            )}
          </>
        )}

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
                  { label: 'Total Revenue', value: fmtRev(totalRev, cur), color: 'var(--ink)' },
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
                        {['#', 'Country', 'Revenue', 'Properties', 'Revenue Share'].map(h => (
                          <th key={h} style={{ textAlign: h === '#' ? 'center' : 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {countries.map(([country, stats], i) => {
                        const share = totalRev > 0 ? (stats.revenue / totalRev * 100).toFixed(1) : 0;
                        const isTop = i === 0;
                        return (
                          <tr key={country}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            style={{ transition: 'background 0.12s' }}>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 24, height: 24, borderRadius: 6, fontSize: 12, fontWeight: 700,
                                background: isTop ? 'var(--gold)' : 'var(--border)',
                                color: isTop ? 'var(--ink)' : 'var(--slate)',
                              }}>{i + 1}</span>
                            </td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{country}</td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--ink)' }}>{fmtRev(stats.revenue, cur)}</td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{stats.count}</td>
                            <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', minWidth: 180 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${share}%`, height: '100%', borderRadius: 4,
                                    background: 'linear-gradient(90deg, #C9A84C 0%, #E0C46A 100%)',
                                    transition: 'width 0.5s ease',
                                  }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 42, fontFamily: 'DM Mono, monospace' }}>{share}%</span>
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
