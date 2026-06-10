// Turn any API error into a readable string — never returns an object or array.
// Rendering a raw object/array as a React child throws (React error #31), which
// is what happens when a Pydantic 422 (detail = array of { type, loc, msg, ... })
// is put straight into JSX. Always run API errors through this before display.
export function parseApiError(e) {
  const detail = e?.response?.data?.detail;
  if (!detail) return e?.message || 'Une erreur est survenue.';
  if (typeof detail === 'string') return detail;
  // FastAPI/Pydantic 422: detail is an array of { loc, msg, ... }
  if (Array.isArray(detail)) {
    return detail
      .map(d => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
        return field ? `${field}: ${d.msg}` : (d.msg || 'Erreur de validation');
      })
      .join(' · ');
  }
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail);
  return String(detail);
}
