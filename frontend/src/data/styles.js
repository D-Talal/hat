// ── Shared form & button styles ──────────────────────────────────────────────
// Single source of truth for the commercial module's inline styles.
// Previously duplicated across ~11 page files — now centralized here.
// Values are kept byte-for-byte identical to the originals so no visual change.

export const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1.5px solid var(--border)',
  fontFamily: 'DM Sans',
  fontSize: 14,
  boxSizing: 'border-box',
};

export const btnPrimary = {
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--ink)',
  color: 'var(--gold)',
  cursor: 'pointer',
  fontFamily: 'DM Sans',
  fontWeight: 700,
};

export const btnSecondary = {
  padding: '10px 20px',
  borderRadius: 8,
  border: '1.5px solid var(--border)',
  background: 'white',
  cursor: 'pointer',
  fontFamily: 'DM Sans',
};

export const btnDanger = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#dc2626',
  color: 'white',
  cursor: 'pointer',
  fontFamily: 'DM Sans',
  fontWeight: 700,
  fontSize: 13,
};

export const btnAdd = {
  background: 'var(--ink)',
  color: 'var(--gold)',
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'DM Sans',
  fontWeight: 700,
};
