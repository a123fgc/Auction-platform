const bidRepo = require('../db/repositories/bid.repo');
const auctionRepo = require('../db/repositories/auction.repo');
const ApiError = require('../utils/ApiError');

const CODE_TO_STATUS = {
  AUCTION_NOT_FOUND: 404,
  AUCTION_NOT_ACTIVE: 400,
  AUCTION_ENDED: 400,
  SELLER_CANNOT_BID: 403,
  BID_TOO_LOW: 400,
};

async function placeBid(user, auctionId, amount) {
  // Validate auction exists and buyer isn't seller (fast path; RPC re-checks)
  const auction = await auctionRepo.findById(auctionId);
  if (!auction) throw ApiError.notFound('Auction not found');
  if (auction.seller_id === user.id) {
    throw ApiError.forbidden('You cannot bid on your own auction');
  }

  const minBid = Number(auction.current_price) + Number(auction.min_increment);
  if (Number(amount) < minBid) {
    throw ApiError.badRequest(
      `Bid must be at least ${minBid.toFixed(2)}`
    );
  }

  // Snapshot previous highest bidder BEFORE insert (who to notify)
  const prevTop = await bidRepo.highestBidder(auctionId);

  let bid;
  try {
    bid = await bidRepo.placeBidRpc({
      auctionId,
      bidderId: user.id,
      amount: Number(amount),
    });
  } catch (err) {
    if (err.code && CODE_TO_STATUS[err.code]) {
      throw new ApiError(CODE_TO_STATUS[err.code], err.message);
    }
    throw err;
  }

  // Fetch fresh auction (ends_at may have been extended by anti-sniping)
  const freshAuction = await auctionRepo.findById(auctionId);

  return { bid, auction: freshAuction, previousBidderId: prevTop?.bidder_id || null };
}

async function listAuctionBids(auctionId, query = {}) {
  return bidRepo.listForAuction(auctionId, query);
}

async function listMyBids(user, query = {}) {
  return bidRepo.listForBidder(user.id, query);
}

async function deleteBid(user, bidId) {
  try {
    return await bidRepo.deleteBidRpc({
      bidId,
      bidderId: user.id,
    });
  } catch (err) {
    const statusCodes = {
      BID_NOT_FOUND: 404,
      AUCTION_NOT_ACTIVE: 400,
      AUCTION_ENDED: 400,
    };

    if (statusCodes[err.code]) {
      throw new ApiError(statusCodes[err.code], err.message);
    }

    throw err;
  }
}

module.exports = { placeBid, listAuctionBids, listMyBids , deleteBid,};
