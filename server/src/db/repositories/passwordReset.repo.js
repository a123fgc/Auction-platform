const supabase = require('../../config/supabase');

async function create({ userId, tokenHash, expiresAt }) {
  // Invalidate any previous unused tokens for this user
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null);

  const { data, error } = await supabase
    .from('password_reset_tokens')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select('id, expires_at')
    .single();
  if (error) throw error;
  return data;
}

async function findValidByHash(tokenHash) {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function markUsed(id) {
  const { error } = await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

async function deleteExpired() {
  const { error } = await supabase
    .from('password_reset_tokens')
    .delete()
    .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (error) throw error;
}

module.exports = {
  create,
  findValidByHash,
  markUsed,
  deleteExpired,
};