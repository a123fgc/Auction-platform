const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths jahan CSRF check nahi chahiye (server-to-server)
const CSRF_EXEMPT_PATHS = [
  '/api/webhooks',  // Supabase webhooks
  '/api/jobs',      // Vercel cron (authenticated by CRON_SECRET)
];

function csrfProtection(req, res, next) {
  // Safe methods skip
  if (SAFE_METHODS.has(req.method)) return next();

  // Webhook paths skip (server-to-server, no Origin header)
  if (CSRF_EXEMPT_PATHS.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const origin = req.get('origin');
  if (!origin || origin === 'null' || !env.CLIENT_ORIGINS.includes(origin)) {
    return next(ApiError.forbidden('Request origin is not allowed'));
  }

  next();
}

module.exports = csrfProtection;