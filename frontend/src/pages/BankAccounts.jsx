import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Modal, EmptyState } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { inputStyle, btnPrimary, btnSecondary } from '../data/styles';
import { Field } from '../components/shared/FormHelpers';
import { parseApiError } from '../data/apiError';
import { COMMON_CURRENCIES } from '../data/constants';

function AccountForm({ onSave, onClose, initial }) {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [form, setForm] = useState({
    name: initial?.name || '',
    bank_name: initial?.bank_name || '',
    account_holder: initial?.account_holder || '',
    iban: initial?.iban || '',
    bic_swift: initial?.bic_swift || '',
    currency: initial?.currency || 'MAD',
    is_active: initial?.is_active ?? true,
    notes: initial?.notes || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (initial) await API.put(`/banking/accounts/${initial.id}`, form);
      else await API.post('/banking/accounts', form);
      onSave();
    } catch (e) {
      toast.error(parseApiError(e, 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Field label={tc.accountName + ' *'}>
        <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Compte principal MAD" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={tc.bankName}>
          <input style={inputStyle} value={form.bank_name} onChange={set('bank_name')} placeholder="Attijariwafa Bank" />
        </Field>
        <Field label={tc.currency}>
          <select style={inputStyle} value={form.currency} onChange={set('currency')}>
            {COMMON_CURRENCIES.slice(0, 15).map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label={tc.accountHolder}>
        <input style={inputStyle} value={form.account_holder} onChange={set('account_holder')} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={tc.iban}>
          <input style={inputStyle} value={form.iban} onChange={set('iban')} placeholder="MA64 …" />
        </Field>
        <Field label={tc.bicSwift}>
          <input style={inputStyle} value={form.bic_swift} onChange={set('bic_swift')} />
        </Field>
      </div>
      <Field label={t.common.description || 'Notes'}>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={set('notes')} />
      </Field>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? '…' : (initial ? t.common.save : t.common.create)}</button>
        <button style={btnSecondary} onClick={onClose}>{t.common.cancel}</button>
      </div>
    </div>
  );
}

export default function BankAccounts() {
  const toast = useToast();
  const { t } = useLanguage();
  const tc = t.commercial;
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/banking/accounts');
      setAccounts(res.data || []);
    } catch (e) {
      console.error('Failed to load bank accounts', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await API.delete(`/banking/accounts/${id}`);
      toast.success('Compte supprimé');
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(parseApiError(e, 'Erreur'));
    }
  };

  return (
    <div style={{ padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <PageHeader title={tc.bankAccountsTitle} sub={tc.bankAccountsSub} />
        <button style={btnPrimary} onClick={() => { setSelected(null); setModal('create'); }}>
          + {tc.newBankAccount}
        </button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading…</div>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon="🏦"
            title={tc.noBankAccounts}
            description={tc.bankAccountsSub}
            actionLabel={`+ ${tc.newBankAccount}`}
            onAction={() => { setSelected(null); setModal('create'); }}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {[tc.accountName, tc.bankName, tc.iban, tc.currency, ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--slate)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, idx) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{a.name}{!a.is_active && <span style={{ marginLeft: 6, fontSize: 10, color: '#9ea4be' }}>({t.common.active === 'Active' ? 'inactive' : 'inactif'})</span>}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--slate)' }}>{a.bank_name || '—'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{a.iban || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{a.currency}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setSelected(a); setModal('edit'); }} title="Edit"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>✏️</button>
                      <button onClick={() => setConfirm(a)} title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#dc2626', padding: '2px 4px' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal && (
        <Modal title={modal === 'create' ? tc.newBankAccount : t.common.edit} onClose={() => setModal(null)}>
          <AccountForm
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)}
            initial={modal === 'edit' ? selected : null}
          />
        </Modal>
      )}

      {confirm && (
        <Modal title={t.common.confirm + ' ' + t.common.delete} onClose={() => setConfirm(null)}>
          <p style={{ fontSize: 14, marginBottom: 20 }}>
            {t.common.deleteConfirm} <strong>{confirm.name}</strong>?
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
