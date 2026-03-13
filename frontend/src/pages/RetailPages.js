import React from 'react';
import { CrudPage } from '../components/CrudPage';
import { Input, Select, Textarea } from '../components/UI';
import { retail } from '../api';

// Properties
const PropForm = ({ form, setForm }) => {
  const s = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <Input label="Property Name" value={form.name || ''} onChange={s('name')} required />
    <Input label="Address" value={form.address || ''} onChange={s('address')} />
    <Input label="Total Area (sqft)" type="number" value={form.total_area_sqft || ''} onChange={s('total_area_sqft')} />
  </>;
};
export function RetailProperties() {
  return <CrudPage title="Properties" sub="Manage your commercial property portfolio" api={retail.properties}
    emptyForm={{ name: '', address: '', total_area_sqft: '' }}
    columns={[
      { key: 'name', label: 'Property Name' },
      { key: 'address', label: 'Address' },
      { key: 'total_area_sqft', label: 'Area (sqft)', render: v => v ? `${Number(v).toLocaleString()} sqft` : '—' },
      { key: 'created_at', label: 'Added', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    ]}
    FormComponent={PropForm}
  />;
}

// Units
const UnitForm = ({ form, setForm }) => {
  const s = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <Input label="Property ID" type="number" value={form.property_id || ''} onChange={s('property_id')} required />
    <Input label="Unit Number" value={form.unit_number || ''} onChange={s('unit_number')} required />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Floor" type="number" value={form.floor || ''} onChange={s('floor')} />
      <Input label="Area (sqft)" type="number" value={form.area_sqft || ''} onChange={s('area_sqft')} />
    </div>
    <Input label="Unit Type (e.g. Retail, Food)" value={form.unit_type || ''} onChange={s('unit_type')} />
    <Input label="Monthly Rent ($)" type="number" value={form.monthly_rent || ''} onChange={s('monthly_rent')} />
    <Select label="Status" value={form.status || 'available'} onChange={s('status')}>
      <option value="available">Available</option>
      <option value="occupied">Occupied</option>
      <option value="maintenance">Maintenance</option>
    </Select>
  </>;
};
export function RetailUnits() {
  return <CrudPage title="Units" sub="Track all rentable spaces and their status" api={retail.units}
    emptyForm={{ property_id: '', unit_number: '', floor: '', area_sqft: '', unit_type: '', status: 'available', monthly_rent: '' }}
    columns={[
      { key: 'unit_number', label: 'Unit' },
      { key: 'unit_type', label: 'Type' },
      { key: 'floor', label: 'Floor' },
      { key: 'area_sqft', label: 'Area', render: v => v ? `${v} sqft` : '—' },
      { key: 'monthly_rent', label: 'Rent/mo', render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'status', label: 'Status', badge: true },
    ]}
    FormComponent={UnitForm}
  />;
}

// Tenants
const TenantForm = ({ form, setForm }) => {
  const s = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <Input label="Unit ID" type="number" value={form.unit_id || ''} onChange={s('unit_id')} required />
    <Input label="Business Name" value={form.business_name || ''} onChange={s('business_name')} required />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Contact Name" value={form.contact_name || ''} onChange={s('contact_name')} />
      <Input label="Phone" value={form.phone || ''} onChange={s('phone')} />
    </div>
    <Input label="Email" type="email" value={form.email || ''} onChange={s('email')} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Lease Start" type="date" value={form.lease_start || ''} onChange={s('lease_start')} />
      <Input label="Lease End" type="date" value={form.lease_end || ''} onChange={s('lease_end')} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Monthly Rent ($)" type="number" value={form.monthly_rent || ''} onChange={s('monthly_rent')} />
      <Input label="Security Deposit ($)" type="number" value={form.security_deposit || ''} onChange={s('security_deposit')} />
    </div>
    <Select label="Lease Status" value={form.lease_status || 'active'} onChange={s('lease_status')}>
      <option value="active">Active</option>
      <option value="pending">Pending</option>
      <option value="expired">Expired</option>
      <option value="terminated">Terminated</option>
    </Select>
  </>;
};
export function RetailTenants() {
  return <CrudPage title="Tenants" sub="Manage tenant leases and contact information" api={retail.tenants}
    emptyForm={{ unit_id: '', business_name: '', contact_name: '', email: '', phone: '', lease_start: '', lease_end: '', lease_status: 'active', monthly_rent: '', security_deposit: '' }}
    columns={[
      { key: 'business_name', label: 'Business' },
      { key: 'contact_name', label: 'Contact' },
      { key: 'email', label: 'Email' },
      { key: 'monthly_rent', label: 'Rent/mo', render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'lease_end', label: 'Lease End' },
      { key: 'lease_status', label: 'Status', badge: true },
    ]}
    FormComponent={TenantForm}
  />;
}

// Invoices
const InvoiceForm = ({ form, setForm }) => {
  const s = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <Input label="Tenant ID" type="number" value={form.tenant_id || ''} onChange={s('tenant_id')} required />
    <Input label="Amount ($)" type="number" value={form.amount || ''} onChange={s('amount')} required />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Due Date" type="date" value={form.due_date || ''} onChange={s('due_date')} />
      <Input label="Paid Date" type="date" value={form.paid_date || ''} onChange={s('paid_date')} />
    </div>
    <Select label="Status" value={form.status || 'pending'} onChange={s('status')}>
      <option value="pending">Pending</option>
      <option value="paid">Paid</option>
      <option value="overdue">Overdue</option>
    </Select>
    <Textarea label="Description" value={form.description || ''} onChange={s('description')} />
  </>;
};
export function RetailInvoices() {
  return <CrudPage title="Invoices" sub="Track rent payments and outstanding balances" api={retail.invoices}
    emptyForm={{ tenant_id: '', amount: '', due_date: '', paid_date: '', status: 'pending', description: '' }}
    columns={[
      { key: 'tenant_id', label: 'Tenant ID' },
      { key: 'amount', label: 'Amount', render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'paid_date', label: 'Paid Date', render: v => v || '—' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'description', label: 'Description', render: v => v ? v.substring(0, 30) + (v.length > 30 ? '…' : '') : '—' },
    ]}
    FormComponent={InvoiceForm}
  />;
}

// Maintenance
const MaintForm = ({ form, setForm }) => {
  const s = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <Input label="Unit ID" type="number" value={form.unit_id || ''} onChange={s('unit_id')} required />
    <Input label="Title" value={form.title || ''} onChange={s('title')} required />
    <Textarea label="Description" value={form.description || ''} onChange={s('description')} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Select label="Priority" value={form.priority || 'medium'} onChange={s('priority')}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </Select>
      <Select label="Status" value={form.status || 'open'} onChange={s('status')}>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="closed">Closed</option>
      </Select>
    </div>
    <Input label="Reported By" value={form.reported_by || ''} onChange={s('reported_by')} />
  </>;
};
export function RetailMaintenance() {
  return <CrudPage title="Maintenance" sub="Track and resolve maintenance requests" api={retail.maintenance}
    emptyForm={{ unit_id: '', title: '', description: '', priority: 'medium', status: 'open', reported_by: '' }}
    columns={[
      { key: 'title', label: 'Title' },
      { key: 'priority', label: 'Priority' },
      { key: 'reported_by', label: 'Reported By' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'created_at', label: 'Date', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    ]}
    FormComponent={MaintForm}
  />;
}
