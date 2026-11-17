const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { EventEmitter } = require('node:events');

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.CLIENT_URL = 'https://client-rose-two-77.vercel.app';
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-role-key';
process.env.SUPABASE_ANON_KEY = 'test-only-anon-key';
process.env.JWT_SECRET = 'test-only-secret-with-more-than-thirty-two-characters';
process.env.COOKIE_NAME = 'auction_token';

const bcrypt = require('bcryptjs');
const userRepo = require('../src/db/repositories/user.repo');
const auctionRepo = require('../src/db/repositories/auction.repo');
const actualAuctionList = auctionRepo.list;
const bidRepo = require('../src/db/repositories/bid.repo');
const statsService = require('../src/services/stats.service');
const supabase = require('../src/config/supabase');
const { signToken } = require('../src/utils/jwt');
const { auctionListQuerySchema } = require('../src/middleware/schemas');
const { quoteFilterValue, escapeLikePattern } = require('../src/utils/postgrestSearch');

const IDS = {
  buyer: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  seller: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  admin: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  otherSeller: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  auction: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  otherAuction: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
};
const ORIGIN = 'https://client-rose-two-77.vercel.app';
const accounts = new Map();
let closeResult = null;
let auctionForBid = null;
let capturedSearchFilter = null;

function makeAccount({ id, role, name, suspended = false }) {
  return {
    id,
    email: `${role}@auction.test`,
    full_name: name,
    role,
    is_suspended: suspended,
    session_version: 0,
    created_at: new Date().toISOString(),
    password_hash: bcrypt.hashSync('correct horse battery staple', 4),
  };
}

userRepo.findByEmail = async (email) => [...accounts.values()].find(
  (account) => account.email.toLowerCase() === email.toLowerCase()
) || null;
userRepo.findById = async (id) => accounts.get(id) || null;
userRepo.create = async (payload) => {
  const account = {
    id: `created-${accounts.size}`,
    ...payload,
    is_suspended: false,
    session_version: 0,
    created_at: new Date().toISOString(),
  };
  accounts.set(account.id, account);
  return account;
};
userRepo.revokeSessions = async (id, currentVersion) => {
  const account = accounts.get(id);
  account.session_version = currentVersion + 1;
};
userRepo.listAll = async () => ({ data: [], total: 0 });
userRepo.setSuspended = async (id, suspended) => {
  const account = accounts.get(id);
  account.is_suspended = suspended;
  return account;
};

auctionRepo.findById = async (id) => id === IDS.auction ? auctionForBid : null;
auctionRepo.exists = async (id) => id === IDS.auction;
auctionRepo.closeAtomic = async () => closeResult;
auctionRepo.list = async (query) => ({ data: [], total: 0, ...query });

bidRepo.highestBidder = async () => null;
bidRepo.placeBidRpc = async ({ amount }) => ({
  id: 'bid-test-id', auction_id: IDS.auction, bidder_id: IDS.buyer, amount,
  created_at: new Date().toISOString(),
});

statsService.overview = async () => ({ totalUsers: accounts.size });
statsService.recentAuctions = async () => [];
statsService.recentBids = async () => [];

class FakeSocketServer extends EventEmitter {
  constructor(httpServer, options) {
    super();
    this.options = options;
    this.middlewares = [];
    this.sockets = [];
    FakeSocketServer.instance = this;
  }

  use(middleware) { this.middlewares.push(middleware); }
  to() { return { emit() {} }; }
  in(room) {
    return {
      disconnectSockets: () => {
        for (const socket of this.sockets) {
          if (socket.rooms.has(room)) socket.disconnect('server namespace disconnect');
        }
      },
    };
  }
  async connect(socket) {
    for (const middleware of this.middlewares) {
      await new Promise((resolve, reject) => middleware(socket, (error) => error ? reject(error) : resolve()));
    }
    this.sockets.push(socket);
    this.emit('connection', socket);
    return socket;
  }
  close(callback) { this.sockets.length = 0; callback?.(); }
}

class FakeSocket {
  constructor(cookie = '') {
    this.handshake = { headers: { cookie }, auth: {} };
    this.data = {};
    this.rooms = new Set();
    this.handlers = new Map();
    this.disconnected = false;
  }
  on(event, handler) { this.handlers.set(event, handler); }
  async join(room) { this.rooms.add(room); }
  leave(room) { this.rooms.delete(room); }
  disconnect(reason) {
    this.disconnected = true;
    this.handlers.get('disconnect')?.(reason);
  }
}

