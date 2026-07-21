import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Modal, EmptyState } from '../components/UI';
import { CONDITION_TYPES as COND_TYPES_SHARED, COMMON_CURRENCIES } from '../data/constants';
import { useLanguage } from '../context/LanguageContext';
import { inputStyle, btnPrimary, btnSecondary } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';
import { parseApiError } from '../data/apiError';
import { exportAPI } from '../api';
import { downloadBlob } from '../data/download';


const STATUS = {
  pending:  { bg: '#fff7ed', text: '#ea580c', label: 'Pending' },
  paid:     { bg: '#f0fdf4', text: '#16a34a', label: 'Paid' },
  overdue:  { bg: '#fef2f2', text: '#dc2626', label: 'Overdue' },
  cancelled:{ bg: '#f5f5f5', text: '#6b7280', label: 'Cancelled' },
};

const COND_TYPES = {
  base_rent:       { label: 'Base Rent',       bg: '#eef0fd', text: '#4361ee' },
  service_charge:  { label: 'Service Charge',  bg: '#f0fdf4', text: '#16a34a' },
  advance_payment: { label: 'Advance Payment', bg: '#fff7ed', text: '#ea580c' },
  flat_rate:       { label: 'Flat Rate',        bg: '#f5f3ff', text: '#7c3aed' },
  sales_based:     { label: 'Sales-Based',      bg: '#eff6ff', text: '#2563eb' },
  markup_fee:      { label: 'Markup Fee',       bg: '#f1f5f9', text: '#475569' },
  rent_free:       { label: 'Rent-Free',        bg: '#fef2f2', text: '#dc2626' },
  abatement:       { label: 'Abatement',        bg: '#fdf4ff', text: '#9333ea' },
};


function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.text }}>{s.label}</span>;
}

function CondTypeBadge({ type }) {
  const c = COND_TYPES[type] || { label: type, bg: '#f4f5f9', text: '#374151' };
  return <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text }}>{c.label}</span>;
}

