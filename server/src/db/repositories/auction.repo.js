const supabase = require('../../config/supabase');

const AUCTION_SELECT = `
  id, seller_id, category_id, title, description, images,
  starting_price, current_price, min_increment,
  starts_at, ends_at, status, winner_id, created_at, updated_at,
  categories ( id, name, slug ),
  users!auctions_seller_id_fkey ( id, full_name )
`;

function nowIso() {
  return new Date().toISOString();
}

async function create(payload) {
  const { data, error } = await supabase
    .from('auctions')
    .insert(payload)
    .select(AUCTION_SELECT)
    .single();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('auctions')
    .select(AUCTION_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function update(id, patch) {
  const { data, error } = await supabase
    .from('auctions')
    .update(patch)
    .eq('id', id)
    .select(AUCTION_SELECT)
    .single();
  if (error) throw error;
  return data;
}

async function list({
  page = 1,
  limit = 12,
  search,
  categoryId,
  status = 'active',
  sellerId,
  sort = 'ending_soon',
}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('auctions')
    .select(AUCTION_SELECT, { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (sellerId) query = query.eq('seller_id', sellerId);
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (sort === 'ending_soon') {
    query = query.order('ends_at', { ascending: true });
  } else if (sort === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'price_asc') {
    query = query.order('current_price', { ascending: true });
  } else if (sort === 'price_desc') {
    query = query.order('current_price', { ascending: false });
  } else {
    query = query.order('ends_at', { ascending: true });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data, total: count, page, limit };
}

async function listExpiredActive() {
  const { data, error } = await supabase
    .from('auctions')
    .select('id, seller_id, winner_id, current_price, title, ends_at')
    .eq('status', 'active')
    .lte('ends_at', nowIso());
  if (error) throw error;
  return data;
}

async function markEnded(id, winnerId) {
  const { data, error } = await supabase
    .from('auctions')
    .update({ status: 'ended', winner_id: winnerId })
    .eq('id', id)
    .eq('status', 'active')
    .select(AUCTION_SELECT)
    .maybeSingle();
  if (error) throw error;
  return data; // null means someone else already closed it
}

async function cancel(id) {
  return update(id, { status: 'cancelled' });
}

module.exports = {
  create,
  findById,
  update,
  list,
  listExpiredActive,
  markEnded,
  cancel,
};