import { useState, useEffect } from 'react';
import API from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/UI';

function StatusBadge({ validated, active }) {
  if (!active)    return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626' }}>REJECTED</span>;
  if (!validated) return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fff7ed', color: '#ea580c' }}>PENDING</span>;
  return              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#16a34a' }}>ACTIVE</span>;
}

export default function SuperAdmin() {
  const toast = useToast();
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get('/super-admin/orgs');
      setOrgs(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Access denied');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const validate = async (id) => {
    setActionLoading(id + '-validate');
    try {
      await API.post(`/super-admin/orgs/${id}/validate`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Échec');
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id, name) => {
    if (!window.confirm(`Reject "${name}"? This will deactivate the account.`)) return;
    setActionLoading(id + '-reject');
    try {
      await API.post(`/super-admin/orgs/${id}/reject`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Échec');
    } finally {
      setActionLoading(null);
    }
  };

  const pending = orgs.filter(o => !o.is_validated && o.is_active);
  const active  = orgs.filter(o => o.is_validated && o.is_active);
  const other   = orgs.filter(o => !o.is_active);

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ color: '#dc2626', fontWeight: 600 }}>{error}</div>
    </div>
  );

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader title="Super Admin" sub="Manage organization registrations" />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Pending', count: pending.length, color: '#fff7ed', text: '#ea580c' },
          { label: 'Active',  count: active.length,  color: '#f0fdf4', text: '#16a34a' },
          { label: 'Total',   count: orgs.length,    color: '#eef0fd', text: '#4361ee' },
        ].map(({ label, count, color, text }) => (
          <div key={label} style={{ flex: 1, background: color, borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: text }}>{count}</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9ea4be', padding: 40 }}>Loading…</div>
      ) : (
        <>
          {/* Pending section */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#ea580c', letterSpacing: '.06em', marginBottom: 12 }}>
                ⏳ Awaiting approval ({pending.length})
              </div>
              {pending.map(org => <OrgRow key={org.id} org={org} onValidate={validate} onReject={reject} actionLoading={actionLoading} />)}
            </div>
          )}

          {/* Active section */}
          {active.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '.06em', marginBottom: 12 }}>
                ✅ Active accounts ({active.length})
              </div>
              {active.map(org => <OrgRow key={org.id} org={org} onValidate={validate} onReject={reject} actionLoading={actionLoading} />)}
            </div>
          )}

          {/* Rejected */}
          {other.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#9ea4be', letterSpacing: '.06em', marginBottom: 12 }}>
                Rejected ({other.length})
              </div>
              {other.map(org => <OrgRow key={org.id} org={org} onValidate={validate} onReject={reject} actionLoading={actionLoading} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrgRow({ org, onValidate, onReject, actionLoading }) {
  const registeredDate = org.created_at ? new Date(org.created_at).toLocaleDateString(undefined) : '—';
  return (
    <div style={{
      background: 'var(--color-background-secondary, #f8f9fc)',
      border: '1px solid var(--border, #e4e6ef)',
      borderRadius: 10, padding: '14px 18px', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{org.name}</span>
          <StatusBadge validated={org.is_validated} active={org.is_active} />
          <span style={{ fontSize: 11, color: '#9ea4be', fontFamily: 'monospace' }}>{org.plan}</span>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 16 }}>
          <span>📧 {org.contact_email || org.admin_email || '—'}</span>
          <span>👤 {org.admin_name || '—'}</span>
          <span>👥 {org.user_count} user{org.user_count !== 1 ? 's' : ''}</span>
          <span>📅 {registeredDate}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!org.is_validated && org.is_active && (
          <button
            onClick={() => onValidate(org.id)}
            disabled={actionLoading === org.id + '-validate'}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#4361ee', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {actionLoading === org.id + '-validate' ? '…' : '✅ Approve'}
          </button>
        )}
        {org.is_active && (
          <button
            onClick={() => onReject(org.id, org.name)}
            disabled={actionLoading === org.id + '-reject'}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {actionLoading === org.id + '-reject' ? '…' : 'Reject'}
          </button>
        )}
        {!org.is_active && (
          <button
            onClick={() => onValidate(org.id)}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #86efac', background: 'transparent', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Re-activate
          </button>
        )}
      </div>
    </div>
  );
}
