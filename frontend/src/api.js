import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

export const authAPI = {
  login: (d) => API.post('/auth/login', d),
  verify2fa: (d) => API.post('/auth/verify-2fa', d),
  setup2fa: () => API.post('/auth/setup-2fa'),
  confirm2fa: (d) => API.post('/auth/confirm-2fa', d),
  disable2fa: (d) => API.post('/auth/disable-2fa', d),
  changePassword: (d) => API.post('/auth/change-password', d),
  me: () => API.get('/auth/me'),
};

export const usersAPI = {
  list: () => API.get('/users/'),
  create: (d) => API.post('/users/', d),
  update: (id, d) => API.put(`/users/${id}`, d),
  delete: (id) => API.delete(`/users/${id}`),
  auditLog: () => API.get('/users/audit-log'),
};

export const retail = {
  stats: () => API.get('/retail/stats'),
  properties: { list: () => API.get('/retail/properties'), create: (d) => API.post('/retail/properties', d), update: (id, d) => API.put(`/retail/properties/${id}`, d), delete: (id) => API.delete(`/retail/properties/${id}`) },
  units: { list: () => API.get('/retail/units'), create: (d) => API.post('/retail/units', d), update: (id, d) => API.put(`/retail/units/${id}`, d), delete: (id) => API.delete(`/retail/units/${id}`) },
  tenants: { list: () => API.get('/retail/tenants'), create: (d) => API.post('/retail/tenants', d), update: (id, d) => API.put(`/retail/tenants/${id}`, d), delete: (id) => API.delete(`/retail/tenants/${id}`) },
  invoices: { list: () => API.get('/retail/invoices'), create: (d) => API.post('/retail/invoices', d), update: (id, d) => API.put(`/retail/invoices/${id}`, d), delete: (id) => API.delete(`/retail/invoices/${id}`) },
  maintenance: { list: () => API.get('/retail/maintenance'), create: (d) => API.post('/retail/maintenance', d), update: (id, d) => API.put(`/retail/maintenance/${id}`, d), delete: (id) => API.delete(`/retail/maintenance/${id}`) },
};

export const hotel = {
  stats: () => API.get('/hotel/stats'),
  hotels: { list: () => API.get('/hotel/hotels'), create: (d) => API.post('/hotel/hotels', d), update: (id, d) => API.put(`/hotel/hotels/${id}`, d), delete: (id) => API.delete(`/hotel/hotels/${id}`) },
  rooms: { list: () => API.get('/hotel/rooms'), create: (d) => API.post('/hotel/rooms', d), update: (id, d) => API.put(`/hotel/rooms/${id}`, d), delete: (id) => API.delete(`/hotel/rooms/${id}`) },
  guests: { list: () => API.get('/hotel/guests'), create: (d) => API.post('/hotel/guests', d), update: (id, d) => API.put(`/hotel/guests/${id}`, d), delete: (id) => API.delete(`/hotel/guests/${id}`) },
  bookings: { list: () => API.get('/hotel/bookings'), create: (d) => API.post('/hotel/bookings', d), update: (id, d) => API.put(`/hotel/bookings/${id}`, d), delete: (id) => API.delete(`/hotel/bookings/${id}`) },
};

export default API;
