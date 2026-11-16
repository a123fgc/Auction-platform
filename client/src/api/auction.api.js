import api from './axios';

export const listAuctionsApi = (params) =>
  api.get('/auctions', { params }).then((r) => r.data);

export const getAuctionApi = (id) =>
  api.get(`/auctions/${id}`).then((r) => r.data.auction);

export const listCategoriesApi = () =>
  api.get('/auctions/categories').then((r) => r.data.categories);