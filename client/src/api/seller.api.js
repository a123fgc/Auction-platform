import api from './axios';

function toFormData(obj, files) {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') fd.append(k, v);
  });
  (files || []).forEach((f) => fd.append('images', f));
  return fd;
}

export const myAuctionsApi = (params) =>
  api.get('/seller/auctions', { params }).then((r) => r.data);

export const createAuctionApi = (payload, files) =>
  api
    .post('/seller/auctions', toFormData(payload, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.auction);

export const updateAuctionApi = (id, payload, files) =>
  api
    .patch(`/seller/auctions/${id}`, toFormData(payload, files), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data.auction);

export const cancelAuctionApi = (id) =>
  api.delete(`/seller/auctions/${id}`).then((r) => r.data.auction);