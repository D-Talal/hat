import React, { useState } from 'react';

const s = {
  card: {
    background: 'var(--surface)', borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)', padding: '24px', border: '1px solid var(--border)',
  },
  statCard: {
    background: 'var(--ink)', borderRadius: 'var(--radius)',
    padding: '24px', color: 'white', position: 'relative', overflow: 'hidden',
  },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '10px 20px', borderRadius: '8px', fontFamily: 'DM Sans',
    fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none',
    transition: 'all 0.2s',
  },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: '14px',
    background: 'var(--cream)', color: 'var(--ink)', outline: 'none',
    transition: 'border-color 0.2s',
  },
  label: { fontSize: '12px', fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)' },
  td: { padding: '14px 16px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
};

export const Card = ({ children, style }) => <div style={{ ...s.card, ...style }}>{children}</div>;

export const StatCard = ({ label, value, sub, color, icon }) => (
  <div style={{ ...s.statCard, background: color || 'var(--ink)' }}>
    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: '36px', fontFamily: 'DM Serif Display', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '13px', opacity: 0.7, marginTop: 8 }}>{sub}</div>}
    {icon && <div style={{ position: 'absolute', right: 20, top: 20, opacity: 0.15, fontSize: '48px' }}>{icon}</div>}
  </div>
);

export const Btn = ({ children, onClick, variant = 'primary', style, type = 'button', disabled }) => {
  const variants = {
    primary: { background: 'var(--gold)', color: 'var(--ink)' },
    danger: { background: 'var(--terracotta)', color: 'white' },
    ghost: { background: 'transparent', color: 'var(--ink)', border: '1.5px solid var(--border)' },
    success: { background: 'var(--sage)', color: 'white' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...s.btn, ...variants[variant], opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  );
};

export const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={s.label}>{label}</label>}
    <input style={s.input} {...props} onFocus={e => e.target.style.borderColor = 'var(--gold)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
  </div>
);

export const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={s.label}>{label}</label>}
    <select style={{ ...s.input, cursor: 'pointer' }} {...props}>{children}</select>
  </div>
);

export const Textarea = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={s.label}>{label}</label>}
    <textarea style={{ ...s.input, resize: 'vertical', minHeight: 80 }} {...props} />
  </div>
);

export const Badge = ({ status }) => {
  const colors = {
    active: { bg: '#D1FAE5', color: '#065F46' }, available: { bg: '#D1FAE5', color: '#065F46' },
    expired: { bg: '#FEE2E2', color: '#991B1B' }, occupied: { bg: '#DBEAFE', color: '#1E40AF' },
    pending: { bg: '#FEF3C7', color: '#92400E' }, open: { bg: '#FEE2E2', color: '#991B1B' },
    confirmed: { bg: '#D1FAE5', color: '#065F46' }, checked_in: { bg: '#DBEAFE', color: '#1E40AF' },
    checked_out: { bg: '#F3F4F6', color: '#374151' }, cancelled: { bg: '#FEE2E2', color: '#991B1B' },
    maintenance: { bg: '#FEF3C7', color: '#92400E' }, in_progress: { bg: '#DBEAFE', color: '#1E40AF' },
    closed: { bg: '#F3F4F6', color: '#374151' }, reserved: { bg: '#EDE9FE', color: '#5B21B6' },
    paid: { bg: '#D1FAE5', color: '#065F46' }, terminated: { bg: '#FEE2E2', color: '#991B1B' },
  };
  const c = colors[status] || { bg: '#F3F4F6', color: '#374151' };
  return <span style={{ ...s.badge, background: c.bg, color: c.color }}>{status?.replace(/_/g, ' ')}</span>;
};

export const Table = ({ cols, rows, onEdit, onDelete }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={s.table}>
      <thead>
        <tr>{cols.map(c => <th key={c.key} style={s.th}>{c.label}</th>)}
          <th style={s.th}>Actions</th></tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={cols.length + 1} style={{ ...s.td, textAlign: 'center', color: 'var(--slate)', padding: 40 }}>No records found</td></tr>
        ) : rows.map((row, i) => (
          <tr key={row.id || i} style={{ transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {cols.map(c => <td key={c.key} style={s.td}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}</td>)}
            <td style={s.td}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" onClick={() => onEdit(row)} style={{ padding: '6px 12px', fontSize: 12 }}>Edit</Btn>
                <Btn variant="danger" onClick={() => onDelete(row.id)} style={{ padding: '6px 12px', fontSize: 12 }}>Del</Btn>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Modal = ({ title, children, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(4px)' }} />
    <div style={{ position: 'relative', background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 22 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--slate)' }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

export const PageHeader = ({ title, sub, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
    <div>
      <h1 style={{ fontSize: 36, lineHeight: 1.1 }}>{title}</h1>
      {sub && <p style={{ color: 'var(--slate)', marginTop: 6, fontSize: 15 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

export { s as styles };
