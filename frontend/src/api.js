import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Retail
export const retail = {
  stats: () => API.get('/retail/stats'),
  properties: { list: () => API.get('/retail/properties'), create: (d) => API.post('/retail/properties', d), update: (id, d) => API.put(`/retail/properties/${id}`, d), delete: (id) => API.delete(`/retail/properties/${id}`) },
  units: { list: (pid) => API.get('/retail/units', { params: pid ? { property_id: pid } : {} }), create: (d) => API.post('/retail/units', d), update: (id, d) => API.put(`/retail/units/${id}`, d), delete: (id) => API.delete(`/retail/units/${id}`) },
  tenants: { list: () => API.get('/retail/tenants'), create: (d) => API.post('/retail/tenants', d), update: (id, d) => API.put(`/retail/tenants/${id}`, d), delete: (id) => API.delete(`/retail/tenants/${id}`) },
  invoices: { list: () => API.get('/retail/invoices'), create: (d) => API.post('/retail/invoices', d), update: (id, d) => API.put(`/retail/invoices/${id}`, d), delete: (id) => API.delete(`/retail/invoices/${id}`) },
  maintenance: { list: () => API.get('/retail/maintenance'), create: (d) => API.post('/retail/maintenance', d), update: (id, d) => API.put(`/retail/maintenance/${id}`, d), delete: (id) => API.delete(`/retail/maintenance/${id}`) },
};

// Hotel
export const hotel = {
  stats: () => API.get('/hotel/stats'),
  hotels: { list: () => API.get('/hotel/hotels'), create: (d) => API.post('/hotel/hotels', d), update: (id, d) => API.put(`/hotel/hotels/${id}`, d), delete: (id) => API.delete(`/hotel/hotels/${id}`) },
  rooms: { list: (hid) => API.get('/hotel/rooms', { params: hid ? { hotel_id: hid } : {} }), create: (d) => API.post('/hotel/rooms', d), update: (id, d) => API.put(`/hotel/rooms/${id}`, d), delete: (id) => API.delete(`/hotel/rooms/${id}`) },
  guests: { list: () => API.get('/hotel/guests'), create: (d) => API.post('/hotel/guests', d), update: (id, d) => API.put(`/hotel/guests/${id}`, d), delete: (id) => API.delete(`/hotel/guests/${id}`) },
  bookings: { list: () => API.get('/hotel/bookings'), create: (d) => API.post('/hotel/bookings', d), update: (id, d) => API.put(`/hotel/bookings/${id}`, d), delete: (id) => API.delete(`/hotel/bookings/${id}`) },
};

export default API;
