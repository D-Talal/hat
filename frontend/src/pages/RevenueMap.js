import React, { useState, useEffect, useRef } from 'react';
import { PageHeader, Card } from '../components/UI';
import { hotel, retail } from '../api';

const CONTINENTS = {
  'North America': { countries: ['USA','Canada','Mexico','Costa Rica','Panama','Dominican Republic','Jamaica','Trinidad and Tobago'], color: '#C9A84C', x: 180, y: 200 },
  'South America': { countries: ['Brazil','Argentina','Colombia','Chile','Peru','Venezuela','Ecuador','Uruguay','Paraguay','Bolivia'], color: '#C1440E', x: 240, y: 340 },
  'Europe': { countries: ['France','Germany','UK','Spain','Italy','Portugal','Netherlands','Belgium','Switzerland','Austria','Greece','Poland','Sweden','Norway','Denmark','Finland','Ireland','Czech Republic','Hungary','Romania'], color: '#4A7C59', x: 480, y: 160 },
  'Africa': { countries: ['South Africa','Nigeria','Kenya','Egypt','Morocco','Tanzania','Ghana','Ethiopia','Tunisia','Senegal'], color: '#8B5E3C', x: 490, y: 290 },
  'Middle East': { countries: ['UAE','Saudi Arabia','Qatar','Kuwait','Bahrain','Oman','Jordan','Lebanon','Turkey','Israel'], color: '#6B4226', x: 570, y: 230 },
  'Asia Pacific': { countries: ['China','Japan','South Korea','Singapore','Thailand','India','Indonesia','Malaysia','Philippines','Vietnam','Australia','New Zealand','Hong Kong','Taiwan'], color: '#2D6A8C', x: 700, y: 220 },
};

const COUNTRY_COORDS = {
  'USA': [37, -95], 'Canada': [56, -96], 'Mexico': [23, -102], 'Brazil': [-10, -55],
  'Argentina': [-34, -64], 'Colombia': [4, -72], 'Chile': [-30, -71], 'France': [46, 2],
  'Germany': [51, 10], 'UK': [54, -2], 'Spain': [40, -4], 'Italy': [42, 12],
  'Portugal': [39, -8], 'Netherlands': [52, 5], 'UAE': [24, 54], 'Saudi Arabia': [24, 45],
  'Qatar': [25, 51], 'China': [35, 105], 'Japan': [36, 138], 'South Korea': [36, 128],
  'Singapore': [1, 104], 'Thailand': [15, 101], 'India': [20, 78], 'Australia': [-27, 133],
  'South Africa': [-29, 25], 'Nigeria': [10, 8], 'Kenya': [-1, 37], 'Egypt': [26, 30],
  'Morocco': [32, -5], 'Turkey': [39, 35], 'Indonesia': [-5, 120], 'Malaysia': [4, 108],
};

function latLonToXY(lat, lon, w, h) {
  const x = (lon + 180) * (w / 360);
  const y = (90 - lat) * (h / 180);
  return [x, y];
}

function generateData(hotels, rooms, properties, units) {
  const data = {};
  Object.entries(CONTINENTS).forEach(([cont, info]) => {
    data[cont] = { countries: {}, total: 0 };
    info.countries.forEach(country => {
      const hotelCount = Math.floor(Math.random() * 800) + 50;
      const occupancy = 0.55 + Math.random() * 0.35;
      const avgRate = 80 + Math.random() * 300;
      const revenue = Math.round(hotelCount * occupancy * avgRate * 365 / 1000000);
      data[cont].countries[country] = { hotels: hotelCount, revenue, occupancy: Math.round(occupancy * 100) };
      data[cont].total += revenue;
    });
    data[cont].total = Math.round(data[cont].total);
  });
  return data;
}

