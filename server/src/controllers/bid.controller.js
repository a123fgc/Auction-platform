const bidService = require('../services/bid.service');
const { emitNewBid, emitAuctionUpdate } = require('../sockets');
const { asyncHandler } = require('../middleware/errorHandler');

const place = asyncHandler(async (req, res) => {
  const { auctionId } = req.validatedParams;
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
  const { auctionId } = req.validatedParams;
  const { page, limit } = req.validatedQuery;
  const result = await bidService.listAuctionBids(auctionId, {
    page,
    limit,
  });
  res.json(result);
});

const mine = asyncHandler(async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const result = await bidService.listMyBids(req.user, {
    page,
    limit,
  });
  res.json(result);
});

module.exports = { place, listForAuction, mine };
