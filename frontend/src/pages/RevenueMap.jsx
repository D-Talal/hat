import React, { useState, useEffect, useRef } from 'react';
import { PageHeader, Card } from '../components/UI';
import { mapAPI } from '../api';

// ─── Country ISO mapping (name → ISO-3166 alpha-2) ───────────────────────────
const COUNTRY_ISO = {
  'USA': 'us', 'Canada': 'ca', 'Mexico': 'mx',
  'Brazil': 'br', 'Argentina': 'ar', 'Colombia': 'co', 'Chile': 'cl', 'Peru': 'pe',
  'France': 'fr', 'Germany': 'de', 'UK': 'gb', 'Spain': 'es', 'Italy': 'it',
  'Portugal': 'pt', 'Netherlands': 'nl', 'Sweden': 'se', 'Norway': 'no', 'Poland': 'pl',
  'UAE': 'ae', 'Saudi Arabia': 'sa', 'Qatar': 'qa', 'Turkey': 'tr', 'Israel': 'il',
  'China': 'cn', 'Japan': 'jp', 'South Korea': 'kr', 'India': 'in',
  'Singapore': 'sg', 'Thailand': 'th', 'Australia': 'au', 'Indonesia': 'id',
  'South Africa': 'za', 'Nigeria': 'ng', 'Kenya': 'ke', 'Egypt': 'eg', 'Morocco': 'ma',
  'Hong Kong': 'hk', 'Taiwan': 'tw', 'Malaysia': 'my', 'Vietnam': 'vn',
  'New Zealand': 'nz', 'Philippines': 'ph',
};

const COUNTRY_COORDS = {
  'USA': [37,-95], 'Canada': [56,-96], 'Mexico': [23,-102],
  'Brazil': [-10,-55], 'Argentina': [-34,-64], 'Colombia': [4,-72], 'Chile': [-30,-71], 'Peru': [-10,-75],
  'France': [46,2], 'Germany': [51,10], 'UK': [54,-2], 'Spain': [40,-4], 'Italy': [42,12],
  'Portugal': [39,-8], 'Netherlands': [52,5], 'Sweden': [60,18], 'Norway': [62,10], 'Poland': [52,20],
  'UAE': [24,54], 'Saudi Arabia': [24,45], 'Qatar': [25,51], 'Turkey': [39,35], 'Israel': [31,35],
  'China': [35,105], 'Japan': [36,138], 'South Korea': [36,128], 'India': [20,78],
  'Singapore': [1,104], 'Thailand': [15,101], 'Australia': [-27,133], 'Indonesia': [-5,120],
  'South Africa': [-29,25], 'Nigeria': [10,8], 'Kenya': [-1,37], 'Egypt': [26,30], 'Morocco': [32,-5],
  'Hong Kong': [22,114], 'Taiwan': [23,121], 'Malaysia': [4,108], 'Vietnam': [16,108],
  'New Zealand': [-41,174], 'Philippines': [13,122],
};

const CONTINENT_MAP = {
  'USA': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
  'Brazil': 'South America', 'Argentina': 'South America', 'Colombia': 'South America',
  'Chile': 'South America', 'Peru': 'South America',
  'France': 'Europe', 'Germany': 'Europe', 'UK': 'Europe', 'Spain': 'Europe',
  'Italy': 'Europe', 'Portugal': 'Europe', 'Netherlands': 'Europe',
  'Sweden': 'Europe', 'Norway': 'Europe', 'Poland': 'Europe',
  'UAE': 'Middle East', 'Saudi Arabia': 'Middle East', 'Qatar': 'Middle East',
  'Turkey': 'Middle East', 'Israel': 'Middle East',
  'China': 'Asia Pacific', 'Japan': 'Asia Pacific', 'South Korea': 'Asia Pacific',
  'India': 'Asia Pacific', 'Singapore': 'Asia Pacific', 'Thailand': 'Asia Pacific',
  'Australia': 'Asia Pacific', 'Indonesia': 'Asia Pacific', 'Hong Kong': 'Asia Pacific',
  'Taiwan': 'Asia Pacific', 'Malaysia': 'Asia Pacific', 'Vietnam': 'Asia Pacific',
  'New Zealand': 'Asia Pacific', 'Philippines': 'Asia Pacific',
  'South Africa': 'Africa', 'Nigeria': 'Africa', 'Kenya': 'Africa',
  'Egypt': 'Africa', 'Morocco': 'Africa',
};

