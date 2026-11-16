const { Router } = require('express');
const auctionController = require('../controllers/auction.controller');

const router = Router();

router.get('/', auctionController.list);
router.get('/categories', auctionController.listCategories);
router.get('/:id', auctionController.detail);

module.exports = router;