import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import { RetailProperties, RetailUnits, RetailTenants, RetailInvoices, RetailMaintenance } from './pages/RetailPages';
import { HotelList, HotelRooms, HotelGuests, HotelBookings } from './pages/HotelPages';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ marginLeft: 260, flex: 1, padding: '40px 48px', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/retail/properties" element={<RetailProperties />} />
            <Route path="/retail/units" element={<RetailUnits />} />
            <Route path="/retail/tenants" element={<RetailTenants />} />
            <Route path="/retail/invoices" element={<RetailInvoices />} />
            <Route path="/retail/maintenance" element={<RetailMaintenance />} />
            <Route path="/hotel/hotels" element={<HotelList />} />
            <Route path="/hotel/rooms" element={<HotelRooms />} />
            <Route path="/hotel/guests" element={<HotelGuests />} />
            <Route path="/hotel/bookings" element={<HotelBookings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
