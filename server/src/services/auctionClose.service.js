const auctionRepo = require('../db/repositories/auction.repo');
const { emitAuctionEnded } = require('../sockets');

/**
 * Close a single auction.
 * @param {object} auction - object with at least { id }
 * @param {object} opts    - { force?: boolean }  (force = admin override)
 * Returns the closed auction or null if it was already closed / not yet expired.
 */
async function closeOne(auction, { force = false } = {}) {
  // The RPC locks the row, closes atomically, and queues its emails in the same transaction.
  const closedRecord = await auctionRepo.closeAtomic(auction.id, force);
  if (!closedRecord) return null;
  const closed = await auctionRepo.findById(closedRecord.id) || closedRecord;
  const winnerId = closedRecord.winner_id || null;

  // Broadcast to live viewers
  emitAuctionEnded(auction.id, {
    auctionId: auction.id,
    winnerId,
    finalPrice: Number(closed.current_price),
  });

  return closed;
}

async function closeExpiredAuctions() {
  const expired = await auctionRepo.listExpiredActive();
  let closed = 0;
  for (const a of expired) {
    try {
      const result = await closeOne(a);
      if (result) closed += 1;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[closeAuctions] failed for ${a.id}:`, err.message);
    }
  }
  if (closed > 0) {
    // eslint-disable-next-line no-console
    console.log(`[closeAuctions] closed ${closed} auction(s)`);
  }
  return closed;
}

module.exports = { closeOne, closeExpiredAuctions };
