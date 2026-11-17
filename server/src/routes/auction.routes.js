const { Router } = require('express');
const auctionController = require('../controllers/auction.controller');
const validate = require('../middleware/validate');
const { auctionListQuerySchema, idParamSchema } = require('../middleware/schemas');

const router = Router();

router.get('/', validate.query(auctionListQuerySchema), auctionController.list);
router.get('/categories', auctionController.listCategories);
router.get('/:id', validate.params(idParamSchema), auctionController.detail);

module.exports = router;
