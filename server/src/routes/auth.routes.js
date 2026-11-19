const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../middleware/schemas");
const {
  loginLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} = require("../middleware/rateLimit");

const router = Router();

router.post(
  "/signup",
  signupLimiter,
  validate(signupSchema),
  authController.signup,
);
router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  authController.login,
);
router.post("/logout", auth, authController.logout);
router.get("/me", auth, authController.me);
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.get('/reset-password/verify', authController.verifyResetToken);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

module.exports = router;
