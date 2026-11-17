const statsService = require('../services/stats.service');
const auctionCloseService = require('../services/auctionClose.service');
const auctionRepo = require('../db/repositories/auction.repo');
const userRepo = require('../db/repositories/user.repo');
const supabase = require('../config/supabase');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { containsPattern } = require('../utils/postgrestSearch');
const { disconnectUserSockets } = require('../sockets');

const stats = asyncHandler(async (req, res) => {
  const [overview, recentAuctions, recentBids] = await Promise.all([
    statsService.overview(),
    statsService.recentAuctions(5),
    statsService.recentBids(5),
  ]);
  res.json({ overview, recentAuctions, recentBids });
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, search } = req.validatedQuery;
  const result = await userRepo.listAll({
    page,
    limit,
    role,
    search,
  });
  res.json(result);
});

const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;
  const { suspended } = req.body;
  const target = await userRepo.findById(id);
  if (!target) throw ApiError.notFound('User not found');
  if (target.id === req.user.id) throw ApiError.forbidden('You cannot suspend yourself');
  if (target.role === 'admin') throw ApiError.forbidden('Cannot suspend admin');
  const updated = await userRepo.setSuspended(id, Boolean(suspended));
  if (updated.is_suspended) disconnectUserSockets(updated.id);
  res.json({ user: updated });
});

const listAuctions = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.validatedQuery;

  let query = supabase
    .from('auctions')
    .select(
      'id,title,status,current_price,ends_at,created_at, users!auctions_seller_id_fkey ( full_name )',
      { count: 'exact' }
    );

  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('title', containsPattern(search));

  const from = (page - 1) * limit;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw error;
  res.json({ data, total: count, page, limit });
});

const removeAuction = asyncHandler(async (req, res) => {
  const { id } = req.validatedParams;
  const auction = await auctionRepo.findById(id);
  if (!auction) throw ApiError.notFound('Auction not found');

  const { error } = await supabase.from('auctions').delete().eq('id', id);
  if (error) throw error;

  res.json({ message: 'Auction removed', id });
});

const closeAuction = asyncHandler(async (req, res) => {
  const auction = await auctionRepo.findById(req.validatedParams.id);
  if (!auction) throw ApiError.notFound('Auction not found');
  if (auction.status !== 'active') {
    throw ApiError.badRequest('Auction is not active');
  }

  const closed = await auctionCloseService.closeOne(
    { id: auction.id },
    { force: true }
  );
  if (!closed) throw ApiError.badRequest('Auction could not be closed');
  res.json({ auction: closed });
});

module.exports = {
  stats,
  listUsers,
  suspendUser,
  listAuctions,
  removeAuction,
  closeAuction,
};
