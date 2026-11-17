const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  adminUserListQuerySchema,
  adminAuctionListQuerySchema,
  suspendUserSchema,
  idParamSchema,
} = require('../middleware/schemas');

const router = Router();

router.use(auth, requireRole('admin'));

router.get('/stats', adminController.stats);
router.get(
  '/users',
  validate.query(adminUserListQuerySchema),
  adminController.listUsers
);
router.patch(
  '/users/:id/suspend',
  validate.params(idParamSchema),
  validate(suspendUserSchema),
  adminController.suspendUser
);
router.get(
  '/auctions',
  validate.query(adminAuctionListQuerySchema),
  adminController.listAuctions
);
router.post(
  '/auctions/:id/close',
  validate.params(idParamSchema),
  adminController.closeAuction
);
router.delete(
  '/auctions/:id',
  validate.params(idParamSchema),
  adminController.removeAuction
);

module.exports = router;
