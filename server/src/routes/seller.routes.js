const { Router } = require('express');
const sellerController = require('../controllers/seller.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  auctionCreateSchema,
  auctionUpdateSchema,
  sellerAuctionListQuerySchema,
  idParamSchema,
} = require('../middleware/schemas');
const { uploadArray } = require('../middleware/upload');


const router = Router();

router.use(auth, requireRole('seller', 'admin'));

router.get(
  '/auctions',
  validate.query(sellerAuctionListQuerySchema),
  sellerController.mine
);
router.post(
  '/auctions',
  uploadArray,
  validate(auctionCreateSchema),
  sellerController.create
);
router.patch(
  '/auctions/:id',
  validate.params(idParamSchema),
  uploadArray,
  validate(auctionUpdateSchema),
  sellerController.update
);
router.delete(
  '/auctions/:id',
  validate.params(idParamSchema),
  sellerController.cancel
);

module.exports = router;
