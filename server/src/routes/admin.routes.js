const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = Router();

router.use(auth, requireRole('admin'));

router.get('/stats', adminController.stats);
router.get('/users', adminController.listUsers);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.get('/auctions', adminController.listAuctions);
router.post('/auctions/:id/close', adminController.closeAuction);
router.delete('/auctions/:id', adminController.removeAuction);

module.exports = router;