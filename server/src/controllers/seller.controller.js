const auctionService = require('../services/auction.service');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { uploadFiles } = require('../middleware/upload');
const auctionRepo = require('../db/repositories/auction.repo');


const create = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length > 3) throw ApiError.badRequest('Max 3 images');
  const images = await uploadFiles(files);

  const auction = await auctionService.createAuction(req.user.id, {
    ...req.body,
    images,
  });

  res.status(201).json({ auction });
});

const update = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const newImages = files.length ? await uploadFiles(files) : null;

  const patch = { ...req.body };
  if (newImages) patch.images = newImages;

  const auction = await auctionService.updateAuction(
    req.user,
    req.validatedParams.id,
    patch
  );
  res.json({ auction });
});

const cancel = asyncHandler(async (req, res) => {
  const auction = await auctionService.cancelAuction(req.user, req.validatedParams.id);
  res.json({ auction });
});

const mine = asyncHandler(async (req, res) => {
  const result = await auctionRepo.list({
    page: req.validatedQuery.page,
    limit: req.validatedQuery.limit,
    sellerId: req.user.id,
    status: req.validatedQuery.status || null, // active | ended | cancelled | null=all
    sort: req.validatedQuery.sort,
  });
  res.json(result);
});

module.exports = { create, update, cancel, mine };
