import { useAuth } from '../context/AuthContext';

// ── Internationalized formatting ─────────────────────────────────────────────
// Single source of truth for money / date / number / area formatting.
// Everything keys off the organization's i18n settings (locale, currency,
// timezone, area_unit) returned by /auth/me, with safe fallbacks.

const DEFAULTS = {
  locale: 'en-US',
  default_currency: 'USD',
  timezone: 'UTC',
  area_unit: 'sqm',
};

// SQM <-> SQFT conversion
const SQM_TO_SQFT = 10.7639;

// ── Pure formatters (settings passed explicitly) ──────────────────────────────

export function formatMoney(amount, settings = {}, opts = {}) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const { locale, default_currency } = { ...DEFAULTS, ...settings };
  const currency = opts.currency || default_currency;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: opts.maximumFractionDigits ?? 2,
      minimumFractionDigits: opts.minimumFractionDigits ?? (opts.maximumFractionDigits === 0 ? 0 : 2),
    }).format(amount);
  } catch {
    // Bad currency/locale → fall back to a plain number with the code
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}

// Compact money (e.g. €1.2M, $850k) — respects org currency
export function formatMoneyShort(amount, settings = {}, opts = {}) {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  const { locale, default_currency } = { ...DEFAULTS, ...settings };
  const currency = opts.currency || default_currency;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}

export function formatNumber(value, settings = {}, opts = {}) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const { locale } = { ...DEFAULTS, ...settings };
  try {
    return new Intl.NumberFormat(locale, opts).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(dateInput, settings = {}, opts = {}) {
  if (!dateInput) return '—';
  const { locale, timezone } = { ...DEFAULTS, ...settings };
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      ...(opts.dateStyle || opts.timeStyle || opts.year || opts.month || opts.day || opts.hour
        ? opts
        : { year: 'numeric', month: 'short', day: 'numeric' }),
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatDateTime(dateInput, settings = {}) {
  return formatDate(dateInput, settings, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Area: values are stored canonically in m². Display in org's preferred unit.
export function formatArea(sqm, settings = {}) {
  if (sqm === null || sqm === undefined || isNaN(sqm)) return '—';
  const { area_unit, locale } = { ...DEFAULTS, ...settings };
  if (area_unit === 'sqft') {
    const sqft = sqm * SQM_TO_SQFT;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(sqft)} ft²`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(sqm)} m²`;
}

// ── React hook: auto-pulls settings from the logged-in org ────────────────────

export function useFormat() {
  const { user } = useAuth();
  const settings = {
    locale:           user?.organization?.locale           || DEFAULTS.locale,
    default_currency: user?.organization?.default_currency || DEFAULTS.default_currency,
    timezone:         user?.organization?.timezone         || DEFAULTS.timezone,
    area_unit:        user?.organization?.area_unit        || DEFAULTS.area_unit,
  };
  return {
    settings,
    money:      (a, opts) => formatMoney(a, settings, opts),
    moneyShort: (a, opts) => formatMoneyShort(a, settings, opts),
    number:     (v, opts) => formatNumber(v, settings, opts),
    date:       (d, opts) => formatDate(d, settings, opts),
    dateTime:   (d) => formatDateTime(d, settings),
    area:       (sqm) => formatArea(sqm, settings),
  };
}
