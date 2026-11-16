import api from './axios';

export const signupApi = (payload) =>
  api.post('/auth/signup', payload).then((r) => r.data);

export const loginApi = (payload) =>
  api.post('/auth/login', payload).then((r) => r.data);

export const logoutApi = () => api.post('/auth/logout').then((r) => r.data);

export const meApi = () => api.get('/auth/me').then((r) => r.data);