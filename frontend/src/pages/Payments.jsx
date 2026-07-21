import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Modal, EmptyState } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { inputStyle, btnPrimary, btnSecondary } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';
import { parseApiError } from '../data/apiError';

function NewPaymentForm({ pendingInvoices, contractMap, bankAccounts, onSave, onClose }) {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [invoiceId, setInvoiceId] = useState('');
  const selectedInvoice = pendingInvoices.find(i => String(i.id) === String(invoiceId));
  const [form, setForm] = useState({
    bank_account_id: bankAccounts[0]?.id || '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    method: 'virement',
    reference: '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [saving, setSaving] = useState(false);

  const handleInvoiceChange = (id) => {
    setInvoiceId(id);
    const inv = pendingInvoices.find(i => String(i.id) === String(id));
    if (inv) setForm(f => ({ ...f, amount: inv.amount }));
  };

  const methods = [
    { value: 'virement',    label: tc.methodTransfer },
    { value: 'cheque',      label: tc.methodCheck },
    { value: 'especes',     label: tc.methodCash },
    { value: 'carte',       label: tc.methodCard },
    { value: 'prelevement', label: tc.methodDirectDebit },
  ];

  const save = async () => {
    if (!invoiceId || !form.amount || !form.payment_date) return;
    setSaving(true);
    try {
      await API.post('/banking/payments', {
        invoice_id: parseInt(invoiceId, 10),
        bank_account_id: form.bank_account_id || null,
        amount: parseFloat(form.amount),
        currency: selectedInvoice?.currency || 'MAD',
        payment_date: form.payment_date,
        method: form.method,
        reference: form.reference,
      });
      toast.success(tc.recordPayment + ' ✓');
      onSave();
    } catch (e) {
      toast.error(parseApiError(e, 'Erreur'));
    } finally {
      setSaving(false);
    }
  };

  if (pendingInvoices.length === 0) {
    return <p style={{ fontSize: 14, color: 'var(--slate)' }}>{tc.noPendingInvoices}</p>;
  }

  return (
    <div>
      <Field label={tc.selectInvoicePending + ' *'}>
        <select style={inputStyle} value={invoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
          <option value="">— {tc.select} —</option>
          {pendingInvoices.map(i => {
            const c = contractMap[i.contract_id];
            return (
              <option key={i.id} value={i.id}>
                INV-{String(i.id).padStart(5, '0')} — {c?.business_partner?.company_name || c?.contract_number || ''} — {i.amount} {i.currency}
              </option>
            );
          })}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={tc.amount}>
          <input style={inputStyle} type="number" step="0.01" value={form.amount} onChange={set('amount')} />
        </Field>
        <Field label={tc.paymentDate}>
          <input style={inputStyle} type="date" value={form.payment_date} onChange={set('payment_date')} />
        </Field>
      </div>
      <Field label={tc.paymentMethod}>
        <select style={inputStyle} value={form.method} onChange={set('method')}>
          {methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </Field>
      <Field label={tc.bankAccount}>
        <select style={inputStyle} value={form.bank_account_id} onChange={set('bank_account_id')}>
          <option value="">— {tc.select} —</option>
          {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>)}
        </select>
      </Field>
      <Field label={tc.reference}>
        <input style={inputStyle} value={form.reference} onChange={set('reference')} placeholder="N° virement / chèque…" />
      </Field>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving || !invoiceId}>{saving ? '…' : t.common.create}</button>
        <button style={btnSecondary} onClick={onClose}>{t.common.cancel}</button>
      </div>
    </div>
  );
}

export default function Payments() {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const METHOD_LABELS = {
    virement: tc.methodTransfer, cheque: tc.methodCheck, especes: tc.methodCash,
    carte: tc.methodCard, prelevement: tc.methodDirectDebit,
  };
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | reconciled | unreconciled
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPayments((await API.get('/banking/payments')).data || []); } catch (e) { console.error(e); }
    try { setInvoices((await API.get('/commercial/invoices')).data || []); } catch (e) { console.error(e); }
    try { setContracts((await API.get('/commercial/contracts')).data || []); } catch (e) { console.error(e); }
    try { setBankAccounts((await API.get('/banking/accounts')).data || []); } catch (e) { console.error(e); }
    try { setStats((await API.get('/banking/stats')).data || null); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const contractMap = Object.fromEntries(contracts.map(c => [c.id, c]));
  const invoiceMap = Object.fromEntries(invoices.map(i => [i.id, i]));
  const bankMap = Object.fromEntries(bankAccounts.map(b => [b.id, b]));
  const pendingInvoices = invoices.filter(i => i.status === 'pending');

  const filtered = payments.filter(p => {
    if (filter === 'reconciled') return p.is_reconciled;
    if (filter === 'unreconciled') return !p.is_reconciled;
    return true;
  });

  const toggleReconcile = async (p) => {
    try {
      await API.patch(`/banking/payments/${p.id}/reconcile`, { is_reconciled: !p.is_reconciled });
      load();
    } catch (e) { toast.error(parseApiError(e, 'Erreur')); }
  };

  const fmtAmt = (n, cur = 'MAD') => `${cur} ${parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <PageHeader title={tc.paymentsTitle} sub={tc.paymentsSub} />
        <button style={btnPrimary} onClick={() => setModal(true)}>+ {tc.newPayment}</button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: tc.totalReceived, value: fmtAmt(stats?.total_received || 0), color: '#374151' },
          { label: tc.totalReconciled, value: fmtAmt(stats?.total_reconciled || 0), color: '#16a34a' },
          { label: tc.totalUnreconciled, value: fmtAmt(stats?.total_unreconciled || 0), color: '#ea580c' },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {['all', 'unreconciled', 'reconciled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)',
            background: filter === f ? 'var(--ink)' : 'white',
            color: filter === f ? 'var(--gold)' : 'var(--text)',
            cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: filter === f ? 700 : 400,
          }}>
            {f === 'all' ? (t.common.all || 'All') : f === 'reconciled' ? tc.reconciled : tc.unreconciled}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="💳" title={tc.noPayments} description={tc.paymentsSub} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {[tc.paymentDate, tc.invoice, tc.tenant, tc.amount, tc.paymentMethod, tc.bankAccount, tc.reference, tc.reconciled, ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const inv = invoiceMap[p.invoice_id];
                const c = inv ? contractMap[inv.contract_id] : null;
                const ba = p.bank_account_id ? bankMap[p.bank_account_id] : null;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px' }}>{p.payment_date}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>INV-{String(p.invoice_id).padStart(5, '0')}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{c?.business_partner?.company_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{fmtAmt(p.amount, p.currency)}</td>
                    <td style={{ padding: '10px 14px' }}>{METHOD_LABELS[p.method] || p.method}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{ba?.name || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{p.reference || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.is_reconciled ? '#f0fdf4' : '#fff7ed', color: p.is_reconciled ? '#16a34a' : '#ea580c' }}>
                        {p.is_reconciled ? tc.reconciled : tc.unreconciled}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => toggleReconcile(p)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 8px', fontWeight: 700 }}>
                        {p.is_reconciled ? tc.undoReconcile : tc.markReconciled}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {modal && (
        <Modal title={tc.newPayment} onClose={() => setModal(false)}>
          <NewPaymentForm
            pendingInvoices={pendingInvoices}
            contractMap={contractMap}
            bankAccounts={bankAccounts}
            onSave={() => { setModal(false); load(); }}
            onClose={() => setModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
