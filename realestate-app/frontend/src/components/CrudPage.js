import React, { useState, useEffect, useCallback } from 'react';
import { Card, Btn, Badge, Table, Modal, PageHeader } from '../components/UI';

export function CrudPage({ title, sub, api, columns, FormComponent, emptyForm }) {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (e) { alert('Error saving: ' + (e.response?.data?.detail || e.message)); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await api.delete(id).catch(() => {});
    load();
  };

  const tableCols = columns.map(c => ({
    ...c,
    render: c.badge ? (v) => <Badge status={v} /> : c.render,
  }));

  return (
    <div className="animate-fade">
      <PageHeader title={title} sub={sub}
        action={<Btn onClick={openNew}>+ Add {title.replace(/s$/, '')}</Btn>}
      />
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Loading…</div>
        ) : (
          <Table cols={tableCols} rows={items} onEdit={openEdit} onDelete={remove} />
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
