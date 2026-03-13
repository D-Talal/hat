import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { section: 'Overview', items: [{ path: '/', label: 'Dashboard', icon: '◈' }] },
  {
    section: 'Commercial', items: [
      { path: '/retail/properties', label: 'Properties', icon: '▦' },
      { path: '/retail/units', label: 'Units', icon: '⊞' },
      { path: '/retail/tenants', label: 'Tenants', icon: '◉' },
      { path: '/retail/invoices', label: 'Invoices', icon: '◇' },
      { path: '/retail/maintenance', label: 'Maintenance', icon: '⚙' },
    ]
  },
  {
    section: 'Hospitality', items: [
      { path: '/hotel/hotels', label: 'Hotels', icon: '▲' },
      { path: '/hotel/rooms', label: 'Rooms', icon: '⊡' },
      { path: '/hotel/guests', label: 'Guests', icon: '◎' },
      { path: '/hotel/bookings', label: 'Bookings', icon: '◈' },
    ]
  }
];

export default function Sidebar() {
  const loc = useLocation();
  return (
    <nav style={{
      width: 260, minHeight: '100vh', background: 'var(--ink)', color: 'white',
      display: 'flex', flexDirection: 'column', padding: '0 0 24px',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>PropManager</div>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 22, lineHeight: 1.2 }}>Real Estate<br /><em>Platform</em></div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navItems.map(group => (
          <div key={group.section} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>{group.section}</div>
            {group.items.map(item => {
              const active = loc.pathname === item.path || (item.path !== '/' && loc.pathname.startsWith(item.path));
              return (
                <NavLink key={item.path} to={item.path} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--gold)' : 'rgba(255,255,255,0.65)',
                  background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
        v1.0.0 · Real Estate Suite
      </div>
    </nav>
  );
}
