const bcrypt = require('bcryptjs');
const userRepo = require('../db/repositories/user.repo');
const prtRepo = require('../db/repositories/passwordReset.repo');
const emailService = require('./email.service');
const passwordResetEmail = require('../emails/templates/passwordReset');
const { generateResetToken, hashToken } = require('../utils/resetToken');
const ApiError = require('../utils/ApiError');

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL_MINUTES = 15;

/**
 * Always returns success message — prevents email enumeration.
 * If email doesn't exist, still pretend success (but don't send email).
 */
async function requestReset(email) {
  const user = await userRepo.findByEmail(email);

  if (!user) {
    // Silent — same generic response to caller
    return { message: 'If that email exists, a reset link has been sent.' };
  }
  if (user.is_suspended) {
    // Don't reveal suspension status — silent
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  const { raw, hash } = generateResetToken();
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_MINUTES * 60 * 1000
  ).toISOString();

  await prtRepo.create({ userId: user.id, tokenHash: hash, expiresAt });

  const resetUrl = passwordResetEmail.buildResetUrl(raw);
  const tpl = passwordResetEmail({
    name: user.full_name,
    resetUrl,
    expiresInMinutes: TOKEN_TTL_MINUTES,
  });

  // Fire-and-forget
  emailService.send({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  return { message: 'If that email exists, a reset link has been sent.' };
}

async function verifyToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16) {
    return { valid: false, reason: 'Invalid token' };
  }
  const hash = hashToken(rawToken);
  const row = await prtRepo.findValidByHash(hash);

  if (!row) return { valid: false, reason: 'Invalid token' };
  if (row.used_at) return { valid: false, reason: 'Token already used' };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'Token expired' };
  }
  return { valid: true, userId: row.user_id, tokenId: row.id };
}

async function resetPassword(rawToken, newPassword) {
  const v = await verifyToken(rawToken);
  if (!v.valid) {
    throw ApiError.badRequest(v.reason);
  }
  if (!newPassword || newPassword.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 chars');
  }

  const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userRepo.updatePassword(v.userId, password_hash);
  await prtRepo.markUsed(v.tokenId);

  return { message: 'Password updated successfully' };
}

module.exports = { requestReset, verifyToken, resetPassword };