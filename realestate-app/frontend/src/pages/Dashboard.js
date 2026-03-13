import React, { useState, useEffect } from 'react';
import { retail, hotel } from '../api';
import { StatCard, Card, PageHeader } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const [rs, setRs] = useState(null);
  const [hs, setHs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([retail.stats(), hotel.stats()])
      .then(([r, h]) => { setRs(r.data); setHs(h.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'DM Serif Display', fontSize: 28, color: 'var(--slate)' }}>Loading…</div>
    </div>
  );

  const occupancyData = [
    { name: 'Commercial', rate: rs?.occupancy_rate || 0, fill: '#C9A84C' },
    { name: 'Hotel', rate: hs?.occupancy_rate || 0, fill: '#4A7C59' },
  ];

  return (
    <div className="animate-fade">
      <PageHeader title="Dashboard" sub="Overview of your entire real estate portfolio" />

      {/* Decorative strip */}
      <div style={{ height: 4, borderRadius: 2, background: 'linear-gradient(90deg, var(--gold), var(--sage), var(--terracotta))', marginBottom: 32 }} />

      {/* Commercial Stats */}
      <h2 style={{ fontSize: 20, marginBottom: 16, color: 'var(--slate)', fontFamily: 'DM Serif Display' }}>Commercial Portfolio</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Units" value={rs?.total_units ?? '—'} icon="▦" color="var(--ink)" />
        <StatCard label="Occupancy" value={`${rs?.occupancy_rate ?? 0}%`} icon="%" color="#2D4A3E" />
        <StatCard label="Active Tenants" value={rs?.active_tenants ?? '—'} icon="◉" color="#3D3520" />
        <StatCard label="Monthly Revenue" value={rs ? `$${rs.monthly_revenue.toLocaleString()}` : '—'} icon="$" color="#4A2020" />
        <StatCard label="Pending Invoices" value={rs?.pending_invoices ?? '—'} icon="◇" color="#2A3050" />
        <StatCard label="Open Maintenance" value={rs?.open_maintenance ?? '—'} icon="⚙" color="#3D2D40" />
      </div>

      {/* Hotel Stats */}
      <h2 style={{ fontSize: 20, marginBottom: 16, color: 'var(--slate)', fontFamily: 'DM Serif Display' }}>Hospitality Portfolio</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
        <StatCard label="Total Rooms" value={hs?.total_rooms ?? '—'} icon="⊡" color="var(--ink)" />
        <StatCard label="Occupancy" value={`${hs?.occupancy_rate ?? 0}%`} icon="%" color="#2D4A3E" />
        <StatCard label="Available Rooms" value={hs?.available_rooms ?? '—'} icon="✓" color="#3D3520" />
        <StatCard label="Total Revenue" value={hs ? `$${hs.total_revenue.toLocaleString()}` : '—'} icon="$" color="#4A2020" />
        <StatCard label="Total Guests" value={hs?.total_guests ?? '—'} icon="◎" color="#2A3050" />
        <StatCard label="Active Bookings" value={hs?.active_bookings ?? '—'} icon="◈" color="#3D2D40" />
      </div>

      {/* Chart */}
      <Card>
        <h3 style={{ fontSize: 20, marginBottom: 24 }}>Occupancy Comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={occupancyData} barSize={60}>
            <XAxis dataKey="name" tick={{ fontFamily: 'DM Sans', fontSize: 13 }} />
            <YAxis domain={[0, 100]} tick={{ fontFamily: 'DM Sans', fontSize: 12 }} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, 'Occupancy Rate']} />
            <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
              {occupancyData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
