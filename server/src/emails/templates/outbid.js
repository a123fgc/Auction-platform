const env = require('../../config/env');
const { escapeHtml, safeSubject } = require('../escapeHtml');

function outbidEmail({ name, auctionTitle, auctionUrl, newAmount, currentAmount }) {
  const fmt = (n) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(n));
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(auctionTitle);
  const safeUrl = escapeHtml(auctionUrl);

  return {
    subject: `You've been outbid on "${safeSubject(auctionTitle)}"`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="color:#4f46e5">You've been outbid!</h2>
      <p>Hi ${safeName},</p>
      <p>Your bid of <strong>${fmt(newAmount)}</strong> on <strong>${safeTitle}</strong> has been outbid.
      Current price is now <strong>${fmt(currentAmount)}</strong>.</p>
      <p><a href="${safeUrl}">Bid again</a></p>
      <p style="color:#64748b;font-size:12px">You're receiving this because you placed a bid.</p>
    </div>`,
    text: `You've been outbid on "${safeSubject(auctionTitle)}". Current price: ${fmt(currentAmount)}. Bid again: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = outbidEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;
