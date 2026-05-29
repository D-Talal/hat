import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../api';

const roleColors = { admin: '#C9A84C', manager: '#4A7C59', viewer: '#6B7280', accountant: '#3B82F6' };

export default function Sidebar() {
  const loc = useLocation();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const [pendingCount, setPendingCount] = useState(0);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      try {
        const res = await API.get('/super-admin/orgs');
        setIsSuperAdmin(true);
        const count = res.data.filter(o => !o.is_validated && o.is_active).length;
        setPendingCount(count);
      } catch {
        setIsSuperAdmin(false);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const navItems = [
    { section: t.nav.overview, items: [
      { path: '/', label: t.nav.dashboard, icon: '◈' },
      { path: '/revenue-map', label: t.nav.revenueMap, icon: '◉' },
    ]},
    { section: t.nav.commercial, items: [
      { path: '/commercial/patrimoine',      label: language === 'fr' ? 'Patrimoine'       : 'Patrimoine',        icon: '▦' },
      { path: '/commercial/partners',        label: language === 'fr' ? 'Partenaires'       : 'Business Partners', icon: '◉' },
      { path: '/commercial/contracts',       label: language === 'fr' ? 'Contrats'          : 'Contracts',         icon: '◇' },
      { path: '/commercial/conditions',      label: language === 'fr' ? 'Conditions'        : 'Conditions',        icon: '≡' },
      { path: '/commercial/rental-objects',  label: language === 'fr' ? 'Objets locatifs'   : 'Rental Objects',    icon: '⊞' },
      { path: '/commercial/service-charges', label: language === 'fr' ? 'Charges locatives' : 'Service Charges',   icon: '⚖' },
      { path: '/commercial/deposit-contracts',  label: language === 'fr' ? 'Dépôts de garantie'      : 'Deposits',            icon: '🔒', roles: ['admin','manager','accountant'] },
      { path: '/commercial/vacancy-postings',    label: language === 'fr' ? 'Postings de vacance'      : 'Vacancy Postings',     icon: '🏚', roles: ['admin','manager','accountant'] },
      { path: '/commercial/sales-declarations',  label: language === 'fr' ? 'Déclarations de CA'       : 'Sales Declarations',   icon: '📊', roles: ['admin','manager','accountant'] },
      { path: '/commercial/invoices',      label: language === 'fr' ? 'Factures'        : 'Invoices',        icon: '🧾', roles: ['admin','manager','accountant'] },
      { path: '/commercial/posting-engine',  label: language === 'fr' ? 'Moteur de posting' : 'Posting Engine',    icon: '⚡', roles: ['admin','manager','accountant'] },
      { path: '/commercial/csv-import',         label: language === 'fr' ? 'Import CSV'        : 'CSV Import',         icon: '📂', roles: ['admin','manager'] },
    ]},
    { section: t.nav.hospitality, items: [
      { path: '/hotel/hotels',   label: t.nav.hotels,   icon: '▲' },
      { path: '/hotel/rooms',    label: t.nav.rooms,    icon: '⊡' },
      { path: '/hotel/guests',   label: t.nav.guests,   icon: '◎' },
      { path: '/hotel/bookings', label: t.nav.bookings, icon: '◈' },
    ]},
    { section: t.nav.admin, items: [
      { path: '/users',       label: t.nav.users,    icon: '◑', roles: ['admin'] },
      { path: '/audit',       label: t.nav.auditLog, icon: '▣', roles: ['admin', 'manager'] },
      { path: '/settings',    label: t.nav.settings, icon: '◌' },
      { path: '/super-admin', label: 'Super Admin',   icon: '🛡', superAdminOnly: true },
    ]}
  ];

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
          const visibleItems = group.items.filter(item => {
            if (item.superAdminOnly) return isSuperAdmin;
            return !item.roles || item.roles.includes(user?.role);
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.section} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>{group.section}</div>
              {visibleItems.map(item => {
                const active = loc.pathname === item.path || (item.path !== '/' && loc.pathname.startsWith(item.path));
                return (
                  <NavLink key={item.path} to={item.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 2, textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 400, color: active ? 'var(--gold)' : 'rgba(255,255,255,0.65)', background: active ? 'rgba(201,168,76,0.12)' : 'transparent', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.superAdminOnly && pendingCount > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '2px 7px', minWidth: 18, textAlign: 'center' }}>
                        {pendingCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{language === 'en' ? 'Language' : 'Langue'}</span>
          <button onClick={toggleLanguage} style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 3, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: language === 'en' ? 'var(--gold)' : 'transparent', color: language === 'en' ? '#1a1a2e' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>EN</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: language === 'fr' ? 'var(--gold)' : 'transparent', color: language === 'fr' ? '#1a1a2e' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>FR</span>
          </button>
        </div>
        <button onClick={logout} style={{ background: 'rgba(193,68,14,0.15)', border: '1px solid rgba(193,68,14,0.3)', color: '#FF8A65', borderRadius: 8, padding: '10px 16px', width: '100%', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600 }}>{t.nav.signOut}</button>
      </div>
    </nav>
  );
}
