const env = require('../../config/env');

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(n));
}

function wonEmail({ name, auctionTitle, auctionUrl, amount, sellerName }) {
  return {
    subject: `🏆 You won "${auctionTitle}"!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
        <h2 style="color:#16a34a">Congratulations, you won!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>You are the winning bidder for <strong>${auctionTitle}</strong>
          at <strong>${fmt(amount)}</strong>.</p>
        <p>Seller <strong>${sellerName || 'the seller'}</strong> will be in touch to arrange payment and delivery.</p>
        <p>
          <a href="${auctionUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
            View auction
          </a>
        </p>
        <p style="color:#64748b;font-size:12px">Thanks for using AuctionHub.</p>
      </div>
    `,
    text: `You won "${auctionTitle}" for ${fmt(amount)}. Seller: ${sellerName}. View: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = wonEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;