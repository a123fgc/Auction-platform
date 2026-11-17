const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyToken } = require('../utils/jwt');
const userRepo = require('../db/repositories/user.repo');
const auctionRepo = require('../db/repositories/auction.repo');

let io = null;

const ALLOWED_ORIGINS = env.CLIENT_ORIGINS;
const AUCTION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOIN_WINDOW_MS = 60_000;
const MAX_JOINS_PER_WINDOW = 30;
const MAX_AUCTION_ROOMS = 20;

function readCookie(header, name) {
  for (const part of (header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim().replace(/^"|"$/g, ''));
    } catch {
      return null;
    }
  }
  return null;
}

function acknowledge(callback, result) {
  if (typeof callback === 'function') callback(result);
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Socket.IO's CORS settings govern polling; check WebSocket Origins too.
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      callback(null, typeof origin === 'string' && ALLOWED_ORIGINS.includes(origin));
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auction streams are public; valid cookies are upgraded to authenticated sockets.
  io.use(async (socket, next) => {
    const authToken = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : null;
    const authorization = socket.handshake.headers.authorization || '';
    const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || null;
    const token = authToken
      || bearerToken
      || readCookie(socket.handshake.headers.cookie, env.COOKIE_NAME);
    if (!token) return next();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return next(); // Expired/revoked sessions may still view public auctions.
    }

    try {
      const user = await userRepo.findById(payload.sub);
      if (!user || payload.sv !== user.session_version) return next();
      if (user.is_suspended) return next(new Error('Account suspended'));
      socket.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    console.log(
      `[socket] connected: ${socket.id} | user: ${socket.user?.id || 'anonymous'}`
    );

    if (socket.user) socket.join(`user:${socket.user.id}`);
    socket.data.auctionJoinTimes = [];
    socket.data.joinedAuctions = new Set();

    socket.on('joinAuction', async (auctionId, callback) => {
      if (typeof auctionId !== 'string' || !AUCTION_ID_PATTERN.test(auctionId)) {
        return acknowledge(callback, { ok: false, error: 'Invalid auction ID' });
      }
      auctionId = auctionId.toLowerCase();

      const now = Date.now();
      socket.data.auctionJoinTimes = socket.data.auctionJoinTimes
        .filter((joinedAt) => now - joinedAt < JOIN_WINDOW_MS);
      if (socket.data.auctionJoinTimes.length >= MAX_JOINS_PER_WINDOW) {
        return acknowledge(callback, { ok: false, error: 'Room join rate limit exceeded' });
      }
      socket.data.auctionJoinTimes.push(now);

      if (socket.data.joinedAuctions.has(auctionId)) {
        return acknowledge(callback, { ok: true });
      }
      if (socket.data.joinedAuctions.size >= MAX_AUCTION_ROOMS) {
        return acknowledge(callback, { ok: false, error: 'Too many auction rooms' });
      }

      // Reserve the room slot before async existence lookup so concurrent joins
      // cannot exceed the per-socket room cap.
      socket.data.joinedAuctions.add(auctionId);
      try {
        if (!(await auctionRepo.exists(auctionId))) {
          socket.data.joinedAuctions.delete(auctionId);
          return acknowledge(callback, { ok: false, error: 'Auction not found' });
        }
        if (!socket.data.joinedAuctions.has(auctionId)) {
          return acknowledge(callback, { ok: false, error: 'Room join cancelled' });
        }
        await socket.join(`auction:${auctionId}`);
        acknowledge(callback, { ok: true });
      } catch (error) {
        socket.data.joinedAuctions.delete(auctionId);
        console.error('[socket] auction room join failed:', error.message);
        acknowledge(callback, { ok: false, error: 'Unable to join auction room' });
      }
    });

    socket.on('leaveAuction', (auctionId) => {
      if (typeof auctionId !== 'string' || !AUCTION_ID_PATTERN.test(auctionId)) return;
      socket.data.joinedAuctions.delete(auctionId);
      socket.leave(`auction:${auctionId}`);
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

function disconnectUserSockets(userId) {
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
}

function closeSocketServer() {
  if (!io) return Promise.resolve();
  const socketServer = io;
  io = null;
  return new Promise((resolve, reject) => {
    socketServer.close((error) => (error ? reject(error) : resolve()));
  });
}

module.exports = {
  initSocket,
  emitNewBid,
  emitAuctionUpdate,
  emitAuctionEnded,
  disconnectUserSockets,
  closeSocketServer,
};
