import { useState, useEffect, useCallback } from 'react';
import API from '../api';
import { Modal } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';

// ── Styles ─────────────────────────────────────────────────────────────────────
const card = {
  background: '#fff',
  border: '1px solid #e4e6ef',
  borderRadius: 12,
  overflow: 'hidden',
};

const STATUS_COLORS = {
  confirmed:   { bg: '#eef0fd', text: '#4361ee', label: 'Confirmed' },
  checked_in:  { bg: '#f0fdf4', text: '#16a34a', label: 'Checked In' },
  checked_out: { bg: '#f5f5f5', text: '#757575', label: 'Checked Out' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626', label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.confirmed;
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.text }}>{s.label}</span>;
}

function BookingCard({ booking, onCheckin, onCheckout, onCancel, loading }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [paidAmount, setPaidAmount] = useState(booking.paid_amount || 0);
  const balance = booking.total_amount - (paidAmount || 0);
  const nights = booking.nights || 0;

  return (
    <div style={{ border: '1px solid #e4e6ef', borderRadius: 10, padding: 16, marginBottom: 10, background: booking.status === 'checked_in' ? '#fafffe' : 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Room {booking.room_number}</span>
            <span style={{ fontSize: 12, color: '#9ea4be', fontStyle: 'italic' }}>{booking.room_type}</span>
            <StatusBadge status={booking.status} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>👤 {booking.guest_name}</div>
          <div style={{ fontSize: 12, color: '#9ea4be', marginTop: 2 }}>
            {booking.check_in} → {booking.check_out} · {nights} night{nights !== 1 ? 's' : ''} · {booking.adults + (booking.children || 0)} guest{booking.adults + (booking.children || 0) !== 1 ? 's' : ''}
          </div>
          {booking.special_requests && (
            <div style={{ fontSize: 11, color: '#f97316', marginTop: 4 }}>💬 {booking.special_requests}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>
            ${booking.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          {booking.balance > 0 && (
            <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
              Balance: ${booking.balance?.toFixed(2)}
            </div>
          )}
          {booking.balance <= 0 && booking.total_amount > 0 && (
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Paid</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {booking.status === 'confirmed' && (
          <>
            <button
              onClick={() => onCheckin(booking.id)}
              disabled={loading === booking.id}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#4361ee', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}
            >
              {loading === booking.id ? '…' : '✓ Check In'}
            </button>
            <button
              onClick={() => onCancel(booking.id)}
              disabled={loading === booking.id}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}
            >
              ✕ Cancel
            </button>
          </>
        )}
        {booking.status === 'checked_in' && !showCheckout && (
          <button
            onClick={() => setShowCheckout(true)}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}
          >
            ↗ Check Out
          </button>
        )}
        {booking.status === 'checked_in' && showCheckout && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', background: '#f0fdf4', borderRadius: 8, padding: '10px 12px' }}>
            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600, whiteSpace: 'nowrap' }}>Amount paid:</label>
            <input
              type="number" min="0" step="0.01"
              value={paidAmount}
              onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
              style={{ width: 100, padding: '6px 10px', borderRadius: 6, border: '1.5px solid #86efac', fontFamily: 'DM Sans', fontSize: 13 }}
            />
            <span style={{ fontSize: 13, color: balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
              Balance: ${balance.toFixed(2)}
            </span>
            <button
              onClick={() => { onCheckout(booking.id, paidAmount); setShowCheckout(false); }}
              disabled={loading === booking.id}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13 }}
            >
              {loading === booking.id ? '…' : 'Confirm'}
            </button>
            <button onClick={() => setShowCheckout(false)}
              style={{ padding: '6px 10px', borderRadius: 7, border: '1.5px solid #e4e6ef', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Column({ title, icon, count, color, children, emptyMsg }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 16, fontWeight: 600 }}>{title}</span>
        <span style={{ marginLeft: 'auto', background: color, color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{count}</span>
      </div>
      {children}
      {count === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ea4be', fontSize: 13, background: '#fafafa', borderRadius: 10 }}>
          {emptyMsg}
        </div>
      )}
    </div>
  );
}

export default function HotelReception() {
  const { t } = useLanguage();
  const [data, setData]       = useState(null);
  const [hotels, setHotels]   = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [recRes, hotRes] = await Promise.all([
        API.get('/hotel/reception' + (selectedHotel ? `?hotel_id=${selectedHotel}` : '')),
        API.get('/hotel/hotels'),
      ]);
      setData(recRes.data);
      setHotels(hotRes.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load reception');
    } finally { setLoading(false); }
  }, [selectedHotel]);

  useEffect(() => { load(); }, [load]);

  const handleCheckin = async (id) => {
    setActionLoading(id);
    try {
      const res = await API.post(`/hotel/bookings/${id}/checkin`);
      showToast(`✓ ${res.data.message}`);
      load();
    } catch (e) { showToast(`❌ ${e.response?.data?.detail || 'Error'}`); }
    finally { setActionLoading(null); }
  };

  const handleCheckout = async (id, paidAmount) => {
    setActionLoading(id);
    try {
      const res = await API.post(`/hotel/bookings/${id}/checkout`, { paid_amount: paidAmount });
      const bal = res.data.balance;
      showToast(`✓ ${res.data.message}${bal > 0 ? ` — Balance due: $${bal.toFixed(2)}` : ' — Fully paid'}`);
      load();
    } catch (e) { showToast(`❌ ${e.response?.data?.detail || 'Error'}`); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    setActionLoading(id);
    try {
      await API.post(`/hotel/bookings/${id}/cancel`);
      showToast('Booking cancelled');
      load();
    } catch (e) { showToast(`❌ ${e.response?.data?.detail || 'Error'}`); }
    finally { setActionLoading(null); }
  };

  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: '28px 24px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 80, right: 24, background: '#0f1117', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxWidth: 380 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'DM Serif Display, serif' }}>
            🏨 Reception
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ea4be' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={selectedHotel}
            onChange={e => setSelectedHotel(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e4e6ef', fontFamily: 'DM Sans', fontSize: 13, background: 'white' }}
          >
            <option value="">All Hotels</option>
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button onClick={load} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e4e6ef', background: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans' }}>↻</button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ea4be' }}>Loading…</div>
      ) : data && (
        <>
          {/* Overdue alert */}
          {data.overdue?.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>{data.overdue.length} overdue checkout{data.overdue.length > 1 ? 's' : ''}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {data.overdue.map(b => `Room ${b.room_number} (${b.guest_name})`).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* 3 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

            {/* Arrivals */}
            <Column title="Arrivals" icon="✈️" count={data.arrivals?.length || 0} color="#4361ee" emptyMsg="No arrivals today">
              {data.arrivals?.map(b => (
                <BookingCard key={b.id} booking={b} onCheckin={handleCheckin} onCheckout={handleCheckout} onCancel={handleCancel} loading={actionLoading} />
              ))}
            </Column>

            {/* In-house */}
            <Column title="In House" icon="🛏" count={data.in_house?.length || 0} color="#10b981" emptyMsg="No guests currently in-house">
              {data.in_house?.map(b => (
                <BookingCard key={b.id} booking={b} onCheckin={handleCheckin} onCheckout={handleCheckout} onCancel={handleCancel} loading={actionLoading} />
              ))}
            </Column>

            {/* Departures */}
            <Column title="Departures" icon="🧳" count={data.departures?.length || 0} color="#f97316" emptyMsg="No departures today">
              {data.departures?.map(b => (
                <BookingCard key={b.id} booking={b} onCheckin={handleCheckin} onCheckout={handleCheckout} onCancel={handleCancel} loading={actionLoading} />
              ))}
            </Column>

          </div>
        </>
      )}
    </div>
  );
}
