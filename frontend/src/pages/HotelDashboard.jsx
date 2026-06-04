import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import API from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useFormat } from '../data/format';

// ── Styles ─────────────────────────────────────────────────────────────────────
const card = {
  background: 'var(--color-background-secondary, #fff)',
  border: '1px solid var(--color-border-tertiary, #e4e6ef)',
  borderRadius: 12,
  padding: '20px 22px',
};

const COLORS = ['#4361ee','#10b981','#f97316','#8b5cf6','#ef4444','#06b6d4','#f59e0b'];

const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

function KPI({ label, value, sub, color = '#4361ee', icon, highlight }) {
  return (
    <div style={{ ...card, borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-secondary, #9ea4be)', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-.01em' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #9ea4be)', marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 28, opacity: 0.7 }}>{icon}</span>}
      </div>
      {highlight && (
        <div style={{ marginTop: 12, background: '#f0fdf4', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
          {highlight}
        </div>
      )}
    </div>
  );
}

function OccupancyGauge({ rate }) {
  const color = rate >= 80 ? '#10b981' : rate >= 60 ? '#f97316' : rate >= 40 ? '#f59e0b' : '#ef4444';
  const label = rate >= 80 ? 'Excellent' : rate >= 60 ? 'Good' : rate >= 40 ? 'Average' : 'Low';
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ position: 'relative', display: 'inline-block', width: 140, height: 70 }}>
        <svg width="140" height="75" viewBox="0 0 140 75">
          <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#f0f1f6" strokeWidth="14" strokeLinecap="round" />
          <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${(rate / 100) * 188} 188`} />
        </svg>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color }}>{rate.toFixed(1)}%</span>
        </div>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color }}>{label}</div>
    </div>
  );
}

function AlertBadge({ count, label, color, bg, icon }) {
  if (!count) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: bg, borderRadius: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color }}>{count}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #9ea4be)' }}>{label}</div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  const f = fmt || ((n) => Number(n || 0).toLocaleString());
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e4e6ef', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ color: '#9ea4be', marginBottom: 4, fontSize: 12 }}>{label}</p>
      <p style={{ color: '#0f1117', fontWeight: 600 }}>{f(payload[0].value)}</p>
    </div>
  );
};

export default function HotelDashboard({ embedded = false }) {
  const { t } = useLanguage();
  const { money, date } = useFormat();
  const fmt = (n) => money(n, { maximumFractionDigits: 0 });
  const th = t.hotel;
  const [data, setData]         = useState(null);
  const [hotels, setHotels]     = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [dashRes, hotelsRes] = await Promise.all([
        API.get('/dashboard/hotel' + (selectedHotel ? `?hotel_id=${selectedHotel}` : '')),
        API.get('/hotel/hotels'),
      ]);
      setData(dashRes.data);
      setHotels(hotelsRes.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load dashboard');
    } finally { setLoading(false); }
  }, [selectedHotel]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 32 }}>🏨</div>
      <div style={{ color: '#9ea4be', fontSize: 14 }}>Loading hotel dashboard…</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>
  );

  if (!data) return null;

  const revTrend = data.revenue_last_month
    ? ((data.revenue_this_month - data.revenue_last_month) / data.revenue_last_month * 100).toFixed(1)
    : null;

  const chartData = (data.revenue_by_month || []).map(item => {
    const [y, m] = item.month.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return { ...item, label: date(d, { month: 'short', year: '2-digit' }) };
  });

  return (
    <div style={embedded ? {} : { padding: '28px 24px', maxWidth: 1200 }}>

      {/* Header (standalone only) */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'DM Serif Display, serif' }}>
              🏨 Hotel Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ea4be' }}>
              Live performance metrics · {date(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={selectedHotel}
              onChange={e => setSelectedHotel(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--color-border-tertiary, #e4e6ef)', fontFamily: 'DM Sans', fontSize: 13, background: 'white' }}
            >
              <option value="">All Hotels</option>
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <button onClick={load} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--color-border-tertiary, #e4e6ef)', background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans' }}>
              ↻ Refresh
            </button>
          </div>
        </div>
      )}

      {/* Hotel selector when embedded (kept accessible without the full header) */}
      {embedded && hotels.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <select
            value={selectedHotel}
            onChange={e => setSelectedHotel(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--color-border-tertiary, #e4e6ef)', fontFamily: 'DM Sans', fontSize: 13, background: 'white' }}
          >
            <option value="">All Hotels</option>
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
      )}

      {/* Top KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPI label={th.occupancyTonight} value={fmtPct(data.occupancy_rate)}
          sub={`${data.occupied_tonight} / ${data.total_rooms} rooms`}
          color={data.occupancy_rate >= 80 ? '#10b981' : data.occupancy_rate >= 60 ? '#f97316' : '#ef4444'}
          icon="🛏" />
        <KPI label={th.adr} value={fmt(data.adr)}
          sub="Avg daily rate this month"
          color="#4361ee" icon="💰" />
        <KPI label={th.revpar} value={fmt(data.revpar)}
          sub="Revenue per available room"
          color="#8b5cf6" icon="📊" />
        <KPI label={th.revenueThisMonth} value={fmt(data.revenue_this_month)}
          sub={revTrend ? `${revTrend >= 0 ? '▲' : '▼'} ${Math.abs(revTrend)}% vs last month` : 'vs last month'}
          color={revTrend >= 0 ? '#10b981' : '#ef4444'} icon="💵" />
      </div>

      {/* Occupancy + Today's activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* Occupancy gauge */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 16 }}>Tonight's Occupancy</div>
          <OccupancyGauge rate={data.occupancy_rate} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{data.occupied_tonight}</div>
              <div style={{ fontSize: 11, color: '#9ea4be', marginTop: 2 }}>OCCUPIED</div>
            </div>
            <div style={{ background: '#f8f9fc', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#374151' }}>{data.total_rooms - data.occupied_tonight}</div>
              <div style={{ fontSize: 11, color: '#9ea4be', marginTop: 2 }}>AVAILABLE</div>
            </div>
          </div>
        </div>

        {/* Today's activity */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 16 }}>Today's Activity</div>
          <AlertBadge count={data.arrivals_today}     label="Arrivals today"          color="#4361ee" bg="#eef0fd" icon="✈️" />
          <AlertBadge count={data.departures_today}   label="Departures today"        color="#f97316" bg="#fff7ed" icon="🧳" />
          <AlertBadge count={data.arrivals_tomorrow}  label="Arrivals tomorrow"       color="#8b5cf6" bg="#f5f3ff" icon="📅" />
          {data.pending_checkouts > 0 && (
            <AlertBadge count={data.pending_checkouts} label="Overdue checkouts"      color="#dc2626" bg="#fef2f2" icon="⚠️" />
          )}
          {!data.arrivals_today && !data.departures_today && !data.arrivals_tomorrow && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ea4be', fontSize: 13 }}>No activity today</div>
          )}
        </div>
      </div>

      {/* Revenue chart + Booking status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* Revenue by month */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 16 }}>Revenue — Last 12 Months</div>
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ea4be', fontSize: 13 }}>No booking data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#f0f1f6" />
                <XAxis dataKey="label" tick={{ fill: '#9ea4be', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ea4be', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip fmt={fmt} />} cursor={{ fill: 'rgba(67,97,238,0.05)', radius: 6 }} />
                <Bar dataKey="amount" fill="#4361ee" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Booking status pie */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 16 }}>Bookings by Status</div>
          {Object.keys(data.booking_status_counts).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ea4be', fontSize: 13 }}>No bookings yet</div>
          ) : (() => {
            const STATUS_LABELS = { confirmed: 'Confirmed', checked_in: 'Checked In', checked_out: 'Checked Out', cancelled: 'Cancelled' };
            const pieData = Object.entries(data.booking_status_counts).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v }));
            return (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Room type stats + Revenue by hotel */}
      <div style={{ display: 'grid', gridTemplateColumns: data.revenue_by_hotel?.length > 1 ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 20 }}>

        {/* Room type breakdown */}
        {data.room_type_stats?.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 16 }}>Room Type Performance</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fc' }}>
                  {['Type', 'Total', 'Occupied', 'Occupancy', 'Avg Rate'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#9ea4be', borderBottom: '1px solid #e4e6ef' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.room_type_stats.map((rt, i) => {
                  const occ = rt.occupancy_rate;
                  const occColor = occ >= 80 ? '#10b981' : occ >= 60 ? '#f97316' : '#ef4444';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f1f6' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize' }}>{rt.type?.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>{rt.total}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>{rt.occupied}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#f0f1f6', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${occ}%`, height: '100%', background: occColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: occColor, minWidth: 36 }}>{occ.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{rt.avg_rate ? `$${rt.avg_rate.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Revenue by hotel (only shown when multiple hotels) */}
        {data.revenue_by_hotel?.length > 1 && (
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', marginBottom: 16 }}>Revenue by Hotel — This Month</div>
            {data.revenue_by_hotel.map((h, i) => {
              const maxRev = Math.max(...data.revenue_by_hotel.map(x => x.revenue));
              const pct = maxRev > 0 ? (h.revenue / maxRev * 100) : 0;
              return (
                <div key={h.hotel_id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{fmt(h.revenue)}</span>
                  </div>
                  <div style={{ height: 8, background: '#f0f1f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width .5s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#9ea4be', marginTop: 4 }}>{h.bookings} bookings</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
