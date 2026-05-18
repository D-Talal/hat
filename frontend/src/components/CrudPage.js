import React, { useState, useEffect, useCallback } from 'react';
import { Card, Btn, Table, Modal, PageHeader } from './UI';
import { useAuth } from '../context/AuthContext';

const STRING_FIELDS = ['unit_number', 'room_number', 'phone', 'id_number', 'amenities',
  'description', 'reported_by', 'contact_name', 'business_name', 'unit_type', 'room_type',
  'bed_type', 'nationality', 'special_requests', 'email', 'address', 'name', 'title',
  'status', 'lease_status', 'priority', 'id_type', 'bed_type', 'first_name', 'last_name',
  'full_name', 'password', 'role'];

const DATE_FIELDS = ['lease_start', 'lease_end', 'due_date', 'paid_date', 'check_in', 'check_out'];

export function CrudPage({ title, sub, api, columns, FormComponent, emptyForm, canCreatePerm = 'create', canEditPerm = 'update', canDeletePerm = 'delete' }) {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { can } = useAuth();

  const canCreate = can(canCreatePerm);
  const canEdit = can(canEditPerm);
  const canDelete = can(canDeletePerm);

  const load = useCallback(() => {
    setLoading(true);
    api.list()
      .then(r => setItems(r.data))
      .catch(e => console.error('Load error:', e))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setError(''); setModal(true); };
  const openEdit = (row) => { setEditing(row); setForm(row); setError(''); setModal(true); };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const cleaned = Object.fromEntries(
        Object.entries(form).map(([k, v]) => {
          // Empty strings become null
          if (v === '' || v === null || v === undefined) return [k, null];
          // Date fields: keep as string if valid, otherwise null
          if (DATE_FIELDS.includes(k)) return [k, v || null];
          // Keep string fields as strings
          if (STRING_FIELDS.includes(k)) return [k, String(v)];
          // Convert numeric strings to numbers
          if (!isNaN(v) && typeof v === 'string' && v.trim() !== '') return [k, Number(v)];
          return [k, v];
        })
      );
      console.log('Sending:', JSON.stringify(cleaned));
      if (editing) await api.update(editing.id, cleaned);
      else await api.create(cleaned);
      load();
      setModal(false);
    } catch (e) {
      console.error('Save error:', e.response?.data || e.message);
      const detail = e.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(d => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(', '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else if (detail) {
        setError(JSON.stringify(detail));
      } else {
        setError(e.message || 'An unexpected error occurred');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(id);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Error deleting record');
    }
  };

  const tableCols = columns.map(c => ({
    ...c,
    render: c.badge ? (v) => { const { Badge } = require('./UI'); return <Badge status={v} />; } : c.render,
  }));

  return (
    <div className="animate-fade">
      <PageHeader title={title} sub={sub}
        action={canCreate ? <Btn onClick={openNew}>+ Add {title.replace(/s$/, '')}</Btn> : null}
      />
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Loading…</div>
        ) : (
          <Table cols={tableCols} rows={items} onEdit={openEdit} onDelete={remove}
            canEdit={canEdit} canDelete={canDelete} />
        )}
      </Card>

      {modal && (
        <Modal title={editing ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`} onClose={() => setModal(false)}>
          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}
          <FormComponent form={form} setForm={setForm} />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
