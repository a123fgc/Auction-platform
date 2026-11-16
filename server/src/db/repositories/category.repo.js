const supabase = require('../../config/supabase');

async function listAll() {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,slug')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,slug')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = { listAll, findById };