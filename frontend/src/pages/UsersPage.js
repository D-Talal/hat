import React, { useState, useEffect } from 'react';
import { usersAPI } from '../api';
import { Card, Btn, Badge, Table, Modal, PageHeader, Input, Select } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'viewer' });
  const [loading, setLoading] = useState(true);
  const { user: me } = useAuth();
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = () => { setLoading(true); usersAPI.list().then(r => setUsers(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing) await usersAPI.update(editing.id, { full_name: form.full_name, role: form.role, is_active: form.is_active });
      else await usersAPI.create(form);
      load(); setModal(false);
    } catch (e) { alert(e.response?.data?.detail || 'Error saving'); }
  };

  const remove = async (id) => {
    if (id === me.id) return alert("You can't delete yourself");
    if (!window.confirm('Delete this user?')) return;
    await usersAPI.delete(id); load();
  };

  const toggleActive = async (user) => {
    await usersAPI.update(user.id, { is_active: !user.is_active }); load();
  };

  const cols = [
    { key: 'full_name', label: 'Name', render: (v, row) => <span style={{ fontWeight: 600 }}>{v || row.email}</span> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: v => <Badge status={v} /> },
    { key: 'totp_enabled', label: '2FA', render: v => <span style={{ color: v ? 'var(--sage)' : 'var(--slate)', fontWeight: 600, fontSize: 12 }}>{v ? '✓ On' : '✗ Off'}</span> },
    { key: 'is_active', label: 'Status', render: (v, row) => (
      <button onClick={() => toggleActive(row)} style={{ background: v ? '#D1FAE5' : '#FEE2E2', color: v ? '#065F46' : '#991B1B', border: 'none', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        {v ? 'Active' : 'Disabled'}
      </button>
    )},
    { key: 'last_login', label: 'Last Login', render: v => v ? new Date(v).toLocaleString() : 'Never' },
  ];

  return (
    <div className="animate-fade">
      <PageHeader title="User Management" sub="Manage access and roles"
        action={<Btn onClick={() => { setEditing(null); setForm({ email: '', full_name: '', password: '', role: 'viewer' }); setModal(true); }}>+ Add User</Btn>}
      />

      {/* Role legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { role: 'admin', desc: 'Full access + user management' },
          { role: 'manager', desc: 'Create & edit, no delete' },
          { role: 'viewer', desc: 'Read-only access' },
          { role: 'accountant', desc: 'Invoices & financials only' },
        ].map(r => (
          <div key={r.role} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
            <Badge status={r.role} />
            <p style={{ fontSize: 12, color: 'var(--slate)', marginTop: 6 }}>{r.desc}</p>
          </div>
        ))}
      </div>

      <Card>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Loading…</div> : (
          <Table cols={cols} rows={users} onEdit={u => { setEditing(u); setForm(u); setModal(true); }}
            onDelete={remove} canEdit canDelete />
        )}
      </Card>

      {modal && (
        <Modal title={editing ? 'Edit User' : 'New User'} onClose={() => setModal(false)}>
          {!editing && <Input label="Email" type="email" value={form.email} onChange={s('email')} required />}
          <Input label="Full Name" value={form.full_name || ''} onChange={s('full_name')} />
          {!editing && <Input label="Password" type="password" value={form.password} onChange={s('password')} required />}
          <Select label="Role" value={form.role || 'viewer'} onChange={s('role')}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
            <option value="accountant">Accountant</option>
          </Select>
          {editing && (
            <Select label="Status" value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </Select>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
