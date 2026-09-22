import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes(':5000'))
  ? import.meta.env.VITE_API_URL
  : '/api';


const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for fallback error handling
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[API Error]', error?.response?.data || error.message);
    return Promise.reject(error?.response?.data || error);
  }
);

export const healthAPI = {
  getHealth: () => client.get('/health'),
};

export const nodesAPI = {
  getAll: () => client.get('/nodes'),
  getById: (id) => client.get(`/nodes/${id}`),
  create: (data) => client.post('/nodes', data),
  update: (id, data) => client.put(`/nodes/${id}`, data),
  delete: (id) => client.delete(`/nodes/${id}`),
};

export const readingsAPI = {
  getAll: (params) => client.get('/readings', { params }),
  getLatest: () => client.get('/readings/latest'),
  getByNode: (nodeId, params) => client.get(`/readings/node/${nodeId}`, { params }),
  create: (data) => client.post('/readings', data),
};

export const dashboardAPI = {
  getSummary: () => client.get('/dashboard/summary'),
  getHeatStress: (params) => client.get('/dashboard/heat-stress', { params }),
  getPrediction: (params) => client.get('/dashboard/prediction', { params }),
};

export const alertsAPI = {
  getAll: (params) => client.get('/nodes/alerts', { params }),
  create: (data) => client.post('/nodes/alerts', data),
  update: (id, data) => client.put(`/nodes/alerts/${id}`, data),
  delete: (id) => client.delete(`/nodes/alerts/${id}`),
  acknowledgeAll: () => client.put('/nodes/alerts/acknowledge-all'),
};

export const heatmapAPI = {
  getData: () => client.get('/heatmap'),
};

export default client;
