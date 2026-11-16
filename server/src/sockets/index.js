// server/src/sockets/index.js
const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyToken } = require('../utils/jwt');

let io = null;

// Allowed origins: local dev + production (Vercel URL from Railway env var)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  env.CLIENT_URL,
].filter(Boolean);

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Railway par WebSocket stable hai; polling fallback bhi rakhein
    transports: ['websocket', 'polling'],
    // Connection debugging ke liye
    pingTimeout: 60000,
    pingInterval: 25000,
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
    console.log(
      `[socket] connected: ${socket.id} | user: ${socket.user?.sub || 'anonymous'}`
    );

    socket.on('joinAuction', (auctionId) => {
      if (!auctionId) return;
      socket.join(`auction:${auctionId}`);
      console.log(`[socket] ${socket.id} joined auction:${auctionId}`);
    });

    socket.on('leaveAuction', (auctionId) => {
      if (!auctionId) return;
      socket.leave(`auction:${auctionId}`);
      console.log(`[socket] ${socket.id} left auction:${auctionId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} | reason: ${reason}`);
    });
  });

  console.log(`[socket] initialized | allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);

  return io;
}

function emitNewBid(auctionId, payload) {
  if (!io) {
    console.warn('[socket] emitNewBid called before init');
    return;
  }
  io.to(`auction:${auctionId}`).emit('newBid', payload);
}

function emitAuctionUpdate(auctionId, payload) {
  if (!io) {
    console.warn('[socket] emitAuctionUpdate called before init');
    return;
  }
  io.to(`auction:${auctionId}`).emit('auctionUpdate', payload);
}

function emitAuctionEnded(auctionId, payload) {
  if (!io) {
    console.warn('[socket] emitAuctionEnded called before init');
    return;
  }
  io.to(`auction:${auctionId}`).emit('auctionEnded', payload);
}

module.exports = { initSocket, emitNewBid, emitAuctionUpdate, emitAuctionEnded };