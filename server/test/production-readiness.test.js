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
const {
  auctionListQuerySchema,
  signupSchema,
  passwordChangeSchema,
  resetPasswordSchema,
} = require('../src/middleware/schemas');
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
userRepo.updatePasswordAndRevoke = async (id, passwordHash) => {
  const account = accounts.get(id);
  account.password_hash = passwordHash;
  account.session_version += 1;
  return { id, session_version: account.session_version };
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

async function callApi(route, { method = 'GET', body, cookie, bearer, origin = ORIGIN, webhookSecret } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (origin !== undefined) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (webhookSecret) headers['x-webhook-secret'] = webhookSecret;
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

test('authenticated password change revokes the old cookie and bearer sessions', async () => {
  const account = accounts.get(IDS.buyer);
  const login = await loginCookie(account);
  const originalPasswordHash = account.password_hash;
  const originalSessionVersion = account.session_version;

  const originalFrom = supabase.from;
  supabase.from = (table) => {
    if (table !== 'users') throw new Error(`Unexpected table: ${table}`);
    let selectedId = null;
    return {
      select() { return this; },
      eq(_column, id) { selectedId = id; return this; },
      maybeSingle: async () => ({
        data: {
          id: selectedId,
          password_hash: accounts.get(selectedId).password_hash,
        },
        error: null,
      }),
    };
  };

  try {
    const response = await callApi('/api/me/password', {
      method: 'PATCH',
      cookie: login.cookie,
      bearer: login.token,
      body: {
        current_password: 'correct horse battery staple',
        new_password: 'new-long-password',
      },
    });
    assert.equal(response.status, 200);
  } finally {
    supabase.from = originalFrom;
  }

  const staleCookie = await callApi('/api/auth/me', { cookie: login.cookie });
  assert.equal(staleCookie.status, 401);
  const staleBearer = await callApi('/api/auth/me', { bearer: login.token });
  assert.equal(staleBearer.status, 401);

  account.password_hash = originalPasswordHash;
  account.session_version = originalSessionVersion;
});

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

test('webhook secret validation fails closed', async () => {
  delete process.env.SUPABASE_WEBHOOK_SECRET;
  const missingConfiguration = await callApi('/api/webhooks/supabase', {
    method: 'POST',
    origin: 'https://attacker.example',
    body: { type: 'UPDATE', table: 'auctions', record: { id: IDS.auction } },
  });
  assert.equal(missingConfiguration.status, 401);

  process.env.SUPABASE_WEBHOOK_SECRET = 'test-webhook-secret';
  const missingHeader = await callApi('/api/webhooks/supabase', {
    method: 'POST',
    origin: 'https://attacker.example',
    body: { type: 'UPDATE', table: 'auctions', record: { id: IDS.auction } },
  });
  assert.equal(missingHeader.status, 401);

  const wrongSecret = await callApi('/api/webhooks/supabase', {
    method: 'POST',
    origin: 'https://attacker.example',
    webhookSecret: 'wrong-secret',
    body: { type: 'UPDATE', table: 'auctions', record: { id: IDS.auction } },
  });
  assert.equal(wrongSecret.status, 401);

  const validSecret = await callApi('/api/webhooks/supabase', {
    method: 'POST',
    origin: 'https://attacker.example',
    webhookSecret: 'test-webhook-secret',
    body: { type: 'UPDATE', table: 'auctions', record: { id: IDS.auction } },
  });
  assert.equal(validSecret.status, 200);

  delete process.env.SUPABASE_WEBHOOK_SECRET;
});

test('password policies require at least 12 characters consistently', () => {
  assert.equal(signupSchema.safeParse({
    full_name: 'Test User',
    email: 'test@example.com',
    password: 'eleven-char',
  }).success, false);
  assert.equal(signupSchema.safeParse({
    full_name: 'Test User',
    email: 'test@example.com',
    password: 'twelve-char-secure',
  }).success, true);
  assert.equal(passwordChangeSchema.safeParse({
    current_password: 'old-password',
    new_password: 'short',
  }).success, false);
  assert.equal(resetPasswordSchema.safeParse({
    token: 'long-enough-reset-token',
    new_password: 'twelve-char-secure',
  }).success, true);
});

test('invalid password reset tokens return a controlled 400 response', async () => {
  const missingToken = await callApi('/api/auth/reset-password/verify');
  assert.equal(missingToken.status, 400);
  assert.equal((await missingToken.json()).error, 'Invalid token');

  const shortToken = await callApi('/api/auth/reset-password/verify?token=short');
  assert.equal(shortToken.status, 400);
  assert.equal((await shortToken.json()).error, 'Invalid token');
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

test('auction edits reject immutable fields after bids are placed', async () => {
  const originalFindById = auctionRepo.findById;
  auctionRepo.findById = async () => ({
    id: IDS.auction,
    seller_id: IDS.seller,
    status: 'active',
    starting_price: 100,
    current_price: 110,
  });
  try {
    const auctionService = require('../src/services/auction.service');
    await assert.rejects(
      auctionService.updateAuction(
        accounts.get(IDS.seller),
        IDS.auction,
        { starting_price: 50, title: 'Updated title' }
      ),
      (error) => error.statusCode === 400 &&
        /Cannot change starting_price/.test(error.message)
    );
  } finally {
    auctionRepo.findById = originalFindById;
  }
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

test('bid placement does not use stale pre-RPC bidder snapshots', () => {
  const service = fs.readFileSync(
    path.join(__dirname, '../src/services/bid.service.js'),
    'utf8'
  );
  assert.doesNotMatch(service, /highestBidder\s*\(/);
  assert.doesNotMatch(service, /previousBidderId/);
});

test('baseline security headers are present', async () => {
  const health = await callApi('/api/health');
  assert.equal(health.status, 200);
  assert.ok(health.headers.get('x-content-type-options'));
  assert.ok(health.headers.get('x-frame-options'));
  assert.equal(app.get('trust proxy'), 0);
});

test('cron job routes require a CRON_SECRET and expose serverless jobs', async () => {
  delete process.env.CRON_SECRET;
  const missingSecret = await callApi('/api/jobs/close-auctions', {
    method: 'POST',
    origin: null,
  });
  assert.equal(missingSecret.status, 401);

  process.env.CRON_SECRET = 'test-cron-secret';
  const closeJob = require('../src/jobs/closeAuctions.job');
  const emailJob = require('../src/jobs/emailOutbox.job');
  const originalCloseTick = closeJob.tick;
  const originalEmailTick = emailJob.tick;
  closeJob.tick = async () => 2;
  emailJob.tick = async () => 3;

  try {
    const wrongSecret = await callApi('/api/jobs/close-auctions', {
      method: 'POST',
      origin: null,
      bearer: 'wrong-secret',
    });
    assert.equal(wrongSecret.status, 401);

    const close = await callApi('/api/jobs/close-auctions', {
      method: 'POST',
      origin: null,
      bearer: 'test-cron-secret',
    });
    assert.equal(close.status, 200);
    assert.equal((await close.json()).closed, 2);

    const email = await callApi('/api/jobs/process-email-outbox', {
      method: 'POST',
      origin: null,
      bearer: 'test-cron-secret',
    });
    assert.equal(email.status, 200);
    assert.equal((await email.json()).processed, 3);
  } finally {
    closeJob.tick = originalCloseTick;
    emailJob.tick = originalEmailTick;
    delete process.env.CRON_SECRET;
  }
});

test('anti-sniping migration bounds the extended deadline', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../src/db/migrations/0014_bounded_anti_sniping.sql'),
    'utf8'
  );
  assert.match(migration, /v_new_end := v_now \+ interval '60 seconds'/i);
  assert.doesNotMatch(migration, /v_new_end := v_auction\.ends_at \+ interval '60 seconds'/i);
});

test('admin auction removal migration is transactional and preserves auction history', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../src/db/migrations/0013_remove_auction_atomic.sql'),
    'utf8'
  );
  assert.match(migration, /v_actor_role <> 'admin'/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /cancel_auction_with_notifications/i);
  assert.match(migration, /set status = 'cancelled'/i);
  assert.doesNotMatch(migration, /\bdelete\s+from\s+public\.auctions\b/i);
  assert.match(migration, /revoke all on function public\.remove_auction_atomic\(uuid, uuid\)/i);
  assert.match(migration, /grant execute on function public\.remove_auction_atomic\(uuid, uuid\)/i);
});

test('bid deletion migration is ownership-restricted and recalculates auction price', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../src/db/migrations/0012_delete_bid_atomic.sql'),
    'utf8'
  );
  assert.match(migration, /b\.bidder_id = p_bidder_id/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /BID_NOT_FOUND_OR_FORBIDDEN/i);
  assert.match(migration, /AUCTION_NOT_ACTIVE/i);
  assert.match(migration, /AUCTION_ENDED/i);
  assert.match(migration, /coalesce\(v_new_price, v_auction\.starting_price\)/i);
  assert.match(migration, /revoke all on function public\.delete_bid\(uuid, uuid\)/i);
  assert.match(migration, /grant execute on function public\.delete_bid\(uuid, uuid\)/i);
});

test('password reset migration consumes tokens and revokes sessions atomically', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../src/db/migrations/0011_password_reset_atomic.sql'),
    'utf8'
  );
  assert.match(migration, /for update/i);
  assert.match(migration, /used_at = clock_timestamp\(\)/i);
  assert.match(migration, /session_version = u\.session_version \+ 1/i);
  assert.match(migration, /revoke all on function public\.consume_password_reset\(text, text\)/i);
  assert.match(migration, /grant execute on function public\.consume_password_reset\(text, text\)[\r\n\s]+to service_role/i);
});

test('database migration keeps atomic bidding/closing in SECURITY DEFINER routines', () => {
  const migration = fs.readFileSync(path.join(__dirname, '../src/db/migrations/008_email_outbox.sql'), 'utf8');
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = pg_catalog, public/i);
  assert.match(migration, /revoke all on function public\.place_bid\(uuid, uuid, numeric\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.place_bid\(uuid, uuid, numeric\) to service_role/i);
});

test('frontend auth token is not persisted in localStorage', async () => {
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
    values.set('auction_token', 'legacy-jwt');
    assert.equal(getAuthToken(), null);
    saveAuthToken('new-jwt');
    assert.equal(getAuthToken(), null);
    clearAuthToken();
    assert.equal(values.get('auction_token'), undefined);
  } finally {
    delete global.window;
  }
});
