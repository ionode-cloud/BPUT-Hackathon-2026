import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s to accommodate Render free-tier cold starts
});

// Request interceptor — add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('esg360_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 on expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Do NOT redirect or clear storage on login or register endpoints
    const isAuthRoute =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('esg360_token');
      localStorage.removeItem('esg360_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