function InvoiceForm({ onSave, onClose, initial, contracts }) {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [form, setForm] = useState({
    contract_id:     initial?.contract_id     || '',
    condition_type:  initial?.condition_type  || 'base_rent',
    amount:          initial?.amount          || '',
    currency:        initial?.currency        || 'USD',
    due_date:        initial?.due_date        || '',
    period_from:     initial?.period_from     || '',
    period_to:       initial?.period_to       || '',
    description:     initial?.description     || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [saving, setSaving] = useState(false);

const save = async () => {
    if (!form.contract_id || !form.amount) return;
    setSaving(true);
    try {
      if (initial) {
        await API.put(`/commercial/invoices/${initial.id}`, form);
      } else {
        await API.post('/commercial/invoices', form);
      }
      onSave();
    } catch (e) {
      toast.error(parseApiError(e, 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Field label={tc.contract + ' *'}>
        <select style={inputStyle} value={form.contract_id} onChange={set('contract_id')}>
          <option value="">— {tc.select} —</option>
          {contracts.map(c => <option key={c.id} value={c.id}>{c.contract_number} — {c.business_partner?.company_name || ''}</option>)}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={tc.conditionType}>
          <select style={inputStyle} value={form.condition_type} onChange={set('condition_type')}>
            {Object.entries(COND_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label={tc.currency}>
          <select style={inputStyle} value={form.currency} onChange={set('currency')}>
            {COMMON_CURRENCIES.slice(0,10).map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label={tc.amount + ' *'}>
        <input style={inputStyle} type="number" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={tc.validFrom}><input style={inputStyle} type="date" value={form.period_from} onChange={set('period_from')} /></Field>
        <Field label={tc.validTo}><input style={inputStyle} type="date" value={form.period_to} onChange={set('period_to')} /></Field>
      </div>

      <Field label={t.common.dueDate || 'Due Date'}>
        <input style={inputStyle} type="date" value={form.due_date} onChange={set('due_date')} />
      </Field>

      <Field label={t.common.description || 'Description'}>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={set('description')} />
      </Field>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>
          {saving ? '…' : (initial ? t.common.save : t.common.create)}
        </button>
        <button style={btnSecondary} onClick={onClose}>{t.common.cancel}</button>
      </div>
    </div>
  );
}

function PaymentForm({ invoice, bankAccounts, onSave, onClose }) {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [form, setForm] = useState({
    bank_account_id: bankAccounts[0]?.id || '',
    amount: invoice?.amount || '',
    currency: invoice?.currency || 'MAD',
    payment_date: new Date().toISOString().slice(0, 10),
    method: 'virement',
    reference: '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [saving, setSaving] = useState(false);

  const methods = [
    { value: 'virement',    label: tc.methodTransfer },
    { value: 'cheque',      label: tc.methodCheck },
    { value: 'especes',     label: tc.methodCash },
    { value: 'carte',       label: tc.methodCard },
    { value: 'prelevement', label: tc.methodDirectDebit },
  ];

  const save = async () => {
    if (!form.amount || !form.payment_date) return;
    setSaving(true);
    try {
      await API.post('/banking/payments', {
        invoice_id: invoice.id,
        bank_account_id: form.bank_account_id || null,
        amount: parseFloat(form.amount),
        currency: form.currency,
        payment_date: form.payment_date,
        method: form.method,
        reference: form.reference,
      });
      toast.success(tc.recordPayment + ' ✓');
      onSave();
    } catch (e) {
      toast.error(parseApiError(e, 'Erreur lors de l\'enregistrement du paiement'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Field label={tc.invoice}>
        <div style={{ ...inputStyle, background: '#f8f9fc', color: 'var(--slate)' }}>
          INV-{String(invoice.id).padStart(5, '0')} — {invoice.amount} {invoice.currency}
        </div>
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
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? '…' : t.common.save}</button>
        <button style={btnSecondary} onClick={onClose}>{t.common.cancel}</button>
      </div>
    </div>
  );
}

export default function Invoices() {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);  // 'create' | 'edit'
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState('all');  // all | pending | paid | overdue
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState(null);      // invoice being paid
  const [letterLoading, setLetterLoading] = useState(null); // contract_id currently generating a letter

  const load = useCallback(async () => {
    setLoading(true);
    // Load independently: a failure on one must not blank out the other.
    // (Previously a single Promise.all + catch wiped both lists on any error.)
    try {
      const cRes = await API.get('/commercial/contracts');
      setContracts(cRes.data || []);
    } catch (e) {
      console.error('Failed to load contracts', e);
    }
    try {
      const invRes = await API.get('/commercial/invoices');
      setInvoices(invRes.data || []);
    } catch (e) {
      console.error('Failed to load invoices', e);
    }
    try {
      const baRes = await API.get('/banking/accounts');
      setBankAccounts(baRes.data || []);
    } catch (e) {
      console.error('Failed to load bank accounts', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const downloadPdf = async (inv) => {
    try {
      const res = await API.get(`/pdf/invoice/${inv.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `invoice_INV-${String(inv.id).padStart(5,'0')}.pdf`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch { toast.error('Erreur PDF'); }
  };

  const handlePay = async (id) => {
    try { await API.patch(`/commercial/invoices/${id}/pay`); toast.success('Facture marquée payée'); load(); } catch { toast.error('Erreur'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete(`/commercial/invoices/${id}`); toast.success('Facture supprimée'); setConfirm(null); load(); } catch { toast.error('Erreur'); }
  };

  const handleReminderLetter = async (inv) => {
    setLetterLoading(inv.contract_id);
    try {
      const res = await API.get(`/pdf/reminder-letter/${inv.contract_id}`, { responseType: 'blob' });
      const c = contractMap[inv.contract_id];
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `relance_${c?.contract_number || inv.contract_id}.pdf`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(parseApiError(e, tc.noOverdueForContract || 'Erreur'));
    } finally {
      setLetterLoading(null);
    }
  };

  // Stats
  const total      = invoices.length;
  const totalAmt   = invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const paidAmt    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const overdueAmt = invoices.filter(i => i.status === 'pending' && i.due_date && new Date(i.due_date) < new Date()).reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  // Contract name lookup
  const contractMap = Object.fromEntries(contracts.map(c => [c.id, c]));

  // Filter + search
  const filtered = invoices.filter(inv => {
    const matchStatus = filter === 'all' || inv.status === filter ||
      (filter === 'overdue' && inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < new Date());
    const c = contractMap[inv.contract_id];
    const searchStr = `${c?.contract_number || ''} ${c?.business_partner?.company_name || ''} ${inv.description || ''}`.toLowerCase();
    const matchSearch = !search || searchStr.includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const fmtAmt = (n, cur = 'USD') => `${cur} ${parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <PageHeader title={tc.invoicesTitle || 'Invoices'} sub={tc.invoicesSub || 'All billing records'} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button style={btnSecondary} onClick={async () => {
            try { downloadBlob(await exportAPI.invoices(), 'invoices.csv'); }
            catch { toast.error('Échec de l\'export'); }
          }} title="Exporter en CSV">⬇ Exporter CSV</button>
          <button style={btnPrimary} onClick={() => { setSelected(null); setModal('create'); }}>
            + {tc.newInvoice || 'New Invoice'}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: tc.totalInvoices || 'Total invoices', value: total, color: '#4361ee' },
          { label: tc.totalAmount   || 'Total amount',   value: fmtAmt(totalAmt), color: '#374151' },
          { label: tc.totalPaid     || 'Collected',      value: fmtAmt(paidAmt), color: '#16a34a' },
          { label: tc.totalOverdue  || 'Overdue',        value: fmtAmt(overdueAmt), color: '#dc2626' },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--slate)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 260, marginBottom: 0 }}
          placeholder={`🔍 ${t.common.search || 'Search'}…`}
          value={search} onChange={e => setSearch(e.target.value)}
        />
        {['all', 'pending', 'paid', 'overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)',
            background: filter === f ? 'var(--ink)' : 'white',
            color: filter === f ? 'var(--gold)' : 'var(--text)',
            cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: filter === f ? 700 : 400,
          }}>
            {f === 'all' ? t.common.all || 'All' : STATUS[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          invoices.length === 0 ? (
            <EmptyState
              icon="🧾"
              title={tc.noInvoices || 'Aucune facture'}
              description="Les factures apparaissent ici. Créez-en une manuellement ou générez-les depuis un contrat."
              actionLabel={`+ ${tc.newInvoice || 'Nouvelle facture'}`}
              onAction={() => { setSelected(null); setModal('create'); }}
            />
          ) : (
            <EmptyState icon="🔍" title="Aucun résultat" description="Aucune facture avec ce filtre." subtle />
          )
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {['N°', tc.contract || 'Contract', tc.tenant || 'Tenant', tc.conditionType || 'Type', 'Period', tc.amount || 'Amount', 'Due Date', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, idx) => {
                const c = contractMap[inv.contract_id];
                const isOverdue = inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < new Date();
                const displayStatus = isOverdue ? 'overdue' : inv.status;
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--slate)' }}>INV-{String(inv.id).padStart(5,'0')}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{c?.contract_number || `#${inv.contract_id}`}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{c?.business_partner?.company_name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}><CondTypeBadge type={inv.condition_type} /></td>
                    <td style={{ padding: '10px 14px', color: 'var(--slate)', fontSize: 12 }}>
                      {inv.period_from ? `${inv.period_from} → ${inv.period_to || '…'}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{fmtAmt(inv.amount, inv.currency)}</td>
                    <td style={{ padding: '10px 14px', color: isOverdue ? '#dc2626' : 'var(--slate)', fontWeight: isOverdue ? 700 : 400 }}>
                      {inv.due_date || '—'}
                      {isOverdue && <span style={{ fontSize: 10, display: 'block', color: '#dc2626' }}>
                        {Math.ceil((new Date() - new Date(inv.due_date)) / 86400000)}d overdue
                      </span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={displayStatus} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', maxWidth: 260 }}>
                        {/* Download PDF */}
                        <button onClick={() => downloadPdf(inv)} title="Download PDF"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>📥</button>
                        {/* Record payment (encaissement) */}
                        {inv.status !== 'paid' && (
                          <button onClick={() => setPayModal(inv)} title={tc.recordPayment}
                            style={{ background: 'none', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 8px', color: '#2563eb', fontWeight: 700 }}>
                            💳 {tc.recordPayment}
                          </button>
                        )}
                        {/* Reminder letter (only relevant once overdue) */}
                        {isOverdue && (
                          <button onClick={() => handleReminderLetter(inv)} title={tc.reminderLetter}
                            disabled={letterLoading === inv.contract_id}
                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 8px', color: '#dc2626', fontWeight: 700 }}>
                            ✉️ {letterLoading === inv.contract_id ? (tc.generatingLetter || '…') : tc.reminderLetter}
                          </button>
                        )}
                        {/* Mark as paid (quick, no banking record) */}
                        {inv.status !== 'paid' && (
                          <button onClick={() => handlePay(inv.id)} title="Mark as paid"
                            style={{ background: 'none', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 8px', color: '#16a34a', fontWeight: 700 }}>
                            ✓ {tc.markPaid || 'Paid'}
                          </button>
                        )}
                        {/* Edit */}
                        <button onClick={() => { setSelected(inv); setModal('edit'); }} title="Edit"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                        {/* Delete */}
                        <button onClick={() => setConfirm(inv)} title="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create / Edit modal */}
      {modal && (
        <Modal title={modal === 'create' ? (tc.newInvoice || 'New Invoice') : (t.common.edit || 'Edit Invoice')} onClose={() => setModal(null)}>
          <InvoiceForm
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)}
            initial={modal === 'edit' ? selected : null}
            contracts={contracts}
          />
        </Modal>
      )}

      {/* Record payment (encaissement) modal */}
      {payModal && (
        <Modal title={tc.recordPayment} onClose={() => setPayModal(null)}>
          <PaymentForm
            invoice={payModal}
            bankAccounts={bankAccounts}
            onSave={() => { setPayModal(null); load(); }}
            onClose={() => setPayModal(null)}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {confirm && (
        <Modal title={t.common.confirm + ' ' + t.common.delete} onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>
            {t.common.deleteConfirm || 'Delete'} <strong>INV-{String(confirm.id).padStart(5,'0')}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleDelete(confirm.id)}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700 }}>
              {t.common.delete}
            </button>
            <button onClick={() => setConfirm(null)} style={btnSecondary}>{t.common.cancel}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
