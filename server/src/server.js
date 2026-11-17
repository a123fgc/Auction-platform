// server/src/server.js
const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initSocket } = require('./sockets');
const closeAuctionsJob = require('./jobs/closeAuctions.job');
const emailOutboxJob = require('./jobs/emailOutbox.job');
const { closeSocketServer } = require('./sockets');

const server = http.createServer(app);

// Socket.IO initialize karein (CORS settings aapke sockets/index.js mein honi chahiye)
initSocket(server);

// Background job start karein
closeAuctionsJob.start();
emailOutboxJob.start();

server.listen(env.PORT, '0.0.0.0', () => {
  server.setTimeout(30_000);
  server.headersTimeout = 35_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  console.log(`[server] listening on 0.0.0.0:${env.PORT}`);
});

// Graceful shutdown
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down...`);
  const forceExit = setTimeout(() => {
    console.error('[server] graceful shutdown timed out');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    await Promise.all([closeAuctionsJob.stop(), emailOutboxJob.stop()]);
    await closeSocketServer(); // Socket.IO closes its attached HTTP server too.
    clearTimeout(forceExit);
    console.log('[server] shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[server] shutdown failed:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
