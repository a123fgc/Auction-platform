import api from './axios';

export const getStatsApi = () => api.get('/admin/stats').then((r) => r.data);

export const listUsersApi = (params) =>
  api.get('/admin/users', { params }).then((r) => r.data);

export const suspendUserApi = (id, suspended) =>
  api.patch(`/admin/users/${id}/suspend`, { suspended }).then((r) => r.data);

export const listAdminAuctionsApi = (params) =>
  api.get('/admin/auctions', { params }).then((r) => r.data);

export const closeAuctionApi = (id) =>
  api.post(`/admin/auctions/${id}/close`).then((r) => r.data);

export const removeAuctionApi = (id) =>
  api.delete(`/admin/auctions/${id}`).then((r) => r.data);