const http = require("http");
const app = require("./app");
const env = require("./config/env");
const { initSocket } = require("./sockets");
const closeAuctionsJob = require("./jobs/closeAuctions.job");

const server = http.createServer(app);
initSocket(server);

// Start background jobs
closeAuctionsJob.start();

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${env.PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[server] ${signal} received, shutting down...`);
  closeAuctionsJob.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
