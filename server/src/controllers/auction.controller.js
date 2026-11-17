const auctionService = require('../services/auction.service');
const categoryRepo = require('../db/repositories/category.repo');
const { asyncHandler } = require('../middleware/errorHandler');

const list = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    search,
    category,
    sort,
  } = req.validatedQuery;

  const result = await auctionService.listAuctions({
    page,
    limit,
    search,
    categoryId: category || undefined,
    status: 'active',
    sort: sort || 'ending_soon',
  });

  res.json(result);
});

const detail = asyncHandler(async (req, res) => {
  const auction = await auctionService.getAuction(req.validatedParams.id);
  res.json({ auction });
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryRepo.listAll();
  res.json({ categories });
});

module.exports = { list, detail, listCategories };
