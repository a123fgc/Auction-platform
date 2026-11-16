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
    req.params.id,
    patch
  );
  res.json({ auction });
});

const cancel = asyncHandler(async (req, res) => {
  const auction = await auctionService.cancelAuction(req.user, req.params.id);
  res.json({ auction });
});

const mine = asyncHandler(async (req, res) => {
  const result = await auctionRepo.list({
    page: Number(req.query.page || 1),
    limit: Math.min(Number(req.query.limit || 12), 48),
    sellerId: req.user.id,
    status: req.query.status || null, // active | ended | cancelled | null=all
    sort: req.query.sort || 'newest',
  });
  res.json(result);
});

module.exports = { create, update, cancel, mine };