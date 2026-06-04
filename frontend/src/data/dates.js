// ── Shared date utilities ────────────────────────────────────────────────────

// Whole days from today until the given date string.
// Returns null for empty input; positive = future, negative = past.
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}