function fmtRev(v) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v/1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function RevenueMap() {
  const [module, setModule] = useState('hotel');
  const [view, setView] = useState('world');
  const [selectedContinent, setSelectedContinent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hcReady, setHcReady] = useState(false);
  const mapRef = useRef(null);
  const chartRef = useRef(null);

  // Load Highcharts map stack
  useEffect(() => {
    (async () => {
      try {
        await loadScript('https://code.highcharts.com/highcharts.js');
        await loadScript('https://code.highcharts.com/maps/modules/map.js');
        await loadScript('https://code.highcharts.com/mapdata/custom/world.js');
        setHcReady(true);
      } catch(e) { console.error('Highcharts load error', e); }
    })();
    return () => { chartRef.current?.destroy(); };
  }, []);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    mapAPI.stats(module)
      .then(r => setData(r.data))
      .catch(() => setData({ by_country: {}, by_continent: {} }))
      .finally(() => setLoading(false));
  }, [module]);

  // Build chart
  useEffect(() => {
    if (!hcReady || loading || !data || view !== 'world') return;
    // Wait for DOM element
    const timeout = setTimeout(() => {
      if (!mapRef.current) return;
      const H = window.Highcharts;
      if (!H || !H.maps?.['custom/world']) return;

      chartRef.current?.destroy();

      const choroplethData = Object.entries(data.by_country || {}).map(([country, stats]) => {
        const iso = COUNTRY_ISO[country];
        if (!iso) return null;
        return { 'hc-key': iso, value: stats.revenue, name: country, count: stats.count };
      }).filter(Boolean);

      const bubbleData = Object.entries(data.by_country || {}).map(([country, stats]) => {
        const coords = COUNTRY_COORDS[country];
        if (!coords) return null;
        return { name: country, lat: coords[0], lon: coords[1], z: stats.revenue, count: stats.count, revenue: stats.revenue };
      }).filter(Boolean);

      const drillDown = (name) => {
        const cont = CONTINENT_MAP[name];
        if (cont) { setSelectedContinent(cont); setView('continent'); }
      };

      chartRef.current = H.mapChart(mapRef.current, {
        chart: {
          map: H.maps['custom/world'],
          backgroundColor: '#0f1117',
          style: { fontFamily: 'DM Sans, sans-serif' },
          animation: { duration: 400 },
          margin: [0, 0, 0, 0],
          spacing: [0, 0, 0, 0],
        },
        title: { text: null },
        credits: { enabled: false },
        legend: {
          enabled: choroplethData.length > 0,
          layout: 'vertical',
          align: 'left',
          verticalAlign: 'bottom',
          floating: true,
          backgroundColor: 'rgba(15,17,23,0.8)',
          borderRadius: 8,
          padding: 12,
          itemStyle: { color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: '600' },
          title: {
            text: 'Annual Revenue',
            style: { color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' },
          },
        },
        mapNavigation: {
          enabled: true,
          enableMouseWheelZoom: true,
          enableDoubleClickZoom: true,
          buttonOptions: {
            verticalAlign: 'top',
            align: 'right',
            style: { fontFamily: 'DM Sans' },
          },
        },
        colorAxis: {
          min: 0,
          stops: [
            [0,   '#1c2030'],
            [0.25, '#1a3a5c'],
            [0.55, '#1a5f96'],
            [0.8,  '#1a8acd'],
            [1,    '#C9A84C'],
          ],
          labels: {
            style: { color: 'rgba(255,255,255,0.45)', fontSize: '10px' },
            formatter() { return fmtRev(this.value); },
          },
        },
        tooltip: {
          useHTML: true,
          backgroundColor: 'rgba(10,12,20,0.97)',
          borderColor: 'rgba(201,168,76,0.25)',
          borderRadius: 10,
          shadow: { color: 'rgba(0,0,0,0.5)', offsetX: 0, offsetY: 4, opacity: 0.5, width: 16 },
          style: { color: 'white', fontFamily: 'DM Sans', padding: '0' },
          formatter() {
            const p = this.point;
            const isBubble = this.series.type === 'mapbubble';
            const name = p.name;
            const rev = isBubble ? p.revenue : p.value;
            const count = p.count;
            if (!rev) return `<div style="padding:10px 14px"><b style="font-size:13px">${name}</b><br/><span style="opacity:0.4;font-size:11px">No revenue data</span></div>`;
            return `
              <div style="padding:10px 14px;min-width:160px">
                <div style="font-size:13px;font-weight:700;margin-bottom:6px;opacity:0.9">${name}</div>
                <div style="color:#C9A84C;font-size:18px;font-weight:700;font-family:'DM Serif Display',serif">${fmtRev(rev)}</div>
                ${count != null ? `<div style="font-size:11px;opacity:0.4;margin-top:4px">${count} propert${count===1?'y':'ies'}</div>` : ''}
              </div>`;
          },
        },
        series: [
          {
            type: 'map',
            name: 'Revenue by Country',
            data: choroplethData,
            mapData: H.maps['custom/world'],
            joinBy: 'hc-key',
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 0.5,
            nullColor: '#1c2030',
            states: {
              hover: { borderColor: 'rgba(201,168,76,0.5)', borderWidth: 1.5, brightness: 0.1 },
              select: { color: '#C9A84C' },
            },
            cursor: choroplethData.length > 0 ? 'pointer' : 'default',
            point: { events: { click() { drillDown(this.name); } } },
          },
          {
            type: 'mapbubble',
            name: 'Revenue bubbles',
            data: bubbleData,
            minSize: '3%',
            maxSize: '12%',
            color: 'rgba(201,168,76,0.55)',
            marker: { lineColor: 'rgba(201,168,76,0.85)', lineWidth: 1.5 },
            states: { hover: { color: 'rgba(201,168,76,0.9)' } },
            cursor: 'pointer',
            showInLegend: false,
            point: { events: { click() { drillDown(this.name); } } },
          },
        ],
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, [hcReady, loading, data, view]);

  useEffect(() => {
    if (view !== 'world') {
      chartRef.current?.destroy();
      chartRef.current = null;
    }
  }, [view]);

  const totalRevenue = data ? Object.values(data.by_continent || {}).reduce((s, d) => s + d.revenue, 0) : 0;
  const totalProperties = data ? Object.values(data.by_continent || {}).reduce((s, d) => s + d.count, 0) : 0;
  const totalCountries = data ? Object.keys(data.by_country || {}).length : 0;

  return (
    <div className="animate-fade">
      <PageHeader title="Revenue Map" sub="Global portfolio performance by region and country" />

      {/* Module toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['hotel', 'retail'].map(m => (
          <button key={m} onClick={() => { setModule(m); setView('world'); setSelectedContinent(null); }}
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
            ? 'Scroll to zoom · Drag to pan · Click a country to drill down'
            : `Showing: ${selectedContinent}`}
        </span>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {view === 'world' && (
          <>
            {(loading || !hcReady) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 520, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 22, background: '#0f1117' }}>
                Loading map…
              </div>
            )}
            <div
              ref={mapRef}
              style={{ width: '100%', height: 520, display: (loading || !hcReady) ? 'none' : 'block' }}
            />
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
