const env = require('../../config/env');
const { escapeHtml, safeSubject } = require('../escapeHtml');

function auctionCancelledEmail({ name, auctionTitle, auctionUrl }) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(auctionTitle);
  const safeUrl = escapeHtml(auctionUrl);
  const subjectTitle = safeSubject(auctionTitle).slice(0, 150);

  return {
    subject: `Auction cancelled: "${subjectTitle}"`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="color:#b45309">Auction cancelled</h2>
      <p>Hi ${safeName},</p>
      <p>The auction <strong>${safeTitle}</strong> that you bid on has been cancelled.</p>
      <p><a href="${safeUrl}">View auction</a></p>
    </div>`,
    text: `The auction "${safeSubject(auctionTitle)}" that you bid on has been cancelled. View: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = auctionCancelledEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;