// The suite exercises the application's Socket.IO middleware and room handlers
// without a network listener or an additional test-client dependency.
require('socket.io').Server = FakeSocketServer;

const app = require('../src/app');
const { initSocket, closeSocketServer } = require('../src/sockets');
const server = http.createServer(app);
let baseUrl;

before(async () => {
  for (const account of [
    makeAccount({ id: IDS.buyer, role: 'buyer', name: 'Buyer' }),
    makeAccount({ id: IDS.seller, role: 'seller', name: 'Seller' }),
    makeAccount({ id: IDS.admin, role: 'admin', name: 'Admin' }),
    makeAccount({ id: IDS.otherSeller, role: 'seller', name: 'Other seller' }),
    makeAccount({ id: 'suspended-buyer', role: 'buyer', name: 'Suspended', suspended: true }),
  ]) accounts.set(account.id, account);

  auctionForBid = {
    id: IDS.auction,
    seller_id: IDS.seller,
    status: 'active',
    starting_price: 100,
    current_price: 100,
    min_increment: 10,
    ends_at: new Date(Date.now() + 120_000).toISOString(),
  };
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  initSocket(server);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await closeSocketServer();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function tokenFor(account) {
  return signToken({ sub: account.id, role: account.role, sv: account.session_version });
}

async function callApi(route, { method = 'GET', body, cookie, bearer, origin = ORIGIN } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (origin !== undefined) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  return fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function loginCookie(account) {
  const response = await callApi('/api/auth/login', {
    method: 'POST',
    body: { email: account.email, password: 'correct horse battery staple' },
  });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'login should issue an authentication cookie');
  const body = await response.json();
  return {
    response,
    body,
    token: body.token,
    cookie: setCookie.split(';', 1)[0],
  };
}

async function connectSocket(cookie, token) {
  const socket = new FakeSocket(cookie || '');
  if (token) socket.handshake.auth.token = token;
  return FakeSocketServer.instance.connect(socket);
}

function emitSocketEvent(socket, event, ...args) {
  return new Promise((resolve) => socket.handlers.get(event)(...args, resolve));
}

test('signup/login issue fresh tokens; bearer/cookie auth works; logout clears and revokes the session', async (t) => {
  const signupEmail = `new-${Date.now()}@auction.test`;
  const signup = await callApi('/api/auth/signup', {
    method: 'POST',
    body: { full_name: 'New Buyer', email: signupEmail, password: 'long-enough-password', role: 'buyer' },
  });
  assert.equal(signup.status, 201);
  const signupBody = await signup.json();
  assert.equal(signupBody.user.email, signupEmail);
  assert.equal(typeof signupBody.token, 'string', 'signup returns a JWT for browser storage');
  const signupSetCookie = signup.headers.get('set-cookie');
  assert.match(signupSetCookie, /HttpOnly/i);
  assert.match(signupSetCookie, /SameSite=Lax/i);

  const buyer = accounts.get(IDS.buyer);
  const { response: login, cookie, token } = await loginCookie(buyer);
  assert.equal(typeof token, 'string');
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);

  const me = await callApi('/api/auth/me', { cookie });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.id, IDS.buyer);

  const bearerMe = await callApi('/api/auth/me', { bearer: token });
  assert.equal(bearerMe.status, 200, 'Bearer token from localStorage must authenticate API requests');

  const liveSocket = await connectSocket(null, token);
  const logout = await callApi('/api/auth/logout', { method: 'POST', cookie, bearer: token });
  assert.equal(logout.status, 200);
  assert.equal(liveSocket.disconnected, true, 'logout should disconnect the authenticated socket');
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);
  const staleSession = await callApi('/api/auth/me', { cookie });
  assert.equal(staleSession.status, 401, 'logout must invalidate the old JWT session');
  const staleBearer = await callApi('/api/auth/me', { bearer: token });
  assert.equal(staleBearer.status, 401, 'logout must invalidate a copied bearer token too');

  const secondLogin = await loginCookie(buyer);
  assert.notEqual(secondLogin.token, token, 'a new login must generate a fresh JWT');

  t.diagnostic('Signup, login, cookie hydration, and server-side session-version invalidation passed.');
});

