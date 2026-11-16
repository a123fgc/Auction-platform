const { closeExpiredAuctions } = require('../services/auctionClose.service');

const INTERVAL_MS = 20_000; // 20 seconds

let timer = null;
let running = false;

async function tick() {
  if (running) return; // prevent overlapping runs
  running = true;
  try {
    await closeExpiredAuctions();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[closeAuctions.job] error:', err.message);
  } finally {
    running = false;
  }
}

function start() {
  if (timer) return;
  // Run once shortly after startup, then every interval
  setTimeout(tick, 5_000);
  timer = setInterval(tick, INTERVAL_MS);
  // eslint-disable-next-line no-console
  console.log(`[closeAuctions.job] started (every ${INTERVAL_MS / 1000}s)`);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop };