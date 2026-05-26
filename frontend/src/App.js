import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RevenueMap from './pages/RevenueMap';
import { HotelList, HotelRooms, HotelGuests, HotelBookings } from './pages/HotelPages';
import UsersPage from './pages/UsersPage';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import Patrimoine from './pages/Patrimoine';
import BusinessPartners from './pages/BusinessPartners';
import Contracts from './pages/Contracts';
import Conditions from './pages/Conditions';
import RentalObjects from './pages/RentalObjects';
import ServiceCharges from './pages/ServiceCharges';
import PostingEngine from './pages/PostingEngine';
import CsvImport from './pages/CsvImport';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Serif Display', fontSize: 24, color: 'var(--slate)' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  const { user } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 260,
        flex: 1,
        minHeight: '100vh',
        background: 'var(--cream)',
      }}>
        {user?.must_change_password && (
          <div style={{
            background: '#fff3cd', borderBottom: '1px solid #ffc107',
            padding: '12px 24px', fontSize: 13, color: '#856404',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span>⚠️ <strong>Security notice:</strong> You are using a default password. Please change it immediately.</span>
            <a href="/settings" style={{ color: '#856404', fontWeight: 700, textDecoration: 'underline', marginLeft: 'auto' }}>
              Change password →
            </a>
          </div>
        )}
        <div style={{
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '40px 48px',
          boxSizing: 'border-box',
        }}>
          {children}
        </div>
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
      <Route path="/revenue-map" element={<ProtectedRoute><AppLayout><RevenueMap /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/patrimoine" element={<ProtectedRoute><AppLayout><Patrimoine /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/partners" element={<ProtectedRoute><AppLayout><BusinessPartners /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/contracts" element={<ProtectedRoute><AppLayout><Contracts /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/conditions" element={<ProtectedRoute><AppLayout><Conditions /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/rental-objects" element={<ProtectedRoute><AppLayout><RentalObjects /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/service-charges" element={<ProtectedRoute><AppLayout><ServiceCharges /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/csv-import" element={<ProtectedRoute roles={['admin','manager']}><AppLayout><CsvImport /></AppLayout></ProtectedRoute>} />
      <Route path="/commercial/posting-engine" element={<ProtectedRoute roles={['admin','manager','accountant']}><AppLayout><PostingEngine /></AppLayout></ProtectedRoute>} />
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
    <AuthProvider><LanguageProvider><BrowserRouter><AppRoutes /></BrowserRouter></LanguageProvider></AuthProvider>
  );
}
