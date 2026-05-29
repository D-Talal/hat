import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../api';
import { useLanguage } from '../context/LanguageContext';

// ── Constants ──────────────────────────────────────────────────────────────────
const CELL_W  = 36;  // px per day
const ROW_H   = 44;  // px per room row
const LABEL_W = 140; // px for room label column

const STATUS_COLORS = {
  confirmed:  { bg: '#4361ee', text: '#fff', border: '#3451d1' },
  checked_in: { bg: '#10b981', text: '#fff', border: '#059669' },
};

const ROOM_TYPE_COLORS = {
  standard:  '#e8f0fe',
  deluxe:    '#fce8ff',
  suite:     '#fff8e1',
  single:    '#e8f5e9',
  double:    '#e3f2fd',
  twin:      '#f3e5f5',
  king:      '#fff3e0',
  queen:     '#fce4ec',
};

const getRoomColor = (type) =>
  ROOM_TYPE_COLORS[(type || '').toLowerCase()] || '#f5f7ff';

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function BookingTooltip({ booking, x, y }) {
  if (!booking) return null;
  const nights = daysBetween(booking.check_in, booking.check_out);
  return (
    <div style={{
      position: 'fixed', left: x + 12, top: y - 10, zIndex: 1000,
      background: '#0f1117', color: '#fff', borderRadius: 10, padding: '10px 14px',
      fontSize: 12, lineHeight: 1.6, pointerEvents: 'none', maxWidth: 220,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>👤 {booking.guest_name}</div>
      <div>📅 {booking.check_in} → {booking.check_out}</div>
      <div>🌙 {nights} night{nights !== 1 ? 's' : ''}</div>
      <div>👥 {booking.adults + (booking.children || 0)} guest{booking.adults + booking.children !== 1 ? 's' : ''}</div>
      {booking.total_amount > 0 && <div>💰 ${booking.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>}
      <div style={{ marginTop: 6, padding: '2px 8px', borderRadius: 4, display: 'inline-block', fontSize: 10, fontWeight: 700, background: booking.status === 'checked_in' ? '#10b981' : '#4361ee' }}>
        {booking.status === 'checked_in' ? 'CHECKED IN' : 'CONFIRMED'}
      </div>
    </div>
  );
}

// ── Main Calendar ─────────────────────────────────────────────────────────────
export default function HotelCalendar() {
  const { t } = useLanguage();
  const th = t.hotel;

  const [hotels, setHotels]         = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('');
  const [calData, setCalData]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [startDate, setStartDate]   = useState(() => toISO(new Date()));
  const [days, setDays]             = useState(14);
  const [tooltip, setTooltip]       = useState(null); // { booking, x, y }
  const [filter, setFilter]         = useState('all'); // all | available | occupied
  const scrollRef = useRef(null);

  const endDate = toISO(addDays(new Date(startDate), days));

  // Load hotels list
  useEffect(() => {
    API.get('/hotel/hotels').then(r => {
      const list = r.data || [];
      setHotels(list);
      if (list.length > 0) setSelectedHotel(String(list[0].id));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!selectedHotel) return;
    setLoading(true);
    try {
      const res = await API.get(`/hotel/calendar?hotel_id=${selectedHotel}&start_date=${startDate}&end_date=${endDate}`);
      setCalData(res.data);
    } catch { setCalData(null); }
    finally { setLoading(false); }
  }, [selectedHotel, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  // Build day columns
  const dayColumns = [];
  for (let i = 0; i < days; i++) {
    dayColumns.push(addDays(new Date(startDate), i));
  }

  const today = toISO(new Date());

  // Filter rooms
  const rooms = (calData?.rooms || []).filter(r => {
    if (filter === 'available') return r.status === 'available';
    if (filter === 'occupied')  return r.status === 'occupied' || r.bookings?.length > 0;
    return true;
  });

  // Navigate
  const prev = () => setStartDate(toISO(addDays(new Date(startDate), -days)));
  const next = () => setStartDate(toISO(addDays(new Date(startDate), days)));
  const goToday = () => setStartDate(toISO(new Date()));

  // Get booking bar position and width for a room
  const getBookingStyle = (booking) => {
    const bStart  = booking.check_in  < startDate ? startDate : booking.check_in;
    const bEnd    = booking.check_out > endDate   ? endDate   : booking.check_out;
    const offsetDays = daysBetween(startDate, bStart);
    const spanDays   = Math.max(1, daysBetween(bStart, bEnd));
    const colors = STATUS_COLORS[booking.status] || STATUS_COLORS.confirmed;
    return {
      position: 'absolute',
      left:   offsetDays * CELL_W + 3,
      width:  spanDays  * CELL_W - 6,
      top: 5, height: ROW_H - 10,
      background: colors.bg,
      border: `1.5px solid ${colors.border}`,
      borderRadius: 6,
      display: 'flex', alignItems: 'center',
      paddingLeft: 8,
      overflow: 'hidden',
      cursor: 'pointer',
      zIndex: 2,
    };
  };

  return (
    <div style={{ padding: '28px 24px' }}>

      {tooltip && <BookingTooltip {...tooltip} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'DM Serif Display, serif' }}>
            📅 {th.calendarTitle || 'Booking Calendar'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ea4be' }}>
            {th.calendarSub || 'Room availability at a glance'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Hotel selector */}
          <select value={selectedHotel} onChange={e => setSelectedHotel(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e4e6ef', fontFamily: 'DM Sans', fontSize: 13 }}>
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          {/* Days range */}
          <select value={days} onChange={e => setDays(parseInt(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e4e6ef', fontFamily: 'DM Sans', fontSize: 13 }}>
            <option value={7}>7 {th.days || 'days'}</option>
            <option value={14}>14 {th.days || 'days'}</option>
            <option value={21}>21 {th.days || 'days'}</option>
            <option value={30}>30 {th.days || 'days'}</option>
          </select>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Navigation */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={prev} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e4e6ef', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>← {th.prev || 'Prev'}</button>
          <button onClick={goToday} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #4361ee', background: '#eef0fd', color: '#4361ee', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700 }}>{th.today || 'Today'}</button>
          <button onClick={next} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e4e6ef', background: 'white', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>{th.next || 'Next'} →</button>
        </div>
        {/* Filter */}
        {['all','available','occupied'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 8, fontFamily: 'DM Sans', fontSize: 12, fontWeight: filter === f ? 700 : 400,
            border: '1.5px solid #e4e6ef', background: filter === f ? '#0f1117' : 'white',
            color: filter === f ? '#c9a84c' : '#374151', cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {f === 'all' ? (th.allRooms || 'All Rooms') : f === 'available' ? (th.availableRooms || 'Available') : (th.occupiedRooms || 'Occupied')}
          </button>
        ))}
        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', fontSize: 12, color: '#6b7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 10, borderRadius: 3, background: '#4361ee' }} /> {th.confirmed || 'Confirmed'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 10, borderRadius: 3, background: '#10b981' }} /> {th.checkedIn || 'Checked In'}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ border: '1px solid #e4e6ef', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>

        {/* Sticky header row */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e4e6ef', background: '#f8f9fc', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ width: LABEL_W, flexShrink: 0, padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9ea4be', borderRight: '1px solid #e4e6ef' }}>
            {th.room || 'Room'}
          </div>
          <div style={{ display: 'flex', overflowX: 'hidden' }} ref={scrollRef}>
            {dayColumns.map((d, i) => {
              const iso = toISO(d);
              const isToday = iso === today;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} style={{
                  width: CELL_W, flexShrink: 0, padding: '4px 0', textAlign: 'center',
                  background: isToday ? '#eef0fd' : isWeekend ? '#fafafa' : 'transparent',
                  borderLeft: isToday ? '2px solid #4361ee' : '1px solid #f0f1f6',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? '#4361ee' : '#9ea4be', textTransform: 'uppercase' }}>
                    {d.toLocaleDateString('en', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? '#4361ee' : '#374151' }}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room rows */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ea4be', fontSize: 13 }}>Loading calendar…</div>
        ) : rooms.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ea4be', fontSize: 13 }}>
            {!selectedHotel ? (th.selectHotelFirst || 'Select a hotel to view the calendar') : (th.noRooms || 'No rooms found')}
          </div>
        ) : (
          rooms.map((room, ri) => {
            const prevType = ri > 0 ? rooms[ri-1].room_type : null;
            const showGroupHeader = room.room_type !== prevType;
            return (
              <div key={room.id}>
                {/* Room type group header */}
                {showGroupHeader && (
                  <div style={{ display: 'flex', background: '#f0f4ff', borderBottom: '1px solid #e4e6ef', borderTop: ri > 0 ? '2px solid #d0d5f5' : 'none' }}>
                    <div style={{ width: LABEL_W, flexShrink: 0, padding: '5px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#4361ee', borderRight: '1px solid #e4e6ef' }}>
                      {room.room_type || 'Other'}
                    </div>
                    <div style={{ flex: 1, padding: '5px 12px', fontSize: 10, color: '#9ea4be' }}>
                      {rooms.filter(r => r.room_type === room.room_type).length} rooms
                    </div>
                  </div>
                )}
                {/* Room row */}
                <div style={{ display: 'flex', borderBottom: '1px solid #f0f1f6', height: ROW_H }}>
                  {/* Room label */}
                  <div style={{
                    width: LABEL_W, flexShrink: 0, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8,
                    borderRight: '1px solid #e4e6ef', background: getRoomColor(room.room_type),
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1117' }}>#{room.room_number}</div>
                      <div style={{ fontSize: 10, color: '#9ea4be', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.floor ? `F${room.floor} · ` : ''}{room.capacity}👤
                        {room.base_rate ? ` · $${room.base_rate}/n` : ''}
                      </div>
                    </div>
                    {room.status === 'maintenance' && <span title="Maintenance" style={{ fontSize: 14 }}>🔧</span>}
                  </div>

                  {/* Day cells + booking bars */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    {/* Day cell backgrounds */}
                    {dayColumns.map((d, i) => {
                      const iso = toISO(d);
                      const isToday = iso === today;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div key={i} style={{
                          position: 'absolute', left: i * CELL_W, width: CELL_W, height: ROW_H,
                          background: isToday ? 'rgba(67,97,238,0.05)' : isWeekend ? 'rgba(0,0,0,0.015)' : 'transparent',
                          borderLeft: isToday ? '2px solid rgba(67,97,238,0.3)' : '1px solid #f5f5f5',
                        }} />
                      );
                    })}
                    {/* Booking bars */}
                    {room.bookings?.map(b => (
                      <div key={b.id}
                        style={getBookingStyle(b)}
                        onMouseEnter={e => setTooltip({ booking: b, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setTooltip({ booking: b, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          {b.guest_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Summary footer */}
        {calData && rooms.length > 0 && (() => {
          const totalRooms = rooms.length;
          const occupiedCount = rooms.filter(r =>
            r.bookings?.some(b => b.check_in <= today && b.check_out > today)
          ).length;
          const pct = Math.round(occupiedCount / totalRooms * 100);
          return (
            <div style={{ padding: '10px 14px', background: '#f8f9fc', borderTop: '2px solid #e4e6ef', display: 'flex', gap: 24, fontSize: 12, color: '#6b7280' }}>
              <span><strong style={{ color: '#0f1117' }}>{totalRooms}</strong> {th.totalRooms || 'total rooms'}</span>
              <span><strong style={{ color: '#10b981' }}>{totalRooms - occupiedCount}</strong> {th.available || 'available tonight'}</span>
              <span><strong style={{ color: '#4361ee' }}>{occupiedCount}</strong> {th.occupied || 'occupied'}</span>
              <span style={{ marginLeft: 'auto' }}>{th.occupancyTonight || 'Occupancy'}: <strong style={{ color: pct >= 80 ? '#10b981' : pct >= 60 ? '#f97316' : '#ef4444' }}>{pct}%</strong></span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
