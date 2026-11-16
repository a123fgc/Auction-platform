const { verifyToken } = require('../utils/jwt');
const userRepo = require('../db/repositories/user.repo');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { asyncHandler } = require('./errorHandler');

const auth = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies[env.COOKIE_NAME]) {
    token = req.cookies[env.COOKIE_NAME];
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) throw ApiError.unauthorized('Not authenticated');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await userRepo.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.is_suspended) throw ApiError.forbidden('Account suspended');

  req.user = user;
  next();
});

module.exports = auth;