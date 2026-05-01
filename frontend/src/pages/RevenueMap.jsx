import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

export default function RevenueMap() {
  const [module, setModule] = useState('hotel');
  const [view, setView] = useState('world');
  const [selectedContinent, setSelectedContinent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [empty, setEmpty] = useState(false);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const svgRef = useRef(null);

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

  // Reset zoom/pan when switching modules or views
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [module]);

  // ─── Zoom helpers ───────────────────────────────────────────────
  const clampPan = useCallback((newPan, newZoom) => {
    const maxX = (W * newZoom - W) / 2;
    const maxY = (H * newZoom - H) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, newPan.x)),
      y: Math.max(-maxY, Math.min(maxY, newPan.y)),
    };
  }, [W, H]);

  // Zoom toward a point (SVG coords)
  const zoomToPoint = useCallback((newZoom, svgX, svgY) => {
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setZoom(prev => {
      const scale = newZoom / prev;
      setPan(prevPan => {
        const newPan = {
          x: svgX - scale * (svgX - prevPan.x),
          y: svgY - scale * (svgY - prevPan.y),
        };
        return clampPan(newPan, newZoom);
      });
      return newZoom;
    });
  }, [clampPan]);

  // Zoom to fit a continent bubble
  const zoomToContinent = useCallback((cont) => {
    const pos = CONTINENT_POSITIONS[cont];
    if (!pos) return;
    const targetZoom = 3;
    const newPan = {
      x: W / 2 - pos.x * targetZoom,
      y: H / 2 - pos.y * targetZoom,
    };
    setZoom(targetZoom);
    setPan(clampPan(newPan, targetZoom));
  }, [W, H, clampPan]);

  // Reset zoom
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ─── Mouse wheel ─────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Convert mouse position to SVG coords
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    const mouseY = ((e.clientY - rect.top) / rect.height) * H;
    // Adjust for current pan/zoom: actual SVG point under cursor
    const svgPointX = (mouseX - pan.x) / zoom;
    const svgPointY = (mouseY - pan.y) / zoom;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    const newPan = {
      x: mouseX - svgPointX * newZoom,
      y: mouseY - svgPointY * newZoom,
    };
    setZoom(newZoom);
    setPan(clampPan(newPan, newZoom));
  }, [zoom, pan, W, H, clampPan]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ─── Drag / pan ──────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
    e.currentTarget.style.cursor = 'grabbing';
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const dx = (e.clientX - panStart.current.x) * scaleX;
    const dy = (e.clientY - panStart.current.y) * scaleY;
    const newPan = {
      x: panOrigin.current.x + dx,
      y: panOrigin.current.y + dy,
    };
    setPan(clampPan(newPan, zoom));
  }, [zoom, W, H, clampPan]);

  const handleMouseUp = useCallback((e) => {
    isPanning.current = false;
    if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
  }, []);

  // ─── Click on continent ──────────────────────────────────────────
  // We distinguish a click from a drag by checking if mouse moved significantly
  const mouseDownPos = useRef(null);

  const handleContinentMouseDown = (e) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleContinentClick = (cont) => {
    if (mouseDownPos.current) {
      // ignore if dragged
    }
    // Zoom in first, then switch to continent drill-down after animation
    zoomToContinent(cont);
    setTimeout(() => {
      setSelectedContinent(cont);
      setView('continent');
      resetZoom();
    }, 320);
  };

  // ─── Stats ───────────────────────────────────────────────────────
  const maxRevenue = data ? Math.max(...Object.values(data.by_continent).map(d => d.revenue), 1) : 1;
  const totalRevenue = data ? Object.values(data.by_continent).reduce((s, d) => s + d.revenue, 0) : 0;
  const totalProperties = data ? Object.values(data.by_continent).reduce((s, d) => s + d.count, 0) : 0;
  const totalCountries = data ? Object.keys(data.by_country).length : 0;

  // Transform string for the SVG inner group
  const svgTransform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;

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
          {view === 'world' ? 'Scroll to zoom · Drag to pan · Click a continent to drill down' : `Showing: ${selectedContinent}`}
        </span>

        {/* Zoom controls — only in world view */}
        {view === 'world' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => zoomToPoint(zoom * 1.3, W / 2, H / 2)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>+</button>
            <button onClick={() => zoomToPoint(zoom / 1.3, W / 2, H / 2)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>−</button>
            <button onClick={resetZoom}
              style={{ padding: '0 10px', height: 28, borderRadius: 6, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 11, fontFamily: 'DM Sans', fontWeight: 600, color: 'var(--slate)' }}>
              Reset
            </button>
            <span style={{ fontSize: 11, color: 'var(--slate)', minWidth: 36 }}>{Math.round(zoom * 100)}%</span>
          </div>
        )}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--slate)', fontFamily: 'DM Serif Display', fontSize: 22 }}>Loading…</div>
        ) : view === 'world' ? (
          <div style={{ position: 'relative' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              style={{ width: '100%', background: '#1A1A2E', display: 'block', cursor: 'grab', userSelect: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <rect width={W} height={H} fill="#1A1A2E" />

              {/* All zoomable content in one group */}
              <g transform={svgTransform} style={{ transition: isPanning.current ? 'none' : 'transform 0.3s ease' }}>
                {/* Grid lines */}
                {[-60,-30,0,30,60].map(lat => { const [,y]=latLonToXY(lat,0,W,H); return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}/>; })}
                {[-120,-60,0,60,120].map(lon => { const [x]=latLonToXY(0,lon,W,H); return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5}/>; })}

                {/* Country dots / labels — labels appear when zoomed in */}
                {Object.entries(COUNTRY_COORDS).map(([country, [lat,lon]]) => {
                  const [x,y] = latLonToXY(lat, lon, W, H);
                  const countryData = data?.by_country?.[country];
                  const hasData = !!countryData;
                  const showLabel = zoom >= 1.8 && hasData;
                  const showDetailedLabel = zoom >= 2.5 && hasData;

                  // Scale inversely so text stays readable regardless of zoom
                  const labelScale = 1 / zoom;

                  if (showLabel) {
                    const rev = countryData.revenue;
                    const revStr = rev >= 1e9 ? `$${(rev/1e9).toFixed(1)}B`
                      : rev >= 1e6 ? `$${(rev/1e6).toFixed(1)}M`
                      : `$${rev.toLocaleString()}`;
                    const badgeW = showDetailedLabel ? 90 : 70;
                    const badgeH = showDetailedLabel ? 28 : 20;
                    return (
                      <g key={country} transform={`translate(${x},${y}) scale(${labelScale})`}>
                        {/* Pin dot */}
                        <circle cx={0} cy={0} r={4 * zoom} fill="#C9A84C" />
                        {/* Badge */}
                        <rect x={6} y={-(badgeH/2)} width={badgeW} height={badgeH} rx={4} fill="rgba(201,168,76,0.92)" />
                        <text x={6 + badgeW/2} y={showDetailedLabel ? -5 : 1} textAnchor="middle"
                          fill="#1A1A2E" fontSize={showDetailedLabel ? 9 : 8} fontWeight="700" fontFamily="DM Sans">
                          {country}
                        </text>
                        {showDetailedLabel && (
                          <text x={6 + badgeW/2} y={8} textAnchor="middle"
                            fill="#1A1A2E" fontSize={8} fontFamily="DM Sans" opacity={0.8}>
                            {revStr}
                          </text>
                        )}
                      </g>
                    );
                  }

                  return (
                    <circle key={country} cx={x} cy={y}
                      r={hasData ? 4 : 2}
                      fill={hasData ? '#C9A84C' : 'rgba(255,255,255,0.2)'}
                      opacity={hasData ? 1 : 0.5}
                    />
                  );
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
                    <g key={cont}
                      onMouseDown={handleContinentMouseDown}
                      onClick={() => handleContinentClick(cont)}
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

                {/* Tooltip (inside zoom group so it follows the bubble) */}
                {tooltip && (() => {
                  const tx = tooltip.x + tooltip.r + 10;
                  const ty = tooltip.y - 45;
                  const rev = tooltip.rev;
                  const revStr = rev >= 1e9 ? `$${(rev/1e9).toFixed(2)}B` : rev >= 1e6 ? `$${(rev/1e6).toFixed(1)}M` : `$${rev.toLocaleString()}`;
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={tx} y={ty} width={170} height={70} rx={6} fill="rgba(0,0,0,0.88)" />
                      <text x={tx+12} y={ty+20} fill="white" fontSize={12} fontWeight="700" fontFamily="DM Sans">{tooltip.cont}</text>
                      <text x={tx+12} y={ty+38} fill="#C9A84C" fontSize={13} fontWeight="700" fontFamily="DM Sans">{revStr} revenue</text>
                      <text x={tx+12} y={ty+54} fill="rgba(255,255,255,0.5)" fontSize={10} fontFamily="DM Sans">{tooltip.cnt} propert{tooltip.cnt === 1 ? 'y' : 'ies'} · Click to explore</text>
                    </g>
                  );
                })()}
              </g>
            </svg>

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(CONTINENT_POSITIONS).map(([cont, pos]) => (
                <div key={cont} onClick={() => handleContinentClick(cont)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', background: 'rgba(0,0,0,0.65)', borderRadius: 6, padding: '3px 8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pos.color }} />
                  <span style={{ color: 'white', fontSize: 10, fontFamily: 'DM Sans' }}>{cont}</span>
                </div>
              ))}
            </div>

            {/* Zoom hint when at default zoom */}
            {zoom === 1 && (
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '4px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'DM Sans', pointerEvents: 'none' }}>
                🖱 Scroll to zoom · Drag to pan
              </div>
            )}

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
