const supabase = require('../../config/supabase');
const { quoteFilterValue, escapeLikePattern } = require('../../utils/postgrestSearch');

async function findByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,full_name,role,is_suspended,session_version,created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function create({ email, password_hash, full_name, role = 'buyer' }) {
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash, full_name, role })
    .select('id,email,full_name,role,session_version,created_at')
    .single();
  if (error) throw error;
  return data;
}

async function listAll({ page = 1, limit = 20, role, search }) {
  let query = supabase
    .from('users')
    .select('id,email,full_name,role,is_suspended,created_at', { count: 'exact' });

  if (role) query = query.eq('role', role);
  if (search) {
    const pattern = quoteFilterValue(`%${escapeLikePattern(search)}%`);
    query = query.or(`email.ilike.${pattern},full_name.ilike.${pattern}`);
  }

  const from = (page - 1) * limit;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) throw error;
  return { data, total: count };
}

async function setSuspended(id, is_suspended) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_suspended })
    .eq('id', id)
    .select('id,email,full_name,role,is_suspended')
    .single();
  if (error) throw error;
  return data;
}

async function revokeSessions(id, currentVersion) {
  const { error } = await supabase
    .from('users')
    .update({ session_version: currentVersion + 1 })
    .eq('id', id);
  if (error) throw error;
}

module.exports = { findByEmail, findById, create, listAll, setSuspended, revokeSessions };
