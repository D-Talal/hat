import React from 'react';

// ── Shared form helper components ────────────────────────────────────────────
// Previously duplicated as local `Field` / `SectionTitle` across many pages.
// Centralized here. Field is identical everywhere; SectionTitle exposes a
// marginTop prop (default 24) so pages that used 20 can opt in.

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function SectionTitle({ children, marginTop = 24 }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', marginBottom: 12, marginTop, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  );
}
