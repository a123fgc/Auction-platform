const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(`[error] ${status} ${message}`, err.details || '');
  }

  res.status(status).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, notFoundHandler, asyncHandler, ApiError };