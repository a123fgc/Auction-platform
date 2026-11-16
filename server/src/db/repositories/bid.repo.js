const supabase = require('../../config/supabase');

const BID_SELECT = `
  id, auction_id, bidder_id, amount, created_at,
  users!bids_bidder_id_fkey ( id, full_name )
`;

async function placeBidRpc({ auctionId, bidderId, amount }) {
  const { data, error } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_bidder_id: bidderId,
    p_amount: amount,
  });
  if (error) {
    // Map Postgres RAISE messages to friendly codes
    const msg = error.message || '';
    if (msg.includes('AUCTION_NOT_FOUND'))
      throw Object.assign(new Error('Auction not found'), { code: 'AUCTION_NOT_FOUND' });
    if (msg.includes('AUCTION_NOT_ACTIVE'))
      throw Object.assign(new Error('Auction is not active'), { code: 'AUCTION_NOT_ACTIVE' });
    if (msg.includes('AUCTION_ENDED'))
      throw Object.assign(new Error('Auction has ended'), { code: 'AUCTION_ENDED' });
    if (msg.includes('SELLER_CANNOT_BID'))
      throw Object.assign(new Error('You cannot bid on your own auction'), { code: 'SELLER_CANNOT_BID' });
    if (msg.includes('BID_TOO_LOW'))
      throw Object.assign(new Error('Bid is too low'), { code: 'BID_TOO_LOW' });
    throw error;
  }
  return data;
}

async function listForAuction(auctionId, { page = 1, limit = 20 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from('bids')
    .select(BID_SELECT, { count: 'exact' })
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data, total: count, page, limit };
}

async function listForBidder(bidderId, { page = 1, limit = 20 } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from('bids')
    .select(
      `
      id, auction_id, amount, created_at,
      auctions!bids_auction_id_fkey (
        id, title, images, current_price, ends_at, status, winner_id
      )
    `,
      { count: 'exact' }
    )
    .eq('bidder_id', bidderId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data, total: count, page, limit };
}

async function highestBidder(auctionId) {
  const { data, error } = await supabase
    .from('bids')
    .select('bidder_id, amount, users!bids_bidder_id_fkey ( email, full_name )')
    .eq('auction_id', auctionId)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function previousHighestBidder(auctionId, beforeIso) {
  // Highest bid strictly before `beforeIso` (used to detect who to notify)
  const { data, error } = await supabase
    .from('bids')
    .select('bidder_id, users!bids_bidder_id_fkey ( email, full_name )')
    .eq('auction_id', auctionId)
    .lt('created_at', beforeIso)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = {
  placeBidRpc,
  listForAuction,
  listForBidder,
  highestBidder,
  previousHighestBidder,
};