import axios from 'axios';
import { clearAuthToken, getAuthToken } from '../utils/authToken';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    if (status === 401 && !/\/auth\/(login|signup)(?:\?|$)/.test(url)) {
      clearAuthToken();
    }
    const message =
      err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(Object.assign(new Error(message), { status }));
  }
);

export default api;
