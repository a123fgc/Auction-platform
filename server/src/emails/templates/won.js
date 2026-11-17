const env = require('../../config/env');
const { escapeHtml, safeSubject } = require('../escapeHtml');

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(n));
}

function wonEmail({ name, auctionTitle, auctionUrl, amount, sellerName }) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(auctionTitle);
  const safeUrl = escapeHtml(auctionUrl);
  const safeSeller = escapeHtml(sellerName || 'the seller');
  return {
    subject: `You won "${safeSubject(auctionTitle)}"!`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="color:#16a34a">Congratulations, you won!</h2>
      <p>Hi ${safeName},</p>
      <p>You are the winning bidder for <strong>${safeTitle}</strong> at <strong>${fmt(amount)}</strong>.</p>
      <p>Seller <strong>${safeSeller}</strong> will be in touch to arrange payment and delivery.</p>
      <p><a href="${safeUrl}">View auction</a></p>
      <p style="color:#64748b;font-size:12px">Thanks for using AuctionHub.</p>
    </div>`,
    text: `You won "${safeSubject(auctionTitle)}" for ${fmt(amount)}. Seller: ${sellerName || 'the seller'}. View: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = wonEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;
