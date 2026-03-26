import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { section: 'Overview', items: [
    { path: '/', label: 'Dashboard', icon: '◈' },
    { path: '/revenue-map', label: 'Revenue Map', icon: '◉' },
  ]},
  { section: 'Commercial', items: [
    { path: '/retail/properties', label: 'Properties', icon: '▦' },
    { path: '/retail/units', label: 'Units', icon: '⊞' },
    { path: '/retail/tenants', label: 'Tenants', icon: '◉' },
    { path: '/retail/invoices', label: 'Invoices', icon: '◇' },
    { path: '/retail/maintenance', label: 'Maintenance', icon: '⚙' },
  ]},
  { section: 'Hospitality', items: [
    { path: '/hotel/hotels', label: 'Hotels', icon: '▲' },
    { path: '/hotel/rooms', label: 'Rooms', icon: '⊡' },
    { path: '/hotel/guests', label: 'Guests', icon: '◎' },
    { path: '/hotel/bookings', label: 'Bookings', icon: '◈' },
  ]},
  { section: 'Admin', items: [
    { path: '/users', label: 'Users', icon: '◑', roles: ['admin'] },
    { path: '/audit', label: 'Audit Log', icon: '▣', roles: ['admin', 'manager'] },
    { path: '/settings', label: 'My Settings', icon: '◌' },
  ]}
];

const roleColors = { admin: '#C9A84C', manager: '#4A7C59', viewer: '#6B7280', accountant: '#3B82F6' };

export default function Sidebar() {
  const loc = useLocation();
  const { user, logout } = useAuth();

  return (
    <nav style={{ width: 260, minHeight: '100vh', background: 'var(--ink)', color: 'white', display: 'flex', flexDirection: 'column', padding: '0 0 24px', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}>
      <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 4 }}>PropManager</div>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 22, lineHeight: 1.2 }}>Real Estate<br /><em>Platform</em></div>
      </div>

      {user && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: roleColors[user.role] || 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {(user.full_name || user.email)[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name || user.email}</div>
            <div style={{ fontSize: 11, color: roleColors[user.role] || 'var(--gold)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{user.role}</div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {navItems.map(group => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(user?.role));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.section} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>{group.section}</div>
              {visibleItems.map(item => {
                const active = loc.pathname === item.path || (item.path !== '/' && loc.pathname.startsWith(item.path));
                return (
                  <NavLink key={item.path} to={item.path} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 8, marginBottom: 2, textDecoration: 'none',
                    fontSize: 14, fontWeight: active ? 600 : 400,
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
          );
        })}
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={logout} style={{ background: 'rgba(193,68,14,0.15)', border: '1px solid rgba(193,68,14,0.3)', color: '#FF8A65', borderRadius: 8, padding: '10px 16px', width: '100%', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600 }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
