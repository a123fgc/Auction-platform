const auctionService = require('../services/auction.service');
const categoryRepo = require('../db/repositories/category.repo');
const { asyncHandler } = require('../middleware/errorHandler');

const list = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    search,
    category,
    sort,
  } = req.query;

  const result = await auctionService.listAuctions({
    page: Number(page),
    limit: Math.min(Number(limit), 48),
    search,
    categoryId: category || undefined,
    status: 'active',
    sort: sort || 'ending_soon',
  });

  res.json(result);
});

const detail = asyncHandler(async (req, res) => {
  const auction = await auctionService.getAuction(req.params.id);
  res.json({ auction });
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryRepo.listAll();
  res.json({ categories });
});

module.exports = { list, detail, listCategories };