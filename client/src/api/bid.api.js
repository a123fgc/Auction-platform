import api from './axios';

export const placeBidApi = (auctionId, amount) =>
  api
    .post(`/auctions/${auctionId}/bids`, { amount })
    .then((r) => r.data);

export const listAuctionBidsApi = (auctionId, params) =>
  api.get(`/auctions/${auctionId}/bids`, { params }).then((r) => r.data);

export const myBidsApi = (params) =>
  api.get('/my-bids', { params }).then((r) => r.data);
// Delete your own bid
export const deleteBidApi = (bidId) =>
  api.delete(`/bids/${bidId}`).then((r) => r.data);