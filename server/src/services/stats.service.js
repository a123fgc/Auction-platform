const supabase = require('../config/supabase');

async function overview() {
  const [users, auctions, bids, activeAuctions, endedAuctions, suspendedUsers] =
    await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('auctions').select('id', { count: 'exact', head: true }),
      supabase.from('bids').select('id', { count: 'exact', head: true }),
      supabase
        .from('auctions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('auctions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ended'),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_suspended', true),
    ]);

  const { data: revenueRows, error: revErr } = await supabase
    .from('auctions')
    .select('current_price')
    .eq('status', 'ended')
    .not('winner_id', 'is', null);
  if (revErr) throw revErr;

  const totalRevenue = revenueRows.reduce(
    (sum, row) => sum + Number(row.current_price || 0),
    0
  );

  return {
    totalUsers: users.count || 0,
    suspendedUsers: suspendedUsers.count || 0,
    totalAuctions: auctions.count || 0,
    activeAuctions: activeAuctions.count || 0,
    endedAuctions: endedAuctions.count || 0,
    totalBids: bids.count || 0,
    totalRevenue,
  };
}

async function recentAuctions(limit = 5) {
  const { data, error } = await supabase
    .from('auctions')
    .select(
      'id,title,status,current_price,ends_at,created_at, users!auctions_seller_id_fkey ( full_name )'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

async function recentBids(limit = 5) {
  const { data, error } = await supabase
    .from('bids')
    .select(
      'id,amount,created_at, users!bids_bidder_id_fkey ( full_name ), auctions!bids_auction_id_fkey ( title )'
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

module.exports = { overview, recentAuctions, recentBids };