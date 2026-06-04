// ── Contract status — single source of truth for colors ──────────────────────
// Labels are bilingual and live in LanguageContext (t.commercial.contractStatus).
// Colors are language-independent and centralized here so every page renders
// the same palette. Use getContractStatus(status, t) to get { bg, text, label }.

export const CONTRACT_STATUS_COLORS = {
  draft:      { bg: '#fff8e1', text: '#f57f17' },
  released:   { bg: '#e8f5e9', text: '#2e7d32' },
  terminated: { bg: '#fce4ec', text: '#c62828' },
  expired:    { bg: '#f5f5f5', text: '#757575' },
};

const FALLBACK = { bg: '#f5f5f5', text: '#757575' };

// Returns { bg, text, label } for a given status code.
// `t` is the translation object from useLanguage(); falls back to the raw code.
export function getContractStatus(status, t) {
  const colors = CONTRACT_STATUS_COLORS[status] || FALLBACK;
  const label = t?.commercial?.contractStatus?.[status] || status;
  return { ...colors, label };
}
