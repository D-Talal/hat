import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import API from '../api';

const roleColors = { admin: '#C9A84C', manager: '#4A7C59', viewer: '#6B7280', accountant: '#3B82F6' };

// Collapsible sub-group for secondary pages
function SubGroup({ label, children, defaultOpen = false }) {
  const loc = useLocation();
  const paths = React.Children.map(children, c => c?.props?.to) || [];
  const anyActive = paths.some(p => p && loc.pathname.startsWith(p));
  const [open, setOpen] = useState(defaultOpen || anyActive);

  useEffect(() => {
    if (anyActive) setOpen(true);
  }, [loc.pathname]);

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: anyActive ? 'rgba(201,168,76,0.08)' : 'transparent',
          color: anyActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
          fontSize: 13, fontFamily: 'DM Sans', fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <span style={{
          fontSize: 9, opacity: 0.6,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 12, marginTop: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function NavItem({ to, icon, label, badge }) {
  const loc = useLocation();
  const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
  return (
    <NavLink
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 7, marginBottom: 1,
        textDecoration: 'none', fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
        background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
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
        setPendingCount(res.data.filter(o => !o.is_validated && o.is_active).length);
      } catch {
        setIsSuperAdmin(false);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const isAdmin    = ['admin'].includes(user?.role);
  const isManager  = ['admin', 'manager'].includes(user?.role);
  const isFinance  = ['admin', 'manager', 'accountant'].includes(user?.role);

  const fr = language === 'fr';

  return (
    <nav style={{
      width: 240, minHeight: '100vh', background: 'var(--ink)', color: 'white',
      display: 'flex', flexDirection: 'column', padding: '0 0 24px',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 3 }}>PropManager</div>
        <div style={{ fontFamily: 'DM Serif Display', fontSize: 20, lineHeight: 1.2 }}>Real Estate<br /><em>Platform</em></div>
      </div>

      {/* ── User ── */}
      {user && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: roleColors[user.role] || 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            {(user.full_name || user.email)[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name || user.email}
            </div>
            <div style={{ fontSize: 10, color: roleColors[user.role] || 'var(--gold)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
              {user.role}
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 10px' }}>

        {/* — Vue générale — */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
            {fr ? 'Vue générale' : 'Overview'}
          </div>
          <NavItem to="/"             icon="◈" label={fr ? 'Tableau de bord' : 'Dashboard'} />
          <NavItem to="/revenue-map"  icon="◉" label={fr ? 'Carte revenus'  : 'Revenue Map'} />
        </div>

        {/* — Commercial — */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
            {t.nav.commercial}
          </div>
          <NavItem to="/commercial/dashboard"  icon="◈" label={fr ? 'Vue d\'ensemble' : 'Overview'} />
          <NavItem to="/commercial/patrimoine" icon="▦" label={fr ? 'Patrimoine'     : 'Properties'} />
          <NavItem to="/commercial/partners"   icon="◉" label={fr ? 'Partenaires'    : 'Partners'} />
          <NavItem to="/commercial/contracts"  icon="◇" label={fr ? 'Contrats'       : 'Contracts'} />

          {/* Finance sub-group — accountants+ */}
          {isFinance && (
            <SubGroup label={fr ? 'Finance' : 'Finance'}>
              <NavItem to="/commercial/invoices"          icon="🧾" label={fr ? 'Factures'        : 'Invoices'} />
              <NavItem to="/commercial/deposit-contracts" icon="🔒" label={fr ? 'Dépôts'          : 'Deposits'} />
              <NavItem to="/commercial/conditions"        icon="≡"  label={fr ? 'Conditions'      : 'Conditions'} />
            </SubGroup>
          )}

          {/* Opérations sub-group — managers+ */}
          {isManager && (
            <SubGroup label={fr ? 'Opérations' : 'Operations'}>
              <NavItem to="/commercial/vacancy-postings"    icon="🏚" label={fr ? 'Vacances'       : 'Vacancy'} />
              <NavItem to="/commercial/sales-declarations"  icon="📊" label={fr ? 'Décl. CA'       : 'Sales Decl.'} />
              <NavItem to="/commercial/service-charges"     icon="⚖"  label={fr ? 'Charges'        : 'Svc Charges'} />
              <NavItem to="/commercial/posting-engine"      icon="⚡" label={fr ? 'Posting Engine' : 'Posting'} />
              <NavItem to="/commercial/csv-import"          icon="📂" label={fr ? 'Import CSV'     : 'CSV Import'} />
            </SubGroup>
          )}
        </div>

        {/* — Hôtellerie — */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
            {t.nav.hospitality}
          </div>
          <NavItem to="/hotel/calendar"   icon="📅" label={fr ? 'Calendrier'      : 'Calendar'} />
          <NavItem to="/hotel/reception"  icon="🛎" label={fr ? 'Réception'       : 'Reception'} />
          <NavItem to="/hotel/dashboard"  icon="◈"  label={fr ? 'Tableau de bord' : 'Dashboard'} />

          <SubGroup label={fr ? 'Configuration' : 'Setup'}>
            <NavItem to="/hotel/hotels"   icon="▲" label={fr ? 'Hôtels'      : 'Hotels'} />
            <NavItem to="/hotel/rooms"    icon="⊡" label={fr ? 'Chambres'    : 'Rooms'} />
            <NavItem to="/hotel/guests"   icon="◎" label={fr ? 'Clients'     : 'Guests'} />
            <NavItem to="/hotel/bookings" icon="◈" label={fr ? 'Réservations' : 'Bookings'} />
          </SubGroup>
        </div>

        {/* — Admin — */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
            {t.nav.admin}
          </div>
          {isAdmin   && <NavItem to="/users"       icon="◑" label={t.nav.users} />}
          {isManager && <NavItem to="/audit"       icon="▣" label={t.nav.auditLog} />}
                        <NavItem to="/settings"    icon="◌" label={t.nav.settings} />
          {isSuperAdmin && <NavItem to="/super-admin" icon="🛡" label="Super Admin" badge={pendingCount} />}
        </div>

      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{fr ? 'Langue' : 'Language'}</span>
          <button onClick={toggleLanguage} style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 3, cursor: 'pointer' }}>
            {['EN', 'FR'].map(l => (
              <span key={l} style={{
                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: language === l.toLowerCase() ? 'var(--gold)' : 'transparent',
                color: language === l.toLowerCase() ? '#1a1a2e' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.2s',
              }}>{l}</span>
            ))}
          </button>
        </div>
        <button onClick={logout} style={{
          background: 'rgba(193,68,14,0.15)', border: '1px solid rgba(193,68,14,0.3)',
          color: '#FF8A65', borderRadius: 8, padding: '10px 16px', width: '100%',
          cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
        }}>
          {t.nav.signOut}
        </button>
      </div>
    </nav>
  );
}
