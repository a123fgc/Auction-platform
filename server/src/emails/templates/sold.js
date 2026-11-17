const env = require('../../config/env');
const { escapeHtml, safeSubject } = require('../escapeHtml');

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(n));
}

function soldEmail({ name, auctionTitle, auctionUrl, amount, winnerName }) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(auctionTitle);
  const safeUrl = escapeHtml(auctionUrl);
  const safeWinner = escapeHtml(winnerName || 'a buyer');
  return {
    subject: `Your item sold: "${safeSubject(auctionTitle)}"`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="color:#16a34a">Your item sold!</h2>
      <p>Hi ${safeName},</p>
      <p>Your auction <strong>${safeTitle}</strong> ended with a winning bid of <strong>${fmt(amount)}</strong> from <strong>${safeWinner}</strong>.</p>
      <p><a href="${safeUrl}">View auction</a></p>
      <p style="color:#64748b;font-size:12px">Please reach out to the buyer to finalize the sale.</p>
    </div>`,
    text: `Your auction "${safeSubject(auctionTitle)}" sold for ${fmt(amount)} to ${winnerName || 'a buyer'}. View: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = soldEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;
