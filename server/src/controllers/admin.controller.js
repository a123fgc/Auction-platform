const statsService = require('../services/stats.service');
const auctionCloseService = require('../services/auctionClose.service');
const auctionRepo = require('../db/repositories/auction.repo');
const userRepo = require('../db/repositories/user.repo');
const supabase = require('../config/supabase');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const stats = asyncHandler(async (req, res) => {
  const [overview, recentAuctions, recentBids] = await Promise.all([
    statsService.overview(),
    statsService.recentAuctions(5),
    statsService.recentBids(5),
  ]);
  res.json({ overview, recentAuctions, recentBids });
});

const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const result = await userRepo.listAll({
    page: Number(page),
    limit: Math.min(Number(limit), 50),
    role,
    search,
  });
  res.json(result);
});

const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { suspended = true } = req.body;
  const target = await userRepo.findById(id);
  if (!target) throw ApiError.notFound('User not found');
  if (target.role === 'admin') throw ApiError.forbidden('Cannot suspend admin');
  const updated = await userRepo.setSuspended(id, Boolean(suspended));
  res.json({ user: updated });
});

const listAuctions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  let query = supabase
    .from('auctions')
    .select(
      'id,title,status,current_price,ends_at,created_at, users!auctions_seller_id_fkey ( full_name )',
      { count: 'exact' }
    );

  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('title', `%${search}%`);

  const from = (Number(page) - 1) * Number(limit);
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + Number(limit) - 1);

  if (error) throw error;
  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
});

const removeAuction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const auction = await auctionRepo.findById(id);
  if (!auction) throw ApiError.notFound('Auction not found');

  const { error } = await supabase.from('auctions').delete().eq('id', id);
  if (error) throw error;

  res.json({ message: 'Auction removed', id });
});

const closeAuction = asyncHandler(async (req, res) => {
  const auction = await auctionRepo.findById(req.params.id);
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