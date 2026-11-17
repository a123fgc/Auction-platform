const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { signupSchema, loginSchema } = require('../middleware/schemas');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimit');

const router = Router();

router.post('/signup', signupLimiter, validate(signupSchema), authController.signup);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.me);

module.exports = router;
