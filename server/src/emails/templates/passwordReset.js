const env = require('../../config/env');

function passwordResetEmail({ name, resetUrl, expiresInMinutes = 15 }) {
  return {
    subject: 'Reset your AuctionHub password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
        <h2 style="color:#1d4ed8">Reset your password</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your AuctionHub password. Click the button below to set a new password:</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${resetUrl}"
             style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">
          This link will expire in ${expiresInMinutes} minutes and can only be used once.
        </p>
        <p style="color:#64748b;font-size:13px">
          If you didn't request a password reset, you can safely ignore this email. Your password will not change.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
        <p style="color:#94a3b8;font-size:12px">
          If the button doesn't work, copy and paste this URL into your browser:<br/>
          <a href="${resetUrl}" style="color:#1d4ed8;word-break:break-all">${resetUrl}</a>
        </p>
      </div>
    `,
    text: `Reset your AuctionHub password (expires in ${expiresInMinutes} min): ${resetUrl}`,
  };
}

function buildResetUrl(rawToken) {
  return `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
}

module.exports = passwordResetEmail;
module.exports.buildResetUrl = buildResetUrl;