test('CSRF Origin validation and role checks block unauthorized mutations', async () => {
  const missingOrigin = await callApi('/api/auth/logout', { method: 'POST', origin: null });
  assert.equal(missingOrigin.status, 403);
  const hostileOrigin = await callApi('/api/auth/signup', {
    method: 'POST',
    origin: 'https://attacker.example',
    body: { full_name: 'Attacker', email: 'attacker@auction.test', password: 'password' },
  });
  assert.equal(hostileOrigin.status, 403);

  const buyerCookie = (await loginCookie(accounts.get(IDS.buyer))).cookie;
  const forbiddenBid = await callApi(`/api/auctions/${IDS.auction}/bids`, {
    method: 'POST', cookie: buyerCookie, body: { amount: 110 },
  });
  // The buyer is permitted to bid; validation/repository behavior is tested separately.
  assert.notEqual(forbiddenBid.status, 403);

  const sellerCookie = (await loginCookie(accounts.get(IDS.seller))).cookie;
  const sellerBid = await callApi(`/api/auctions/${IDS.auction}/bids`, {
    method: 'POST', cookie: sellerCookie, body: { amount: 110 },
  });
  assert.equal(sellerBid.status, 403, 'seller role must not access buyer bid action');
});

test('admin router is mounted and rejects non-admin users', async () => {
  const anonymous = await callApi('/api/admin/stats');
  assert.equal(anonymous.status, 401);

  const buyerCookie = (await loginCookie(accounts.get(IDS.buyer))).cookie;
  const buyerResult = await callApi('/api/admin/stats', { cookie: buyerCookie });
  assert.equal(buyerResult.status, 403);

  const adminCookie = (await loginCookie(accounts.get(IDS.admin))).cookie;
  const adminResult = await callApi('/api/admin/stats', { cookie: adminCookie });
  assert.equal(adminResult.status, 200);
  assert.deepEqual(await adminResult.json(), {
    overview: { totalUsers: accounts.size }, recentAuctions: [], recentBids: [],
  });

  const selfSuspend = await callApi(`/api/admin/users/${IDS.admin}/suspend`, {
    method: 'PATCH', cookie: adminCookie, body: { suspended: true },
  });
  assert.equal(selfSuspend.status, 403, 'admin cannot suspend their own account');
});

test('pagination is bounded, search is escaped for PostgREST, and sellers cannot set status', async () => {
  assert.equal((await callApi('/api/auctions?page=0')).status, 400);
  assert.equal((await callApi('/api/auctions?page=10001')).status, 400);
  assert.equal((await callApi('/api/auctions?limit=49')).status, 400);

  const maliciousSearch = 'foo,description.ilike.%25_*\\"';
  assert.equal(auctionListQuerySchema.safeParse({ page: '1', limit: '12', search: maliciousSearch }).success, true);
  const escapedPattern = escapeLikePattern(maliciousSearch);
  const filterValue = quoteFilterValue(`%${escapedPattern}%`);
  assert.match(filterValue, /^".*"$/);
  assert.match(escapedPattern, /\\%|\\_|\\\\/);

  const originalFrom = supabase.from;
  supabase.from = () => {
    const builder = {
      select() { return this; },
      eq() { return this; },
      or(filter) { capturedSearchFilter = filter; return this; },
      order() { return this; },
      async range() { return { data: [], error: null, count: 0 }; },
    };
    return builder;
  };
  try {
    await actualAuctionList({ page: 1, limit: 12, search: maliciousSearch });
  } finally {
    supabase.from = originalFrom;
  }
  assert.ok(capturedSearchFilter.startsWith(`title.ilike.${filterValue},description.ilike.${filterValue}`));

  const sellerCookie = (await loginCookie(accounts.get(IDS.seller))).cookie;
  const statusPatch = await callApi(`/api/seller/auctions/${IDS.auction}`, {
    method: 'PATCH', cookie: sellerCookie, body: { status: 'ended' },
  });
  assert.equal(statusPatch.status, 400, 'strict update schema must reject status mutation');

  auctionRepo.findById = async () => ({
    id: IDS.auction, seller_id: IDS.otherSeller, status: 'active', current_price: 100, starting_price: 100,
  });
  const auctionService = require('../src/services/auction.service');
  await assert.rejects(
    auctionService.updateAuction(accounts.get(IDS.seller), IDS.auction, { title: 'Unauthorized edit' }),
    (error) => error.statusCode === 403
  );
});