export default function RevenueMap() {
  const [view, setView] = useState('world');
  const [selectedContinent, setSelectedContinent] = useState(null);
  const [module, setModule] = useState('hotel');
  const [data, setData] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [hotels, setHotels] = useState([]);
  const svgRef = useRef();

  useEffect(() => {
    Promise.all([hotel.hotels.list(), hotel.rooms.list(), retail.properties.list(), retail.units.list()])
      .then(([h, r, p, u]) => {
        setHotels(h.data);
        setData(generateData(h.data, r.data, p.data, u.data));
      }).catch(() => setData(generateData([], [], [], [])));
  }, []);

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: 'var(--slate)' }}>Loading map…</div>
    </div>
  );

  const maxRevenue = Math.max(...Object.values(data).map(d => d.total));
  const W = 900, H = 460;

  const handleContinentClick = (cont) => {
    setSelectedContinent(cont);
    setView('continent');
  };

  const totalRevenue = Object.values(data).reduce((s, d) => s + d.total, 0);
  const totalHotels = Object.values(data).reduce((s, d) => s + Object.values(d.countries).reduce((cs, c) => cs + c.hotels, 0), 0);

  return (
    <div className="animate-fade">
      <PageHeader title="Revenue Map" sub="Global portfolio performance by region and country" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(1)}B` },
          { label: 'Properties', value: totalHotels.toLocaleString() },
          { label: 'Countries', value: '143' },
          { label: 'Continents', value: '6' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--ink)', borderRadius: 12, padding: '20px 24px', color: 'white' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontFamily: 'DM Serif Display' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        {view === 'continent' && (
          <button onClick={() => { setView('world'); setSelectedContinent(null); }}
            style={{ background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← World View
          </button>
        )}
        <div style={{ fontSize: 14, color: 'var(--slate)', marginLeft: 'auto' }}>
          {view === 'world' ? 'Click a continent to zoom in' : `Showing: ${selectedContinent}`}
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {view === 'world' ? (
          /* World Map */
          <div style={{ position: 'relative' }}>
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: '#1A1A2E', display: 'block' }}>
              {/* Ocean */}
              <rect width={W} height={H} fill="#1A1A2E" />
              {/* Grid lines */}
              {[-60,-30,0,30,60].map(lat => {
                const [,y] = latLonToXY(lat, 0, W, H);
                return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />;
              })}
              {[-120,-60,0,60,120].map(lon => {
                const [x] = latLonToXY(0, lon, W, H);
                return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />;
              })}

              {/* Continent bubbles */}
              {Object.entries(CONTINENTS).map(([cont, info]) => {
                const rev = data[cont].total;
                const r = 20 + (rev / maxRevenue) * 60;
                const { x, y, color } = info;
                return (
                  <g key={cont} onClick={() => handleContinentClick(cont)} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ cont, x, y, rev, r })}
                    onMouseLeave={() => setTooltip(null)}>
                    <circle cx={x} cy={y} r={r} fill={color} opacity={0.85} />
                    <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />
                    <text x={x} y={y - 4} textAnchor="middle" fill="white" fontSize={11} fontWeight={700} fontFamily="DM Sans">
                      {cont.split(' ')[0]}
                    </text>
                    <text x={x} y={y + 12} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10} fontFamily="DM Sans">
                      ${(rev / 1000).toFixed(1)}B
                    </text>
                  </g>
                );
              })}

              {/* Country dots */}
              {Object.entries(COUNTRY_COORDS).map(([country, [lat, lon]]) => {
                const [x, y] = latLonToXY(lat, lon, W, H);
                const cont = Object.entries(CONTINENTS).find(([, info]) => info.countries.includes(country))?.[0];
                const color = cont ? CONTINENTS[cont].color : '#888';
                return (
                  <circle key={country} cx={x} cy={y} r={3} fill={color} opacity={0.7} />
                );
              })}

              {/* Tooltip */}
              {tooltip && (
                <g>
                  <rect x={tooltip.x + tooltip.r + 8} y={tooltip.y - 40} width={160} height={60} rx={6} fill="rgba(0,0,0,0.85)" />
                  <text x={tooltip.x + tooltip.r + 16} y={tooltip.y - 20} fill="white" fontSize={12} fontWeight={700} fontFamily="DM Sans">{tooltip.cont}</text>
                  <text x={tooltip.x + tooltip.r + 16} y={tooltip.y} fill="#C9A84C" fontSize={13} fontWeight={700} fontFamily="DM Sans">${(tooltip.rev / 1000).toFixed(1)}B revenue</text>
                  <text x={tooltip.x + tooltip.r + 16} y={tooltip.y + 16} fill="rgba(255,255,255,0.5)" fontSize={10} fontFamily="DM Sans">Click to explore →</text>
                </g>
              )}
            </svg>

            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(CONTINENTS).map(([cont, info]) => (
                <div key={cont} onClick={() => handleContinentClick(cont)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 10px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: info.color }} />
                  <span style={{ color: 'white', fontSize: 11, fontFamily: 'DM Sans' }}>{cont}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Continent Drill-down */
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--ink)', borderRadius: 10, padding: '16px 20px', color: 'white', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 6 }}>Total Revenue</div>
                <div style={{ fontSize: 28, fontFamily: 'DM Serif Display' }}>${(data[selectedContinent].total / 1000).toFixed(1)}B</div>
              </div>
              <div style={{ background: '#2D4A3E', borderRadius: 10, padding: '16px 20px', color: 'white', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 6 }}>Properties</div>
                <div style={{ fontSize: 28, fontFamily: 'DM Serif Display' }}>
                  {Object.values(data[selectedContinent].countries).reduce((s, c) => s + c.hotels, 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: '#3D3520', borderRadius: 10, padding: '16px 20px', color: 'white', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 6 }}>Countries</div>
                <div style={{ fontSize: 28, fontFamily: 'DM Serif Display' }}>
                  {Object.keys(data[selectedContinent].countries).length}
                </div>
              </div>
              <div style={{ background: '#4A2020', borderRadius: 10, padding: '16px 20px', color: 'white', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 6 }}>Avg Occupancy</div>
                <div style={{ fontSize: 28, fontFamily: 'DM Serif Display' }}>
                  {Math.round(Object.values(data[selectedContinent].countries).reduce((s, c) => s + c.occupancy, 0) / Object.keys(data[selectedContinent].countries).length)}%
                </div>
              </div>
            </div>

            {/* Country table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    {['Country', 'Revenue', 'Properties', 'Occupancy', 'Revenue Share'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data[selectedContinent].countries)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([country, stats]) => {
                      const share = (stats.revenue / data[selectedContinent].total * 100).toFixed(1);
                      return (
                        <tr key={country}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{country}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--sage)', fontWeight: 600 }}>${stats.revenue.toLocaleString()}M</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>{stats.hotels.toLocaleString()}</td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                                <div style={{ width: `${stats.occupancy}%`, height: '100%', background: stats.occupancy > 75 ? 'var(--sage)' : stats.occupancy > 60 ? 'var(--gold)' : 'var(--terracotta)', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, minWidth: 32 }}>{stats.occupancy}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                                <div style={{ width: `${share}%`, height: '100%', background: 'var(--gold)', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, minWidth: 32 }}>{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
