import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ── Dashboard ─────────────────────────────────
export const dashboardAPI = {
  getSummary: (params) => api.get('/dashboard/summary', { params }),
  getNodeStatus: () => api.get('/dashboard/node-status'),
  getAirQualitySummary: () => api.get('/dashboard/air-quality-summary'),
  getDailyReport: (date) => api.get('/dashboard/reports/daily', { params: { date } }),
  getWeeklyReport: () => api.get('/dashboard/reports/weekly'),
};

// ── Nodes ─────────────────────────────────────
export const nodesAPI = {
  getAll: (params) => api.get('/nodes', { params }),
  getById: (nodeId) => api.get(`/nodes/${nodeId}`),
  getMaster: () => api.get('/nodes/master'),
  getLatest: (params) => api.get('/nodes/latest', { params }),
  setMaster: (nodeId) => api.put(`/nodes/${nodeId}/master`),
  create: (data) => api.post('/nodes', data),
  update: (nodeId, data) => api.put(`/nodes/${nodeId}`, data),
  delete: (nodeId) => api.delete(`/nodes/${nodeId}`),
  sendData: (nodeId, data) => api.post(`/nodes/${nodeId}`, data),
  getReadings: (nodeId, params) => api.get(`/nodes/${nodeId}/readings`, { params }),
  deleteReading: (nodeId, readingId) => api.delete(`/nodes/${nodeId}/readings/${readingId}`),
};

// ── Readings ──────────────────────────────────
export const readingsAPI = {
  getAll: (params) => api.get('/readings', { params }),
  getLatest: () => api.get('/readings/latest'),
  getByNode: (nodeId, params) => api.get(`/readings/node/${nodeId}`, { params }),
  getBySensor: (sensorType, params) => api.get(`/readings/sensor/${sensorType}`, { params }),
  getHistory: (params) => api.get('/readings/history', { params }),
  create: (data) => api.post('/readings', data),
  delete: (id) => api.delete(`/readings/${id}`),
};

// ── Alerts ────────────────────────────────────
export const alertsAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  getSummary: () => api.get('/alerts/summary'),
  create: (data) => api.post('/alerts', data),
  update: (id, data) => api.put(`/alerts/${id}`, data),
  delete: (id) => api.delete(`/alerts/${id}`),
};

// ── Thresholds ────────────────────────────────
export const thresholdsAPI = {
  getAll: () => api.get('/thresholds'),
  getBySensor: (sensorType) => api.get(`/thresholds/${sensorType}`),
  update: (sensorType, data) => api.put(`/thresholds/${sensorType}`, data),
};

export default api;
