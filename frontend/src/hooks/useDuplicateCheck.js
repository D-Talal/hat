/**
 * useDuplicateCheck — centralized frontend duplicate detection
 *
 * Usage:
 *   const { checkDuplicate, DuplicateWarning } = useDuplicateCheck(existingItems, {
 *     fields: ['name'],          // fields to check (case-insensitive)
 *     labels: { name: 'Name' }, // human-readable field labels
 *     editingId: initial?.id,   // exclude self when editing
 *     scope: 'same building',   // optional contextual scope description
 *   });
 *
 *   // In save():
 *   const dupError = checkDuplicate(form);
 *   if (dupError) { setError(dupError); return; }
 *
 *   // In JSX (renders nothing if no duplicate):
 *   <DuplicateWarning value={form.name} field="name" />
 */
import { useCallback } from 'react';

/**
 * Normalize a string for comparison: lowercase, trim, collapse spaces
 */
function normalize(str) {
  return String(str ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Core duplicate check across a list of items.
 * Returns { field, existing } if duplicate found, null otherwise.
 */
function findDuplicate(items, form, fields, editingId) {
  for (const field of fields) {
    const val = normalize(form[field]);
    if (!val) continue;
    const dup = items.find(
      item =>
        (editingId == null || item.id !== editingId) &&
        normalize(item[field]) === val
    );
    if (dup) return { field, existing: dup };
  }
  return null;
}

/**
 * The hook.
 */
export function useDuplicateCheck(items = [], options = {}) {
  const {
    fields = ['name'],
    labels = {},
    editingId = null,
    scope = '',
  } = options;

  /**
   * Returns an error string if a duplicate is found, null otherwise.
   * Call this inside save() before the API call.
   */
  const checkDuplicate = useCallback(
    (form) => {
      const dup = findDuplicate(items, form, fields, editingId);
      if (!dup) return null;
      const fieldLabel = labels[dup.field] || dup.field;
      const scopePart  = scope ? ` dans ${scope}` : '';
      return `Un doublon existe déjà${scopePart} — "${form[dup.field]}" est déjà utilisé comme ${fieldLabel}.`;
    },
    [items, fields, labels, editingId, scope]
  );

  /**
   * Inline warning component — shows a yellow banner as the user types,
   * before they even try to save.
   */
  const DuplicateWarning = useCallback(
    ({ value, field }) => {
      if (!value) return null;
      const dup = findDuplicate(items, { [field]: value }, [field], editingId);
      if (!dup) return null;
      const fieldLabel = labels[field] || field;
      const scopePart  = scope ? ` dans ${scope}` : '';
      return (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          borderRadius: 7,
          padding: '7px 12px',
          fontSize: 12,
          color: '#92400e',
          marginTop: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span>⚠️</span>
          <span>
            Ce {fieldLabel.toLowerCase()} existe déjà{scopePart}.
            Veuillez choisir un nom différent.
          </span>
        </div>
      );
    },
    [items, labels, editingId, scope]
  );

  return { checkDuplicate, DuplicateWarning };
}

export default useDuplicateCheck;
