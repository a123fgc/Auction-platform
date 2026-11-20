const { closeExpiredAuctions } = require('../services/auctionClose.service');

const INTERVAL_MS = 20_000; // 20 seconds

let timer = null;
let startupTimer = null;
let running = false;
let currentTick = null;

async function tick() {
  if (running) return currentTick; // prevent overlapping runs
  running = true;
  currentTick = (async () => {
    try {
      return await closeExpiredAuctions();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[closeAuctions.job] error:', err.message);
    } finally {
      running = false;
      currentTick = null;
    }
  })();
  return currentTick;
}

function start() {
  if (timer) return;
  // Run once shortly after startup, then every interval
  startupTimer = setTimeout(tick, 5_000);
  timer = setInterval(tick, INTERVAL_MS);
  // eslint-disable-next-line no-console
  console.log(`[closeAuctions.job] started (every ${INTERVAL_MS / 1000}s)`);
}

async function stop() {
  if (startupTimer) clearTimeout(startupTimer);
  if (timer) clearInterval(timer);
  if (startupTimer) startupTimer = null;
  timer = null;
  if (currentTick) await currentTick;
}

module.exports = { start, stop, tick };
