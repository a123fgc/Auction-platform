const auctionRepo = require('../db/repositories/auction.repo');
const categoryRepo = require('../db/repositories/category.repo');
const ApiError = require('../utils/ApiError');

async function createAuction(sellerId, payload) {
  const {
    title,
    description,
    starting_price,
    min_increment,
    category_id,
    images,
    ends_at,
  } = payload;

  if (category_id) {
    const cat = await categoryRepo.findById(category_id);
    if (!cat) throw ApiError.badRequest('Invalid category');
  }

  const endsAt = new Date(ends_at);
  if (Number.isNaN(endsAt.getTime())) {
    throw ApiError.badRequest('Invalid ends_at date');
  }
  if (endsAt.getTime() <= Date.now() + 60 * 1000) {
    throw ApiError.badRequest('End date must be at least 1 minute in the future');
  }

  const auction = await auctionRepo.create({
    seller_id: sellerId,
    category_id: category_id || null,
    title: title.trim(),
    description: description.trim(),
    images: images || [],
    starting_price,
    current_price: starting_price,
    min_increment: min_increment ?? 1,
    starts_at: new Date().toISOString(),
    ends_at: endsAt.toISOString(),
    status: 'active',
  });

  return auction;
}

async function updateAuction(user, auctionId, patch) {
  const auction = await auctionRepo.findById(auctionId);
  if (!auction) throw ApiError.notFound('Auction not found');

  if (user.role !== 'admin' && auction.seller_id !== user.id) {
    throw ApiError.forbidden('You can only edit your own auctions');
  }
  if (auction.status !== 'active') {
    throw ApiError.badRequest('Only active auctions can be edited');
  }
  if (auction.current_price > auction.starting_price) {
    // Bids already placed — restrict edits to description/images only
    delete patch.starting_price;
    delete patch.min_increment;
    delete patch.ends_at;
  }

  if (patch.category_id) {
    const cat = await categoryRepo.findById(patch.category_id);
    if (!cat) throw ApiError.badRequest('Invalid category');
  }
  if (patch.ends_at) {
    const endsAt = new Date(patch.ends_at);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('End date must be in the future');
    }
    patch.ends_at = endsAt.toISOString();
  }

  return auctionRepo.update(auctionId, patch);
}

async function cancelAuction(user, auctionId) {
  const auction = await auctionRepo.findById(auctionId);
  if (!auction) throw ApiError.notFound('Auction not found');

  if (user.role !== 'admin' && auction.seller_id !== user.id) {
    throw ApiError.forbidden('You can only cancel your own auctions');
  }
  if (auction.status !== 'active') {
    throw ApiError.badRequest('Only active auctions can be cancelled');
  }
  let cancelled;
  try {
    cancelled = await auctionRepo.cancel(auctionId, user.id);
  } catch (error) {
    if (error.message?.includes('CANCEL_NOT_ALLOWED')) {
      throw ApiError.forbidden('You can only cancel your own auctions');
    }
    throw error;
  }
  if (!cancelled) throw ApiError.badRequest('Only active auctions can be cancelled');
  return (await auctionRepo.findById(auctionId)) || cancelled;
}

async function getAuction(id) {
  const auction = await auctionRepo.findById(id);
  if (!auction) throw ApiError.notFound('Auction not found');
  return auction;
}

async function listAuctions(query) {
  return auctionRepo.list(query);
}

module.exports = {
  createAuction,
  updateAuction,
  cancelAuction,
  getAuction,
  listAuctions,
};
