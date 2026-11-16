const env = require('../../config/env');

function auctionEndedEmail({ name, auctionTitle, auctionUrl }) {
  return {
    subject: `Auction ended without a winner: "${auctionTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
        <h2 style="color:#64748b">Auction ended</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your auction <strong>${auctionTitle}</strong> ended without any bids.</p>
        <p>
          <a href="${auctionUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
            View auction
          </a>
        </p>
      </div>
    `,
    text: `Your auction "${auctionTitle}" ended with no bids. View: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = auctionEndedEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;