const bidService = require('../services/bid.service');
const { emitNewBid, emitAuctionUpdate } = require('../sockets');
const { asyncHandler } = require('../middleware/errorHandler');

const place = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { amount } = req.body;

  const { bid, auction, previousBidderId } = await bidService.placeBid(
    req.user,
    auctionId,
    amount
  );

  const payload = {
    auctionId,
    bid: {
      id: bid.id,
      amount: Number(bid.amount),
      bidderId: bid.bidder_id,
      createdAt: bid.created_at,
    },
    currentPrice: Number(auction.current_price),
    endsAt: auction.ends_at,
    previousBidderId,
  };

  emitNewBid(auctionId, payload);
  emitAuctionUpdate(auctionId, {
    auctionId,
    currentPrice: Number(auction.current_price),
    endsAt: auction.ends_at,
  });

  res.status(201).json({ bid, auction });
});

const listForAuction = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const result = await bidService.listAuctionBids(auctionId, {
    page: Number(page),
    limit: Math.min(Number(limit), 50),
  });
  res.json(result);
});

const mine = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await bidService.listMyBids(req.user, {
    page: Number(page),
    limit: Math.min(Number(limit), 50),
  });
  res.json(result);
});

module.exports = { place, listForAuction, mine };