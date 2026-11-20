const emailService = require('../services/email.service');

const INTERVAL_MS = 5_000;
let timer = null;
let startupTimer = null;
let running = false;
let currentTick = null;

async function tick() {
  if (running) return currentTick;
  running = true;
  currentTick = (async () => {
    try {
      const processed = await emailService.processBatch();
      if (processed > 0) console.log(`[emailOutbox.job] processed ${processed} message(s)`);
      return processed;
    } catch (error) {
      console.error('[emailOutbox.job] batch failed:', error.message);
    } finally {
      running = false;
      currentTick = null;
    }
  })();
  return currentTick;
}

function start() {
  if (timer) return;
  startupTimer = setTimeout(tick, 1_000);
  timer = setInterval(tick, INTERVAL_MS);
  console.log(`[emailOutbox.job] started (every ${INTERVAL_MS / 1000}s)`);
}

async function stop() {
  if (startupTimer) clearTimeout(startupTimer);
  if (timer) clearInterval(timer);
  startupTimer = null;
  timer = null;
  if (currentTick) await currentTick;
}

module.exports = { start, stop, tick };
