const auctionRepo = require('../db/repositories/auction.repo');
const bidRepo = require('../db/repositories/bid.repo');
const userRepo = require('../db/repositories/user.repo');
const emailService = require('./email.service');
const wonEmail = require('../emails/templates/won');
const soldEmail = require('../emails/templates/sold');
const auctionEndedEmail = require('../emails/templates/auctionEnded');
const { emitAuctionEnded } = require('../sockets');

/**
 * Close a single auction.
 * @param {object} auction - object with at least { id }
 * @param {object} opts    - { force?: boolean }  (force = admin override)
 * Returns the closed auction or null if it was already closed / not yet expired.
 */
async function closeOne(auction, { force = false } = {}) {
  const fresh = await auctionRepo.findById(auction.id);
  if (!fresh || fresh.status !== 'active') return null;

  // Unless forced, skip auctions that haven't actually expired yet
  if (!force && new Date(fresh.ends_at).getTime() > Date.now()) return null;

  // Find highest bidder (may be null if no bids)
  const top = await bidRepo.highestBidder(auction.id);
  const winnerId = top?.bidder_id || null;

  // Atomic close: only succeeds if still 'active' (idempotent)
  const closed = await auctionRepo.markEnded(auction.id, winnerId);
  if (!closed) return null; // lost the race — someone else closed it

  // Fetch users for emails
  const [winner, seller] = await Promise.all([
    winnerId ? userRepo.findById(winnerId) : null,
    userRepo.findById(fresh.seller_id),
  ]);

  const auctionUrl = wonEmail.buildAuctionUrl(auction.id);

  if (winnerId && top) {
    if (winner?.email) {
      const tpl = wonEmail({
        name: winner.full_name,
        auctionTitle: fresh.title,
        auctionUrl,
        amount: top.amount,
        sellerName: seller?.full_name,
      });
      await emailService.send({
        to: winner.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    }
    if (seller?.email) {
      const tpl = soldEmail({
        name: seller.full_name,
        auctionTitle: fresh.title,
        auctionUrl,
        amount: top.amount,
        winnerName: winner?.full_name,
      });
      await emailService.send({
        to: seller.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    }
  } else if (seller?.email) {
    const tpl = auctionEndedEmail({
      name: seller.full_name,
      auctionTitle: fresh.title,
      auctionUrl,
    });
    await emailService.send({
      to: seller.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  }

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