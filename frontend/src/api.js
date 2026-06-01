import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  withCredentials: false,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  config.headers['Content-Type'] = 'application/json';
  return config;
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

export const mapAPI = {
  stats: (module) => API.get(`/map/stats?module=${module}`),
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
  hotelPdf: {
    stayInvoice: (bookingId) => API.get(`/pdf/hotel-stay/${bookingId}`, { responseType: 'blob' }),
  },
  hotelReception: {
    get:      (hotelId) => API.get('/hotel/reception' + (hotelId ? `?hotel_id=${hotelId}` : '')),
    checkin:  (id)      => API.post(`/hotel/bookings/${id}/checkin`),
    checkout: (id, amt) => API.post(`/hotel/bookings/${id}/checkout`, { paid_amount: amt }),
    cancel:   (id)      => API.post(`/hotel/bookings/${id}/cancel`),
  },
  hotels: { list: () => API.get('/hotel/hotels'), create: (d) => API.post('/hotel/hotels', d), update: (id, d) => API.put(`/hotel/hotels/${id}`, d), delete: (id) => API.delete(`/hotel/hotels/${id}`) },
  rooms: { list: () => API.get('/hotel/rooms'), create: (d) => API.post('/hotel/rooms', d), update: (id, d) => API.put(`/hotel/rooms/${id}`, d), delete: (id) => API.delete(`/hotel/rooms/${id}`) },
  guests: { list: () => API.get('/hotel/guests'), create: (d) => API.post('/hotel/guests', d), update: (id, d) => API.put(`/hotel/guests/${id}`, d), delete: (id) => API.delete(`/hotel/guests/${id}`) },
  bookings: { list: () => API.get('/hotel/bookings'), create: (d) => API.post('/hotel/bookings', d), update: (id, d) => API.put(`/hotel/bookings/${id}`, d), delete: (id) => API.delete(`/hotel/bookings/${id}`) },
};

export default API;

export const commercial = {
  stats: () => API.get('/commercial/stats'),
  companyCodes: {
    list:   ()      => API.get('/commercial/company-codes'),
    create: (d)     => API.post('/commercial/company-codes', d),
    update: (id, d) => API.put(`/commercial/company-codes/${id}`, d),
    delete: (id)    => API.delete(`/commercial/company-codes/${id}`),
  },
  businessEntities: {
    list: () => API.get('/commercial/business-entities'),
    create: (d) => API.post('/commercial/business-entities', d),
    update: (id, d) => API.put(`/commercial/business-entities/${id}`, d),
    delete: (id) => API.delete(`/commercial/business-entities/${id}`),
  },
  buildings: {
    list: (beId) => API.get(`/commercial/business-entities/${beId}/buildings`),
    listAll: () => API.get('/commercial/buildings'),
    create: (beId, d) => API.post(`/commercial/business-entities/${beId}/buildings`, d),
    update: (id, d) => API.put(`/commercial/buildings/${id}`, d),
    delete: (id) => API.delete(`/commercial/buildings/${id}`),
  },
  floors: {
    list: (bId) => API.get(`/commercial/buildings/${bId}/floors`),
    create: (bId, d) => API.post(`/commercial/buildings/${bId}/floors`, d),
    delete: (id) => API.delete(`/commercial/floors/${id}`),
  },
  spaces: {
    list: (fId) => API.get(`/commercial/floors/${fId}/spaces`),
    available: (bId) => API.get(`/commercial/buildings/${bId}/available-spaces`),
    create: (fId, d) => API.post(`/commercial/floors/${fId}/spaces`, d),
    delete: (id) => API.delete(`/commercial/spaces/${id}`),
  },
  partners: {
    list: () => API.get('/commercial/business-partners'),
    create: (d) => API.post('/commercial/business-partners', d),
    update: (id, d) => API.put(`/commercial/business-partners/${id}`, d),
    delete: (id) => API.delete(`/commercial/business-partners/${id}`),
  },
  contracts: {
    list: (status) => API.get('/commercial/contracts' + (status ? `?status=${status}` : '')),
    create: (d) => API.post('/commercial/contracts', d),
    patch: (id, d) => API.patch(`/commercial/contracts/${id}`, d),
    delete: (id) => API.delete(`/commercial/contracts/${id}`),
  },
  conditions: {
    list: (contractId) => API.get('/commercial/conditions' + (contractId ? `?contract_id=${contractId}` : '')),
    create: (d) => API.post('/commercial/conditions', d),
    update: (id, d) => API.put(`/commercial/conditions/${id}`, d),
    delete: (id) => API.delete(`/commercial/conditions/${id}`),
  },
  spaces: {
    leasable: (businessEntityId) => API.get('/commercial/spaces-leasable' + (businessEntityId ? `?business_entity_id=${businessEntityId}` : '')),
  },
  participationGroups: {
    list: () => API.get('/commercial/participation-groups'),
    create: (d) => API.post('/commercial/participation-groups', d),
    update: (id, d) => API.put(`/commercial/participation-groups/${id}`, d),
    delete: (id) => API.delete(`/commercial/participation-groups/${id}`),
  },
  costCollectors: {
    create: (d) => API.post('/commercial/cost-collectors', d),
    settle: (id) => API.patch(`/commercial/cost-collectors/${id}/settle`),
  },
  invoices: {
    list: (contractId) => API.get('/commercial/invoices' + (contractId ? `?contract_id=${contractId}` : '')),
    create: (d) => API.post('/commercial/invoices', d),
    update: (id, d) => API.put(`/commercial/invoices/${id}`, d),
    delete: (id) => API.delete(`/commercial/invoices/${id}`),
    pay: (id) => API.patch(`/commercial/invoices/${id}/pay`),
    downloadPdf: (id) => API.get(`/pdf/invoice/${id}`, { responseType: 'blob' }),
    downloadStatement: (contractId) => API.get(`/pdf/lease-statement/${contractId}`, { responseType: 'blob' }),
  },
  maintenance: {
    list: () => API.get('/commercial/maintenance'),
    create: (d) => API.post('/commercial/maintenance', d),
    update: (id, status) => API.patch(`/commercial/maintenance/${id}?status=${status}`),
  },
};

export const posting = {
  run:         (d) => API.post('/posting/run', d),
  runs:        () => API.get('/posting/runs'),
  runEntries:  (id) => API.get(`/posting/runs/${id}/entries`),
  stats:       () => API.get('/posting/stats'),
  applyIpc:    (d) => API.post('/posting/ipc/apply', d),
  ipcHistory:  (contractId) => API.get('/posting/ipc/history' + (contractId ? `?contract_id=${contractId}` : '')),
  setupIfrs16: (d) => API.post('/posting/ifrs16/setup', d),
  ifrs16List:  () => API.get('/posting/ifrs16/schedules'),
  ifrs16Lines: (id) => API.get(`/posting/ifrs16/schedules/${id}/lines`),
  deleteIfrs16:(contractId) => API.delete(`/posting/ifrs16/schedules/${contractId}`),
  fxRates:     () => API.get('/posting/fx-rates'),
  createFxRate:(d) => API.post('/posting/fx-rates', d),
  simulateSales:(d) => API.post('/posting/sales/simulate', d),
};
