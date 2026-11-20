const profileService = require('../services/profile.service');
const { asyncHandler } = require('../middleware/errorHandler');
const { disconnectUserSockets } = require('../sockets');

const updateMe = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const user = await profileService.updateProfile(
    req.user.id,
    req.body,
    files
  );
  res.json({ user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const result = await profileService.changePassword(
    req.user.id,
    current_password,
    new_password
  );
  disconnectUserSockets(req.user.id);
  res.json(result);
});

const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await profileService.getPublicProfile(req.params.id);
  res.json({ user });
});

module.exports = { updateMe, changePassword, getPublicProfile };