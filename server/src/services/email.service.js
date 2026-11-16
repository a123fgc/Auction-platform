const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP.host || !env.SMTP.user) {
    // Dev fallback: log emails instead of sending
    transporter = {
      sendMail: async (opts) => {
        // eslint-disable-next-line no-console
        console.log('[email:dev]', opts.to, '|', opts.subject);
        return { messageId: 'dev' };
      },
    };
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP.host,
    port: env.SMTP.port,
    secure: env.SMTP.port === 465,
    auth: { user: env.SMTP.user, pass: env.SMTP.pass },
  });
  return transporter;
}

async function send({ to, subject, html, text }) {
  try {
    const t = getTransporter();
    await t.sendMail({ from: env.SMTP.from, to, subject, html, text });
  } catch (err) {
    // Never let email failures break the request
    // eslint-disable-next-line no-console
    console.error('[email] send failed:', err.message);
  }
}

module.exports = { send };