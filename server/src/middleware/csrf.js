const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin || origin === 'null' || !env.CLIENT_ORIGINS.includes(origin)) {
    return next(ApiError.forbidden('Request origin is not allowed'));
  }

  next();
}

module.exports = csrfProtection;
