const { Router } = require('express');
const profileController = require('../controllers/profile.controller');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadArray } = require('../middleware/upload');
const {
  profileUpdateSchema,
  passwordChangeSchema,
} = require('../middleware/schemas');

const router = Router();

// Public profile (anyone can view)
router.get('/users/:id/profile', profileController.getPublicProfile);

// Update own profile (any authenticated user — buyer/seller/admin)
router.patch(
  '/me/profile',
  auth,
  uploadArray, // accepts 'images' field, max 3, we use first as avatar
  validate(profileUpdateSchema),
  profileController.updateMe
);

// Change own password
router.patch(
  '/me/password',
  auth,
  validate(passwordChangeSchema),
  profileController.changePassword
);

module.exports = router;