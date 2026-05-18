import React, { useEffect, useState } from 'react';
import { CrudPage } from '../components/CrudPage';
import { Input, Select, Textarea } from '../components/UI';
import { retail } from '../api';
import { COUNTRIES, CONTINENTS } from '../data/countries';
import { useLanguage } from '../context/LanguageContext';

// ── Properties ──────────────────────────────────────────────
const PropForm = ({ form, setForm }) => {
  const { t } = useLanguage();
  const r = t.retail;
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const handleCountry = e => {
    const country = e.target.value;
    const found = COUNTRIES.find(c => c.name === country);
    setForm(f => ({ ...f, country, continent: found?.continent || f.continent }));
  };
  return <>
    <Input label={r.propertyName} value={form.name || ''} onChange={s('name')} required />
    <Input label={r.address} value={form.address || ''} onChange={s('address')} />
    <Input label={r.city} value={form.city || ''} onChange={s('city')} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Select label={r.country} value={form.country || ''} onChange={handleCountry}>
        <option value="">{r.selectCountry}</option>
        {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
      </Select>
      <Select label={r.continent} value={form.continent || ''} onChange={s('continent')}>
        <option value="">{r.selectContinent}</option>
        {CONTINENTS.map(c => <option key={c} value={c}>{c}</option>)}
      </Select>
    </div>
    <Input label={r.totalArea} type="number" value={form.total_area_sqft || ''} onChange={s('total_area_sqft')} />
    <Input label={r.annualRevenue} type="number" value={form.annual_revenue || ''} onChange={s('annual_revenue')} />
  </>;
};

export function RetailProperties() {
  const { t } = useLanguage();
  const r = t.retail;
  return <CrudPage title={r.propertiesTitle} sub={r.propertiesSub} api={retail.properties}
    emptyForm={{ name: '', address: '', city: '', country: '', continent: '', total_area_sqft: '', annual_revenue: '' }}
    columns={[
      { key: 'name', label: r.propertyName },
      { key: 'city', label: r.city },
      { key: 'country', label: r.country },
      { key: 'total_area_sqft', label: r.area, render: v => v ? `${Number(v).toLocaleString()} sqft` : '—' },
      { key: 'annual_revenue', label: r.annualRevenue, render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
    ]} FormComponent={PropForm} />;
}

// ── Units ────────────────────────────────────────────────────
const UnitForm = ({ form, setForm }) => {
  const { t } = useLanguage();
  const r = t.retail;
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [properties, setProperties] = useState([]);
  useEffect(() => { retail.properties.list().then(res => setProperties(res.data)).catch(() => {}); }, []);
  return <>
    <Select label={r.property} value={form.property_id || ''} onChange={s('property_id')} required>
      <option value="">{r.selectProperty}</option>
      {properties.map(p => <option key={p.id} value={p.id}>{p.name} {p.city ? `(${p.city})` : ''}</option>)}
    </Select>
    <Input label={r.unitNumber} value={form.unit_number || ''} onChange={s('unit_number')} required />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label={r.floor} type="number" value={form.floor || ''} onChange={s('floor')} />
      <Input label={r.areaSqft} type="number" value={form.area_sqft || ''} onChange={s('area_sqft')} />
    </div>
    <Input label={r.unitType} value={form.unit_type || ''} onChange={s('unit_type')} />
    <Input label={r.monthlyRent} type="number" value={form.monthly_rent || ''} onChange={s('monthly_rent')} />
    <Select label={r.status} value={form.status || 'available'} onChange={s('status')}>
      <option value="available">{r.available}</option>
      <option value="occupied">{r.occupied}</option>
      <option value="maintenance">{r.maintenanceStatus}</option>
    </Select>
  </>;
};

export function RetailUnits() {
  const { t } = useLanguage();
  const r = t.retail;
  return <CrudPage title={r.unitsTitle} sub={r.unitsSub} api={retail.units}
    emptyForm={{ property_id: '', unit_number: '', floor: '', area_sqft: '', unit_type: '', status: 'available', monthly_rent: '' }}
    columns={[
      { key: 'unit_number', label: r.unitNumber },
      { key: 'unit_type', label: r.unitType },
      { key: 'floor', label: r.floor },
      { key: 'area_sqft', label: r.area, render: v => v ? `${v} sqft` : '—' },
      { key: 'monthly_rent', label: r.rent, render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'status', label: r.status, badge: true },
    ]} FormComponent={UnitForm} />;
}

// ── Tenants ──────────────────────────────────────────────────
const TenantForm = ({ form, setForm }) => {
  const { t } = useLanguage();
  const r = t.retail;
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [units, setUnits] = useState([]);
  useEffect(() => { retail.units.list().then(res => setUnits(res.data)).catch(() => {}); }, []);
  return <>
    <Select label={r.unitNumber} value={form.unit_id || ''} onChange={s('unit_id')} required>
      <option value="">{r.selectUnit}</option>
      {units.map(u => <option key={u.id} value={u.id}>#{u.unit_number} — {u.unit_type || 'Unit'} (${u.monthly_rent || 0}/mo)</option>)}
    </Select>
    <Input label={r.businessName} value={form.business_name || ''} onChange={s('business_name')} required />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label={r.contactName} value={form.contact_name || ''} onChange={s('contact_name')} />
      <Input label={r.phone} value={form.phone || ''} onChange={s('phone')} />
    </div>
    <Input label={r.email} type="email" value={form.email || ''} onChange={s('email')} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label={r.leaseStart} type="date" value={form.lease_start || ''} onChange={s('lease_start')} />
      <Input label={r.leaseEnd} type="date" value={form.lease_end || ''} onChange={s('lease_end')} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label={r.monthlyRent} type="number" value={form.monthly_rent || ''} onChange={s('monthly_rent')} />
      <Input label={r.securityDeposit} type="number" value={form.security_deposit || ''} onChange={s('security_deposit')} />
    </div>
    <Select label={r.leaseStatus} value={form.lease_status || 'active'} onChange={s('lease_status')}>
      <option value="active">{r.active}</option>
      <option value="pending">{r.pending}</option>
      <option value="expired">{r.expired}</option>
      <option value="terminated">{r.terminated}</option>
    </Select>
  </>;
};

export function RetailTenants() {
  const { t } = useLanguage();
  const r = t.retail;
  return <CrudPage title={r.tenantsTitle} sub={r.tenantsSub} api={retail.tenants}
    emptyForm={{ unit_id: '', business_name: '', contact_name: '', email: '', phone: '', lease_start: '', lease_end: '', lease_status: 'active', monthly_rent: '', security_deposit: '' }}
    columns={[
      { key: 'business_name', label: r.businessName },
      { key: 'contact_name', label: r.contactName },
      { key: 'email', label: r.email },
      { key: 'monthly_rent', label: r.rent, render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'lease_end', label: r.leaseEnd },
      { key: 'lease_status', label: r.leaseStatus, badge: true },
    ]} FormComponent={TenantForm} />;
}

// ── Invoices ─────────────────────────────────────────────────
const InvoiceForm = ({ form, setForm }) => {
  const { t } = useLanguage();
  const r = t.retail;
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [tenants, setTenants] = useState([]);
  useEffect(() => { retail.tenants.list().then(res => setTenants(res.data)).catch(() => {}); }, []);
  return <>
    <Select label={r.tenantsTitle} value={form.tenant_id || ''} onChange={s('tenant_id')} required>
      <option value="">{r.selectTenant}</option>
      {tenants.map(t => <option key={t.id} value={t.id}>{t.business_name} ({t.contact_name || r.noContact})</option>)}
    </Select>
    <Input label={r.amount} type="number" value={form.amount || ''} onChange={s('amount')} required />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label={r.dueDate} type="date" value={form.due_date || ''} onChange={s('due_date')} />
      <Input label={r.paidDate} type="date" value={form.paid_date || ''} onChange={s('paid_date')} />
    </div>
    <Select label={r.status} value={form.status || 'pending'} onChange={s('status')}>
      <option value="pending">{r.pending}</option>
      <option value="paid">{r.paid}</option>
      <option value="overdue">{r.overdue}</option>
    </Select>
    <Textarea label={r.description} value={form.description || ''} onChange={s('description')} />
  </>;
};

export function RetailInvoices() {
  const { t } = useLanguage();
  const r = t.retail;
  return <CrudPage title={r.invoicesTitle} sub={r.invoicesSub} api={retail.invoices}
    canCreatePerm="create_invoice" canEditPerm="update_invoice" canDeletePerm="delete_invoice"
    emptyForm={{ tenant_id: '', amount: '', due_date: '', paid_date: '', status: 'pending', description: '' }}
    columns={[
      { key: 'tenant_id', label: 'Tenant ID' },
      { key: 'amount', label: r.amount, render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'due_date', label: r.dueDate },
      { key: 'paid_date', label: r.paid, render: v => v || '—' },
      { key: 'status', label: r.status, badge: true },
    ]} FormComponent={InvoiceForm} />;
}

// ── Maintenance ──────────────────────────────────────────────
const MaintForm = ({ form, setForm }) => {
  const { t } = useLanguage();
  const r = t.retail;
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [units, setUnits] = useState([]);
  useEffect(() => { retail.units.list().then(res => setUnits(res.data)).catch(() => {}); }, []);
  return <>
    <Select label={r.unitNumber} value={form.unit_id || ''} onChange={s('unit_id')} required>
      <option value="">{r.selectUnit}</option>
      {units.map(u => <option key={u.id} value={u.id}>#{u.unit_number} — {u.unit_type || 'Unit'}</option>)}
    </Select>
    <Input label={r.title} value={form.title || ''} onChange={s('title')} required />
    <Textarea label={r.description} value={form.description || ''} onChange={s('description')} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Select label={r.priority} value={form.priority || 'medium'} onChange={s('priority')}>
        <option value="low">{r.priorityLow}</option>
        <option value="medium">{r.priorityMedium}</option>
        <option value="high">{r.priorityHigh}</option>
        <option value="urgent">{r.priorityUrgent}</option>
      </Select>
      <Select label={r.status} value={form.status || 'open'} onChange={s('status')}>
        <option value="open">{r.open}</option>
        <option value="in_progress">{r.inProgress}</option>
        <option value="closed">{r.closed}</option>
      </Select>
    </div>
    <Input label={r.reportedBy} value={form.reported_by || ''} onChange={s('reported_by')} />
  </>;
};

export function RetailMaintenance() {
  const { t } = useLanguage();
  const r = t.retail;
  return <CrudPage title={r.maintenanceTitle} sub={r.maintenanceSub} api={retail.maintenance}
    emptyForm={{ unit_id: '', title: '', description: '', priority: 'medium', status: 'open', reported_by: '' }}
    columns={[
      { key: 'title', label: r.title },
      { key: 'priority', label: r.priority },
      { key: 'reported_by', label: r.reportedBy },
      { key: 'status', label: r.status, badge: true },
      { key: 'created_at', label: r.date, render: v => v ? new Date(v).toLocaleDateString() : '—' },
    ]} FormComponent={MaintForm} />;
}
