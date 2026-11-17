const nodemailer = require('nodemailer');
const env = require('../config/env');
const supabase = require('../config/supabase');
const auctionCancelledEmail = require('../emails/templates/auctionCancelled');
const outbidEmail = require('../emails/templates/outbid');
const wonEmail = require('../emails/templates/won');
const soldEmail = require('../emails/templates/sold');
const auctionEndedEmail = require('../emails/templates/auctionEnded');

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 10;
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP.host || !env.SMTP.user) {
    if (env.NODE_ENV === 'development') {
      transporter = {
        sendMail: async ({ to, subject }) => {
          console.log('[email:dev]', to, '|', subject);
          return { messageId: 'dev' };
        },
      };
      return transporter;
    }
    throw new Error('SMTP is not configured');
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP.host,
    port: env.SMTP.port,
    secure: env.SMTP.port === 465,
    auth: { user: env.SMTP.user, pass: env.SMTP.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 60_000,
  });
  return transporter;
}

function toOutboxRow({ to, subject, html, text }) {
  return {
    recipient: to,
    template_key: 'raw',
    subject,
    html_body: html,
    text_body: text || null,
  };
}

async function sendMany(messages = []) {
  if (!messages.length) return 0;

  try {
    const { data, error } = await supabase
      .from('email_outbox')
      .insert(messages.map(toOutboxRow))
      .select('id');
    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('[email] failed to enqueue messages:', error.message);
    return 0;
  }
}

async function send(message) {
  return (await sendMany([message])) === 1;
}

async function markSent(id) {
  const { error } = await supabase
    .from('email_outbox')
    .update({ status: 'sent', sent_at: new Date().toISOString(), locked_at: null, last_error: null })
    .eq('id', id)
    .eq('status', 'processing');
  if (error) throw error;
}

async function scheduleRetry(row, error) {
  const isDead = row.attempts >= MAX_ATTEMPTS;
  const delayMs = Math.min(30_000 * (2 ** Math.max(0, row.attempts - 1)), 6 * 60 * 60 * 1000);
  const update = {
    status: isDead ? 'dead' : 'pending',
    locked_at: null,
    next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
    last_error: String(error.message || error).slice(0, 1000),
  };
  const { error: updateError } = await supabase
    .from('email_outbox')
    .update(update)
    .eq('id', row.id)
    .eq('status', 'processing');
  if (updateError) throw updateError;

  console.error(`[email] delivery failed for outbox item ${row.id} (attempt ${row.attempts}/${MAX_ATTEMPTS}, ${isDead ? 'dead' : 'retry scheduled'}): ${error.code || error.name || 'delivery error'}`);
}

function buildMessage(row) {
  if (row.template_key === 'raw') {
    return { to: row.recipient, subject: row.subject, html: row.html_body, text: row.text_body };
  }
  const payload = row.payload || {};
  const templateByKey = {
    outbid: () => outbidEmail({
      ...payload,
      auctionUrl: outbidEmail.buildAuctionUrl(payload.auctionId),
    }),
    auction_won: () => wonEmail({
      ...payload,
      auctionUrl: wonEmail.buildAuctionUrl(payload.auctionId),
    }),
    auction_sold: () => soldEmail({
      ...payload,
      auctionUrl: soldEmail.buildAuctionUrl(payload.auctionId),
    }),
    auction_ended: () => auctionEndedEmail({
      ...payload,
      auctionUrl: auctionEndedEmail.buildAuctionUrl(payload.auctionId),
    }),
    auction_cancelled: () => auctionCancelledEmail({
      ...payload,
      auctionUrl: auctionCancelledEmail.buildAuctionUrl(payload.auctionId),
    }),
  };
  if (templateByKey[row.template_key]) {
    return { to: row.recipient, ...templateByKey[row.template_key]() };
  }
  throw new Error(`Unsupported email template: ${row.template_key}`);
}

async function processBatch() {
  const { data, error } = await supabase.rpc('claim_email_outbox', {
    p_batch_size: BATCH_SIZE,
  });
  if (error) throw error;

  let processed = 0;
  for (const row of data || []) {
    try {
      await getTransporter().sendMail({ from: env.SMTP.from, ...buildMessage(row) });
      await markSent(row.id);
    } catch (deliveryError) {
      try {
        await scheduleRetry(row, deliveryError);
      } catch (queueError) {
        console.error(`[email] could not update outbox item ${row.id}:`, queueError.message);
      }
    }
    processed += 1;
  }
  return processed;
}

module.exports = { send, sendMany, processBatch };
