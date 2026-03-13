import React from 'react';
import { CrudPage } from '../components/CrudPage';
import { Input, Select, Textarea } from '../components/UI';
import { hotel } from '../api';

const HotelForm = ({ form, setForm }) => {
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <Input label="Hotel Name" value={form.name || ''} onChange={s('name')} required />
    <Input label="Address" value={form.address || ''} onChange={s('address')} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Select label="Star Rating" value={form.star_rating || ''} onChange={s('star_rating')}>
        <option value="">—</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} ★</option>)}
      </Select>
      <Input label="Total Rooms" type="number" value={form.total_rooms || ''} onChange={s('total_rooms')} />
    </div>
  </>;
};
export function HotelList() {
  return <CrudPage title="Hotels" sub="Hotel property portfolio" api={hotel.hotels}
    emptyForm={{ name: '', address: '', star_rating: '', total_rooms: '' }}
    columns={[
      { key: 'name', label: 'Hotel Name' }, { key: 'address', label: 'Address' },
      { key: 'star_rating', label: 'Stars', render: v => v ? '★'.repeat(v) : '—' },
      { key: 'total_rooms', label: 'Rooms' },
    ]} FormComponent={HotelForm} />;
}

const RoomForm = ({ form, setForm }) => {
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <Input label="Hotel ID" type="number" value={form.hotel_id || ''} onChange={s('hotel_id')} required />
    <Input label="Room Number" value={form.room_number || ''} onChange={s('room_number')} required />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Floor" type="number" value={form.floor || ''} onChange={s('floor')} />
      <Input label="Capacity" type="number" value={form.capacity || 2} onChange={s('capacity')} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Select label="Room Type" value={form.room_type || ''} onChange={s('room_type')}>
        <option value="">Select</option><option value="Standard">Standard</option><option value="Deluxe">Deluxe</option><option value="Suite">Suite</option><option value="Presidential">Presidential</option>
      </Select>
      <Select label="Bed Type" value={form.bed_type || ''} onChange={s('bed_type')}>
        <option value="">Select</option><option value="Single">Single</option><option value="Double">Double</option><option value="Queen">Queen</option><option value="King">King</option>
      </Select>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Rate ($/night)" type="number" value={form.base_rate || ''} onChange={s('base_rate')} />
      <Input label="Area (sqft)" type="number" value={form.area_sqft || ''} onChange={s('area_sqft')} />
    </div>
    <Select label="Status" value={form.status || 'available'} onChange={s('status')}>
      <option value="available">Available</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option><option value="maintenance">Maintenance</option>
    </Select>
    <Input label="Amenities (comma-separated)" value={form.amenities || ''} onChange={s('amenities')} />
  </>;
};
export function HotelRooms() {
  return <CrudPage title="Rooms" sub="Room inventory and availability" api={hotel.rooms}
    emptyForm={{ hotel_id: '', room_number: '', floor: '', room_type: '', bed_type: '', capacity: 2, area_sqft: '', base_rate: '', status: 'available', amenities: '' }}
    columns={[
      { key: 'room_number', label: 'Room' }, { key: 'room_type', label: 'Type' }, { key: 'bed_type', label: 'Bed' },
      { key: 'capacity', label: 'Capacity', render: v => `${v} guests` },
      { key: 'base_rate', label: 'Rate/night', render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'status', label: 'Status', badge: true },
    ]} FormComponent={RoomForm} />;
}

const GuestForm = ({ form, setForm }) => {
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="First Name" value={form.first_name || ''} onChange={s('first_name')} required />
      <Input label="Last Name" value={form.last_name || ''} onChange={s('last_name')} required />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Email" type="email" value={form.email || ''} onChange={s('email')} />
      <Input label="Phone" value={form.phone || ''} onChange={s('phone')} />
    </div>
    <Input label="Nationality" value={form.nationality || ''} onChange={s('nationality')} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Select label="ID Type" value={form.id_type || ''} onChange={s('id_type')}>
        <option value="">Select</option><option value="passport">Passport</option><option value="national_id">National ID</option><option value="driver_license">Driver License</option>
      </Select>
      <Input label="ID Number" value={form.id_number || ''} onChange={s('id_number')} />
    </div>
  </>;
};
export function HotelGuests() {
  return <CrudPage title="Guests" sub="Guest profiles and history" api={hotel.guests}
    emptyForm={{ first_name: '', last_name: '', email: '', phone: '', nationality: '', id_type: '', id_number: '' }}
    columns={[
      { key: 'first_name', label: 'First Name' }, { key: 'last_name', label: 'Last Name' },
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
      { key: 'nationality', label: 'Nationality' },
    ]} FormComponent={GuestForm} />;
}

const BookingForm = ({ form, setForm }) => {
  const s = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Room ID" type="number" value={form.room_id || ''} onChange={s('room_id')} required />
      <Input label="Guest ID" type="number" value={form.guest_id || ''} onChange={s('guest_id')} required />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Check-in" type="date" value={form.check_in || ''} onChange={s('check_in')} required />
      <Input label="Check-out" type="date" value={form.check_out || ''} onChange={s('check_out')} required />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Adults" type="number" value={form.adults || 1} onChange={s('adults')} />
      <Input label="Children" type="number" value={form.children || 0} onChange={s('children')} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Input label="Total Amount ($)" type="number" value={form.total_amount || ''} onChange={s('total_amount')} />
      <Input label="Paid Amount ($)" type="number" value={form.paid_amount || 0} onChange={s('paid_amount')} />
    </div>
    <Select label="Status" value={form.status || 'confirmed'} onChange={s('status')}>
      <option value="confirmed">Confirmed</option><option value="checked_in">Checked In</option><option value="checked_out">Checked Out</option><option value="cancelled">Cancelled</option>
    </Select>
    <Textarea label="Special Requests" value={form.special_requests || ''} onChange={s('special_requests')} />
  </>;
};
export function HotelBookings() {
  return <CrudPage title="Bookings" sub="Reservations and check-in/out" api={hotel.bookings}
    emptyForm={{ room_id: '', guest_id: '', check_in: '', check_out: '', adults: 1, children: 0, total_amount: '', paid_amount: 0, status: 'confirmed', special_requests: '' }}
    columns={[
      { key: 'guest_id', label: 'Guest ID' }, { key: 'room_id', label: 'Room ID' },
      { key: 'check_in', label: 'Check-in' }, { key: 'check_out', label: 'Check-out' },
      { key: 'total_amount', label: 'Total', render: v => v ? `$${Number(v).toLocaleString()}` : '—' },
      { key: 'status', label: 'Status', badge: true },
    ]} FormComponent={BookingForm} />;
}
