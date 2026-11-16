const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyToken } = require('../utils/jwt');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Optional auth — sockets can be anonymous (public auction rooms)
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || '').replace(/^Bearer /, '');
    if (token) {
      try {
        socket.user = verifyToken(token);
      } catch {
        /* ignore — stay anonymous */
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.on('joinAuction', (auctionId) => {
      if (!auctionId) return;
      socket.join(`auction:${auctionId}`);
    });

    socket.on('leaveAuction', (auctionId) => {
      if (!auctionId) return;
      socket.leave(`auction:${auctionId}`);
    });

    socket.on('disconnect', () => {
      /* rooms auto-cleaned */
    });
  });

  return io;
}

function emitNewBid(auctionId, payload) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit('newBid', payload);
}

function emitAuctionUpdate(auctionId, payload) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit('auctionUpdate', payload);
}

function emitAuctionEnded(auctionId, payload) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit('auctionEnded', payload);
}

module.exports = { initSocket, emitNewBid, emitAuctionUpdate, emitAuctionEnded };