/**
 * Shared constants — PropManager
 * Single source of truth for all dropdown values.
 * Must match backend validators.py exactly.
 */

// ── Condition Types ────────────────────────────────────────────────────────────
export const CONDITION_TYPES = {
  base_rent:       { label: 'Base Rent',        labelFr: 'Loyer de base',         bg: '#eef0fd', text: '#4361ee' },
  service_charge:  { label: 'Service Charge',   labelFr: 'Charges locatives',      bg: '#f0fdf4', text: '#16a34a' },
  advance_payment: { label: 'Advance Payment',  labelFr: 'Avance sur charges',     bg: '#fff7ed', text: '#ea580c' },
  flat_rate:       { label: 'Flat Rate',        labelFr: 'Forfait',                bg: '#f5f3ff', text: '#7c3aed' },
  sales_based:     { label: 'Sales-Based Rent', labelFr: 'Loyer basé sur CA',      bg: '#eff6ff', text: '#2563eb' },
  markup_fee:      { label: 'Markup Fee',       labelFr: 'Frais de gestion',       bg: '#f1f5f9', text: '#475569' },
  rent_free:       { label: 'Rent-Free',        labelFr: 'Franchise de loyer',     bg: '#fef2f2', text: '#dc2626' },
  abatement:       { label: 'Abatement',        labelFr: 'Abattement',             bg: '#fdf4ff', text: '#9333ea' },
};

// ── Frequencies ───────────────────────────────────────────────────────────────
export const FREQUENCIES = {
  monthly:    { label: 'Monthly',     labelFr: 'Mensuel' },
  quarterly:  { label: 'Quarterly',   labelFr: 'Trimestriel' },
  semi_annual:{ label: 'Semi-Annual', labelFr: 'Semestriel' },
  annual:     { label: 'Annual',      labelFr: 'Annuel' },
};

// ── Payment Timing ────────────────────────────────────────────────────────────
export const PAYMENT_TIMINGS = {
  in_advance: { label: 'In Advance', labelFr: 'En avance' },
  in_arrears: { label: 'In Arrears', labelFr: 'En retard' },
};

// ── Day Count Methods (must match backend VALID_DAY_COUNT_METHODS) ────────────
export const DAY_COUNT_METHODS = {
  act_365: { label: 'Actual / 365' },
  act_360: { label: 'Actual / 360' },
  act_act: { label: 'Actual / Actual' },
  '30_360':{ label: '30 / 360' },
};

// ── Contract Types ────────────────────────────────────────────────────────────
export const CONTRACT_TYPES = {
  lease_out: { label: 'Lease Out (LO) — Tenant to Landlord' },
  lease_in:  { label: 'Lease In (LI)  — Tenant from Landlord' },
};

// ── Contract Statuses ─────────────────────────────────────────────────────────
export const CONTRACT_STATUSES = {
  draft:      { label: 'Draft',      bg: '#f5f5f5', text: '#757575' },
  released:   { label: 'Released',   bg: '#e8f5e9', text: '#2e7d32' },
  terminated: { label: 'Terminated', bg: '#fce4ec', text: '#c62828' },
  expired:    { label: 'Expired',    bg: '#fff3e0', text: '#e65100' },
};

// ── Space / Rental Object Statuses ────────────────────────────────────────────
export const SPACE_STATUSES = {
  available:   { label: 'Available',   bg: '#e8f5e9', text: '#2e7d32' },
  occupied:    { label: 'Occupied',    bg: '#e3f2fd', text: '#1565c0' },
  maintenance: { label: 'Maintenance', bg: '#fff8e1', text: '#f57f17' },
  vacant:      { label: 'Vacant',      bg: '#fce4ec', text: '#c62828' },
};

// ── Usage Types ───────────────────────────────────────────────────────────────
export const USAGE_TYPES = {
  retail:     { label: 'Retail' },
  office:     { label: 'Office' },
  warehouse:  { label: 'Warehouse' },
  restaurant: { label: 'Restaurant' },
  services:   { label: 'Services' },
  storage:    { label: 'Storage' },
  other:      { label: 'Other' },
};

// ── Business Partner Roles ────────────────────────────────────────────────────
export const BP_ROLES = {
  master_tenant:  { label: 'Master Tenant' },
  guarantor:      { label: 'Guarantor' },
  landlord:       { label: 'Landlord' },
  vendor:         { label: 'Vendor' },
  contact_person: { label: 'Contact Person' },
};

// ── Deposit Calc Methods ──────────────────────────────────────────────────────
export const DEPOSIT_CALC_METHODS = {
  fixed:          { label: 'Fixed Amount' },
  months_of_rent: { label: 'Months of Rent' },
};

// ── Deposit Statuses ──────────────────────────────────────────────────────────
export const DEPOSIT_STATUSES = {
  active:   { label: 'Active',   bg: '#e8f5e9', text: '#2e7d32' },
  refunded: { label: 'Refunded', bg: '#f5f5f5', text: '#757575' },
  expired:  { label: 'Expired',  bg: '#fff3e0', text: '#e65100' },
};

// ── Service Charge Categories ─────────────────────────────────────────────────
export const CHARGE_CATEGORIES = [
  'general', 'utilities', 'waste', 'parking', 'security', 'marketing', 'insurance'
];

// ── Markup Rates ──────────────────────────────────────────────────────────────
export const MARKUP_RATES = [
  { value: 0,    label: '0%' },
  { value: 0.05, label: '5%' },
  { value: 0.10, label: '10%' },
  { value: 0.13, label: '13%' },
  { value: 0.15, label: '15%' },
  { value: 0.20, label: '20%' },
];

// ── Common currencies (shown first in dropdowns) ──────────────────────────────
export const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'CHF', 'MAD', 'AED', 'SAR',
  'QAR', 'KWD', 'EGP', 'TND', 'DZD', 'XOF', 'NGN', 'ZAR',
  'INR', 'JPY', 'CNY', 'AUD', 'BRL', 'SGD', 'HKD',
];

// ── Continents ────────────────────────────────────────────────────────────────
export const CONTINENTS = [
  'Africa', 'Asia Pacific', 'Europe', 'Middle East', 'North America', 'South America'
];

// ── Maintenance Priorities & Statuses ─────────────────────────────────────────
export const MAINTENANCE_PRIORITIES = {
  low:    { label: 'Low',    bg: '#e8f5e9', text: '#2e7d32' },
  medium: { label: 'Medium', bg: '#fff8e1', text: '#f57f17' },
  high:   { label: 'High',   bg: '#fce4ec', text: '#c62828' },
};

export const MAINTENANCE_STATUSES = {
  open:        { label: 'Open',        bg: '#fce4ec', text: '#c62828' },
  in_progress: { label: 'In Progress', bg: '#fff8e1', text: '#f57f17' },
  closed:      { label: 'Closed',      bg: '#e8f5e9', text: '#2e7d32' },
};

// ── Helper: get label for a value ─────────────────────────────────────────────
export const getLabel = (obj, key, lang = 'en') => {
  if (!obj[key]) return key;
  return lang === 'fr' ? (obj[key].labelFr || obj[key].label) : obj[key].label;
};