test('concurrent bids are rechecked by the serialized RPC and auction close is single-winner', async () => {
  let currentPrice = 100;
  let rpcLock = Promise.resolve();
  bidRepo.placeBidRpc = async ({ amount }) => {
    let release;
    const waitForPrevious = rpcLock;
    rpcLock = new Promise((resolve) => { release = resolve; });
    await waitForPrevious;
    try {
      if (amount < currentPrice + 10) {
        throw Object.assign(new Error('Bid is too low'), { code: 'BID_TOO_LOW' });
      }
      currentPrice = amount;
      return { id: `bid-${amount}`, amount, bidder_id: IDS.buyer, created_at: new Date().toISOString() };
    } finally {
      release();
    }
  };

  const bidService = require('../src/services/bid.service');
  const bidders = [IDS.buyer, IDS.otherSeller].map((id) => ({ id, role: 'buyer' }));
  const outcomes = await Promise.allSettled(bidders.map((user) => bidService.placeBid(user, IDS.auction, 110)));
  assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1);
  assert.equal(currentPrice, 110);

  closeResult = { id: IDS.auction, winner_id: IDS.buyer, current_price: 110, status: 'ended' };
  auctionRepo.findById = async () => closeResult;
  let closeCalls = 0;
  auctionRepo.closeAtomic = async () => {
    closeCalls += 1;
    if (closeCalls > 1) return null;
    return closeResult;
  };
  const closeService = require('../src/services/auctionClose.service');
  const closeResults = await Promise.all([
    closeService.closeOne({ id: IDS.auction }),
    closeService.closeOne({ id: IDS.auction }),
  ]);
  assert.equal(closeResults.filter(Boolean).length, 1);
  assert.equal(closeCalls, 2, 'both callers rely on the atomic RPC to select one closer');

  const migration = fs.readFileSync(path.join(__dirname, '../src/db/migrations/008_email_outbox.sql'), 'utf8');
  const bidFunction = migration.slice(migration.indexOf('create or replace function public.place_bid'), migration.indexOf('create or replace function public.close_auction_atomic'));
  const closeFunction = migration.slice(migration.indexOf('create or replace function public.close_auction_atomic'), migration.indexOf('create or replace function public.claim_email_outbox'));
  assert.match(bidFunction, /for update/i);
  assert.match(bidFunction, /clock_timestamp\(\)/i);
  assert.match(closeFunction, /for update/i);
  assert.match(closeFunction, /order by b\.amount desc, b\.created_at desc, b\.id desc/i);
});

test('Socket.IO enforces origin, cookie auth, room ID/existence checks, and suspended-user rejection', async () => {
  const io = FakeSocketServer.instance;
  const originAllowed = await new Promise((resolve) => io.options.allowRequest({ headers: { origin: ORIGIN } }, (_error, ok) => resolve(ok)));
  const originDenied = await new Promise((resolve) => io.options.allowRequest({ headers: { origin: 'https://attacker.example' } }, (_error, ok) => resolve(ok)));
  assert.equal(originAllowed, true);
  assert.equal(originDenied, false);

  const anonymous = await connectSocket();
  const invalid = await emitSocketEvent(anonymous, 'joinAuction', 'not-a-uuid');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, 'Invalid auction ID');

  const missing = await emitSocketEvent(anonymous, 'joinAuction', IDS.otherAuction);
  assert.equal(missing.ok, false);
  assert.equal(missing.error, 'Auction not found');

  const valid = await emitSocketEvent(anonymous, 'joinAuction', IDS.auction);
  assert.deepEqual(valid, { ok: true });
  assert.equal(anonymous.rooms.has(`auction:${IDS.auction}`), true);

  const buyerToken = (await loginCookie(accounts.get(IDS.buyer))).token;
  const authenticated = await connectSocket(null, buyerToken);
  assert.equal(authenticated.rooms.has(`user:${IDS.buyer}`), true);

  const suspendedToken = tokenFor(accounts.get('suspended-buyer'));
  await assert.rejects(connectSocket(null, suspendedToken), /Account suspended/);
});

test('database migration keeps atomic bidding/closing in SECURITY DEFINER routines', () => {
  const migration = fs.readFileSync(path.join(__dirname, '../src/db/migrations/008_email_outbox.sql'), 'utf8');
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public/i);
  assert.match(migration, /revoke all on function public\.place_bid\(uuid, uuid, numeric\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.place_bid\(uuid, uuid, numeric\) to service_role/i);
});

test('frontend auth token storage replaces prior value and removes it on logout', async () => {
  const values = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  try {
    const { clearAuthToken, getAuthToken, saveAuthToken } = await import('../../client/src/utils/authToken.js');
    saveAuthToken('old-jwt');
    assert.equal(getAuthToken(), 'old-jwt');
    saveAuthToken('new-jwt');
    assert.equal(getAuthToken(), 'new-jwt', 'login replaces the prior stored token');
    clearAuthToken();
    assert.equal(getAuthToken(), null, 'logout removes the stored token');
  } finally {
    delete global.window;
  }
});
