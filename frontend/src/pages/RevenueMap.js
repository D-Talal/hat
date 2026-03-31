import React, { useState, useEffect } from 'react';
import { PageHeader, Card } from '../components/UI';
import { mapAPI } from '../api';

const CONTINENT_POSITIONS = {
  'North America': { x: 170, y: 195, color: '#C9A84C' },
  'South America': { x: 230, y: 340, color: '#C1440E' },
  'Europe':        { x: 480, y: 155, color: '#4A7C59' },
  'Africa':        { x: 490, y: 295, color: '#8B5E3C' },
  'Middle East':   { x: 570, y: 228, color: '#6B4226' },
  'Asia Pacific':  { x: 700, y: 218, color: '#2D6A8C' },
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

function latLonToXY(lat, lon, W, H) {
  return [(lon + 180) * (W / 360), (90 - lat) * (H / 180)];
}

export default function RevenueMap() {
  const [module, setModule] = useState('hotel');
  const [view, setView] = useState('world');
  const [selectedContinent, setSelectedContinent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [empty, setEmpty] = useState(false);

  const W = 900, H = 460;

  useEffect(() => {
    setLoading(true);
    setEmpty(false);
    mapAPI.stats(module)
      .then(r => {
        const d = r.data;
        if (Object.keys(d.by_continent).length === 0) setEmpty(true);
        setData(d);
      })
      .catch(() => setData({ by_country: {}, by_continent: {} }))
      .finally(() => setLoading(false));
  }, [module]);

  const maxRevenue = data ? Math.max(...Object.values(data.by_continent).map(d => d.revenue), 1) : 1;
  const totalRevenue = data ? Object.values(data.by_continent).reduce((s, d) => s + d.revenue, 0) : 0;
  const totalProperties = data ? Object.values(data.by_continent).reduce((s, d) => s + d.count, 0) : 0;
  const totalCountries = data ? Object.keys(data.by_country).length : 0;

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
          { label: 'Total Revenue', value: totalRevenue >= 1e9 ? `$${(totalRevenue/1e9).toFixed(2)}B` : totalRevenue >= 1e6 ? `$${(totalRevenue/1e6).toFixed(1)}M` : `$${totalRevenue.toLocaleString()}` },
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
          <button onClick={() => { setView('world'); setSelectedContinent(null); }}
            style={{ background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans' }}>
            ← World View
          </button>
        )}
        <span style={{ fontSize: 13, color: 'var(--slate)', marginLeft: 'auto' }}>
          {view === 'world' ? 'Click a continent bubble to drill down' : `Showing: ${selectedContinent}`}
        </span>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 22 }}>Loading…</div>
        ) : view === 'world' ? (
          <div style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: '#1A1A2E', display: 'block' }}>
              <rect width={W} height={H} fill="#1A1A2E" />
              {[-60,-30,0,30,60].map(lat => { const [,y]=latLonToXY(lat,0,W,H); return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}/>; })}
              {[-120,-60,0,60,120].map(lon => { const [x]=latLonToXY(0,lon,W,H); return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}/>; })}

              {/* Country dots */}
              {Object.entries(COUNTRY_COORDS).map(([country, [lat,lon]]) => {
                const [x,y] = latLonToXY(lat, lon, W, H);
                const hasData = data?.by_country?.[country];
                return <circle key={country} cx={x} cy={y} r={hasData ? 4 : 2} fill={hasData ? '#C9A84C' : 'rgba(255,255,255,0.2)'} opacity={hasData ? 1 : 0.5} />;
              })}

              {/* Continent bubbles */}
              {Object.entries(CONTINENT_POSITIONS).map(([cont, pos]) => {
                const contData = data?.by_continent?.[cont];
                const rev = contData?.revenue || 0;
                const cnt = contData?.count || 0;
                const r = rev > 0 ? 20 + (rev / maxRevenue) * 55 : 14;
                const { x, y, color } = pos;
                const hasData = rev > 0;
                return (
                  <g key={cont} onClick={() => { setSelectedContinent(cont); setView('continent'); }}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ cont, x, y, rev, cnt, r })}
                    onMouseLeave={() => setTooltip(null)}>
                    <circle cx={x} cy={y} r={r} fill={color} opacity={hasData ? 0.85 : 0.3} />
                    <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={2} opacity={0.3} />
                    <text x={x} y={y - 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="700" fontFamily="DM Sans">
                      {cont.split(' ')[0]}
                    </text>
                    <text x={x} y={y + 11} textAnchor="middle" fill={hasData ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'} fontSize={9} fontFamily="DM Sans">
                      {hasData ? (rev >= 1e6 ? `$${(rev/1e6).toFixed(1)}M` : `$${rev.toLocaleString()}`) : 'No data'}
                    </text>
                  </g>
                );
              })}

              {/* Tooltip */}
              {tooltip && (() => {
                const tx = tooltip.x + tooltip.r + 10;
                const ty = tooltip.y - 45;
                const rev = tooltip.rev;
                const revStr = rev >= 1e9 ? `$${(rev/1e9).toFixed(2)}B` : rev >= 1e6 ? `$${(rev/1e6).toFixed(1)}M` : `$${rev.toLocaleString()}`;
                return (
                  <g>
                    <rect x={tx} y={ty} width={170} height={70} rx={6} fill="rgba(0,0,0,0.88)" />
                    <text x={tx+12} y={ty+20} fill="white" fontSize={12} fontWeight="700" fontFamily="DM Sans">{tooltip.cont}</text>
                    <text x={tx+12} y={ty+38} fill="#C9A84C" fontSize={13} fontWeight="700" fontFamily="DM Sans">{revStr} revenue</text>
                    <text x={tx+12} y={ty+54} fill="rgba(255,255,255,0.5)" fontSize={10} fontFamily="DM Sans">{tooltip.cnt} propert{tooltip.cnt === 1 ? 'y' : 'ies'} · Click to explore</text>
                  </g>
                );
              })()}
            </svg>

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(CONTINENT_POSITIONS).map(([cont, pos]) => (
                <div key={cont} onClick={() => { setSelectedContinent(cont); setView('continent'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', background: 'rgba(0,0,0,0.65)', borderRadius: 6, padding: '3px 8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pos.color }} />
                  <span style={{ color: 'white', fontSize: 10, fontFamily: 'DM Sans' }}>{cont}</span>
                </div>
              ))}
            </div>

            {empty && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.75)', color: 'white', borderRadius: 12, padding: '20px 32px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, marginBottom: 8 }}>No location data yet</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>Add Country & Annual Revenue to your {module === 'hotel' ? 'Hotels' : 'Properties'} to see the map populate</div>
              </div>
            )}
          </div>
        ) : (
          /* Continent drill-down */
          <div style={{ padding: 24 }}>
            {(() => {
              const contData = data?.by_continent?.[selectedContinent];
              const countries = Object.entries(data?.by_country || {})
                .filter(([, d]) => d.continent === selectedContinent)
                .sort((a, b) => b[1].revenue - a[1].revenue);
              const totalRev = contData?.revenue || 0;

              return <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'Total Revenue', value: totalRev >= 1e9 ? `$${(totalRev/1e9).toFixed(2)}B` : `$${(totalRev/1e6).toFixed(1)}M`, color: 'var(--ink)' },
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
                          const revStr = stats.revenue >= 1e6 ? `$${(stats.revenue/1e6).toFixed(1)}M` : `$${stats.revenue.toLocaleString()}`;
                          return (
                            <tr key={country}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{country}</td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--sage)', fontWeight: 600 }}>{revStr}</td>
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
              </>;
            })()}
          </div>
        )}
      </Card>
    </div>
  );
}
