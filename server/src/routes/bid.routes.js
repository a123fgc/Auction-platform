const { Router } = require('express');
const bidController = require('../controllers/bid.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  bidSchema,
  paginationSchema,
  auctionIdParamSchema,
} = require('../middleware/schemas');
const { bidLimiter } = require('../middleware/rateLimit');

const router = Router();

// Public: bid history for an auction
router.get(
  '/auctions/:auctionId/bids',
  validate.params(auctionIdParamSchema),
  validate.query(paginationSchema),
  bidController.listForAuction
);

// Protected: place bid (buyer or admin)
router.post(
  '/auctions/:auctionId/bids',
  auth,
  requireRole('buyer', 'admin'),
  bidLimiter,
  validate.params(auctionIdParamSchema),
  validate(bidSchema),
  bidController.place
);

// Protected: my bids
router.get(
  '/my-bids',
  auth,
  requireRole('buyer', 'admin'),
  validate.query(paginationSchema),
  bidController.mine
);

module.exports = router;
