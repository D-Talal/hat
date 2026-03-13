import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { RetailProperties, RetailUnits, RetailTenants, RetailInvoices, RetailMaintenance } from './pages/RetailPages';
import { HotelList, HotelRooms, HotelGuests, HotelBookings } from './pages/HotelPages';
import UsersPage from './pages/UsersPage';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Serif Display', fontSize: 24, color: 'var(--slate)' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 260, flex: 1, padding: '40px 48px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/retail/properties" element={<ProtectedRoute><AppLayout><RetailProperties /></AppLayout></ProtectedRoute>} />
      <Route path="/retail/units" element={<ProtectedRoute><AppLayout><RetailUnits /></AppLayout></ProtectedRoute>} />
      <Route path="/retail/tenants" element={<ProtectedRoute><AppLayout><RetailTenants /></AppLayout></ProtectedRoute>} />
      <Route path="/retail/invoices" element={<ProtectedRoute><AppLayout><RetailInvoices /></AppLayout></ProtectedRoute>} />
      <Route path="/retail/maintenance" element={<ProtectedRoute><AppLayout><RetailMaintenance /></AppLayout></ProtectedRoute>} />
      <Route path="/hotel/hotels" element={<ProtectedRoute><AppLayout><HotelList /></AppLayout></ProtectedRoute>} />
      <Route path="/hotel/rooms" element={<ProtectedRoute><AppLayout><HotelRooms /></AppLayout></ProtectedRoute>} />
      <Route path="/hotel/guests" element={<ProtectedRoute><AppLayout><HotelGuests /></AppLayout></ProtectedRoute>} />
      <Route path="/hotel/bookings" element={<ProtectedRoute><AppLayout><HotelBookings /></AppLayout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['admin']}><AppLayout><UsersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute roles={['admin', 'manager']}><AppLayout><AuditLog /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
