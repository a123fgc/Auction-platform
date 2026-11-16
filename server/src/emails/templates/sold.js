const env = require('../../config/env');

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(n));
}

function soldEmail({ name, auctionTitle, auctionUrl, amount, winnerName }) {
  return {
    subject: `✅ Your item sold: "${auctionTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
        <h2 style="color:#16a34a">Your item sold!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Your auction <strong>${auctionTitle}</strong> ended with a winning
          bid of <strong>${fmt(amount)}</strong> from
          <strong>${winnerName || 'a buyer'}</strong>.</p>
        <p>
          <a href="${auctionUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
            View auction
          </a>
        </p>
        <p style="color:#64748b;font-size:12px">Please reach out to the buyer to finalize the sale.</p>
      </div>
    `,
    text: `Your auction "${auctionTitle}" sold for ${fmt(amount)} to ${winnerName}. View: ${auctionUrl}`,
  };
}

function buildAuctionUrl(id) {
  return `${env.CLIENT_URL}/auctions/${id}`;
}

module.exports = soldEmail;
module.exports.buildAuctionUrl = buildAuctionUrl;