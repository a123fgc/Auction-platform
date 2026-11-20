const bcrypt = require('bcryptjs');
const userRepo = require('../db/repositories/user.repo');
const { uploadFiles } = require('../middleware/upload');
const ApiError = require('../utils/ApiError');

const BCRYPT_ROUNDS = 10;

async function updateProfile(userId, payload, files = []) {
  const patch = {};

  // Only copy fields that were provided
  if (payload.full_name !== undefined) patch.full_name = payload.full_name.trim();
  if (payload.bio !== undefined) patch.bio = payload.bio?.trim() || null;
  if (payload.phone !== undefined) patch.phone = payload.phone?.trim() || null;
  if (payload.location !== undefined) patch.location = payload.location?.trim() || null;
  if (payload.website !== undefined) patch.website = payload.website?.trim() || null;

  // If an avatar file was uploaded, push to Cloudinary and store URL
  if (files.length > 0) {
    const urls = await uploadFiles(files, 'auction-platform/profiles');
    patch.avatar_url = urls[0];
  }

  if (Object.keys(patch).length === 0) {
    throw ApiError.badRequest('No fields to update');
  }

  const updated = await userRepo.updateProfile(userId, patch);
  return updated;
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userRepo.findByEmailById?.(userId); // helper
  // The findByEmail returns full user — but we need password_hash
  // Simpler: fetch via raw query

  const supabase = require('../config/supabase');
  const { data: row, error } = await supabase
    .from('users')
    .select('id,password_hash')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw ApiError.notFound('User not found');

  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different');
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userRepo.updatePasswordAndRevoke(userId, hash);
  return { message: 'Password updated' };
}

async function getPublicProfile(userId) {
  const user = await userRepo.getPublicProfile(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

module.exports = { updateProfile, changePassword, getPublicProfile };
