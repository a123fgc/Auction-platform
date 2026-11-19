const crypto = require('crypto');

/**
 * Generate a cryptographically random reset token.
 * Returns { raw, hash } — raw goes to email, hash goes to DB.
 */
function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex'); // 64 chars
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { generateResetToken, hashToken };