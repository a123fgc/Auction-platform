const env = require('../../config/env');
const { escapeHtml, safeSubject } = require('../escapeHtml');

function auctionEndedEmail({ name, auctionTitle, auctionUrl }) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(auctionTitle);
  const safeUrl = escapeHtml(auctionUrl);
  return {
    subject: `Auction ended without a winner: "${safeSubject(auctionTitle)}"`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="color:#64748b">Auction ended</h2>
      <p>Hi ${safeName},</p>
      <p>Your auction <strong>${safeTitle}</strong> ended without any bids.</p>
      <p><a href="${safeUrl}">View auction</a></p>
    </div>`,
    text: `Your auction "${safeSubject(auctionTitle)}" ended with no bids. View: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = auctionEndedEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;
