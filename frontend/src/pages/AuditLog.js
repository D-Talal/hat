import React, { useState, useEffect } from 'react';
import { usersAPI } from '../api';
import { Card, PageHeader, Badge } from '../components/UI';

const actionColors = {
  CREATE: { bg: '#D1FAE5', color: '#065F46' },
  UPDATE: { bg: '#DBEAFE', color: '#1E40AF' },
  DELETE: { bg: '#FEE2E2', color: '#991B1B' },
  LOGIN: { bg: '#EDE9FE', color: '#5B21B6' },
  LOGIN_2FA: { bg: '#EDE9FE', color: '#5B21B6' },
  CREATE_USER: { bg: '#FEF3C7', color: '#92400E' },
  UPDATE_USER: { bg: '#DBEAFE', color: '#1E40AF' },
  CHANGE_PASSWORD: { bg: '#FEF3C7', color: '#92400E' },
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    usersAPI.auditLog().then(r => setLogs(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !filter || l.action.includes(filter.toUpperCase()) || l.user_email.includes(filter) || (l.resource || '').includes(filter)
  );

  return (
    <div className="animate-fade">
      <PageHeader title="Audit Log" sub="Complete record of all user actions" />

      <div style={{ marginBottom: 20 }}>
        <input
          style={{ padding: '10px 16px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'DM Sans', fontSize: 14, background: 'white', width: 300, outline: 'none' }}
          placeholder="Filter by action, user, or resource…"
          value={filter} onChange={e => setFilter(e.target.value)}
        />
      </div>

      <Card>
        {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>Loading…</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Time', 'User', 'Action', 'Resource', 'ID', 'Details', 'IP'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--slate)' }}>No logs found</td></tr>
                ) : filtered.map(log => {
                  const ac = actionColors[log.action] || { bg: '#F3F4F6', color: '#374151' };
                  return (
                    <tr key={log.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', color: 'var(--slate)', fontSize: 12 }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{log.user_email}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ background: ac.bg, color: ac.color, padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{log.action}</span>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{log.resource}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)' }}>{log.resource_id || '—'}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '—'}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', color: 'var(--slate)', fontSize: 12 }}>{log.ip_address || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
