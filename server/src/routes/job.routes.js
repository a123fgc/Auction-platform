const express = require('express');
const crypto = require('node:crypto');
const closeAuctionsJob = require('../jobs/closeAuctions.job');
const emailOutboxJob = require('../jobs/emailOutbox.job');

const router = express.Router();

function authorized(req) {
  const configuredSecret = process.env.CRON_SECRET;
  if (typeof configuredSecret !== 'string' || configuredSecret.length === 0) {
    return false;
  }

  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const supplied = match?.[1] || req.get('x-cron-secret') || '';
  if (
    typeof supplied !== 'string'
    || supplied.length !== configuredSecret.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(supplied, 'utf8'),
    Buffer.from(configuredSecret, 'utf8')
  );
}

router.use((req, res, next) => {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

router.post('/close-auctions', async (req, res, next) => {
  try {
    const closed = await closeAuctionsJob.tick();
    res.json({ closed });
  } catch (error) {
    next(error);
  }
});

router.post('/process-email-outbox', async (req, res, next) => {
  try {
    const processed = await emailOutboxJob.tick();
    res.json({ processed });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
