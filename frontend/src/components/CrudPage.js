import React, { useState, useEffect, useCallback } from 'react';
import { Card, Btn, Table, Modal, PageHeader } from './UI';
import { useAuth } from '../context/AuthContext';

export function CrudPage({ title, sub, api, columns, FormComponent, emptyForm, canCreatePerm = 'create', canEditPerm = 'update', canDeletePerm = 'delete' }) {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { can } = useAuth();

  const canCreate = can(canCreatePerm);
  const canEdit = can(canEditPerm);
  const canDelete = can(canDeletePerm);

  const load = useCallback(() => {
    setLoading(true);
    api.list().then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (row) => { setEditing(row); setForm(row); setModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) await api.update(editing.id, form);
      else await api.create(form);
      load(); setModal(false);
    } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await api.delete(id).catch(() => {});
    load();
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
          <FormComponent form={form} setForm={setForm} />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
