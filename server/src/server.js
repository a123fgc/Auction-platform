// server/src/server.js
const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initSocket } = require('./sockets');
const closeAuctionsJob = require('./jobs/closeAuctions.job');

const server = http.createServer(app);

// Socket.IO initialize karein (CORS settings aapke sockets/index.js mein honi chahiye)
initSocket(server);

// Background job start karein
closeAuctionsJob.start();

const port = process.env.PORT || 5000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  closeAuctionsJob.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));