# Auction Platform Security and Reliability Audit

## Scope

The audit covered the complete React frontend, Express/Socket.IO backend, Supabase/PostgreSQL migrations and repositories, authentication and authorization, API routes, uploads, email outbox, background jobs, deployment configuration, and existing tests.

The existing test suite passed: 8 tests passed and 0 failed. The worktree was clean after the audit.

## Severity Summary

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | server/src/services/passwordReset.service.js:78; server/src/services/profile.service.js:54 | 78; 54 | Password reset/change does not revoke existing JWT sessions | 9/10 |
| 2 | 🟠 HIGH | server/src/db/repositories/bid.repo.js:96-139 | 96-139 | Calls a delete_bid database RPC that is absent from the migrations | 10/10 |
| 3 | 🟠 HIGH | server/src/controllers/auth.controller.js:34-38 | 34-38 | Reset-token verification throws ReferenceError instead of returning a validation response | 10/10 |
| 4 | 🟠 HIGH | server/src/services/passwordReset.service.js:67-81 | 67-81 | Reset verification and token consumption are not atomic, allowing concurrent reuse | 9/10 |
| 5 | 🟠 HIGH | server/src/db/migrations/008_email_outbox.sql; server/src/db/migrations/009_profile.sql; server/src/db/migrations/0010_password_reset.sql | 008-0010 | README omits migrations 009 and 0010, and deployment does not apply migrations automatically | 10/10 |
| 6 | 🟠 HIGH | server/src/routes/webhook.routes.js:7-10 | 7-10 | Webhook secret can remain undefined and the missing-header request may compare equal to it | 9/10 |
| 7 | 🟠 HIGH | server/vercel.json; server/api/server.js; server/src/jobs/*.js | all | Serverless deployment entry point omits auction-close and email-outbox jobs | 9/10 |
| 8 | 🟠 HIGH | server/src/controllers/admin.controller.js:69-78 | 69-78 | Admin auction removal directly deletes data instead of using a transactional domain operation | 8/10 |
| 9 | 🟡 MEDIUM | server/src/utils/jwt.js; client/src/utils/authToken.js | jwt.js:7-11; authToken.js:1-20 | JWT bearer token is stored in localStorage and remains usable for up to seven days | 8/10 |
| 10 | 🟡 MEDIUM | server/src/services/bid.service.js:9-22 | 9-22 | Fast-path bid validation is separated from the locking RPC and race-prone snapshots precede the atomic insert | 7/10 |
| 11 | 🟡 MEDIUM | server/src/db/migrations/008_email_outbox.sql:72-106 | 72-106 | Anti-sniping repeatedly extends ends_at instead of setting a bounded new deadline | 8/10 |
| 12 | 🟡 MEDIUM | server/src/services/auction.service.js:32-54 | 32-54 | Post-bid edits silently discard requested price/deadline fields rather than rejecting the update | 8/10 |
| 13 | 🟡 MEDIUM | server/src/services/email.service.js:20-58 | 20-58 | Email enqueue failures are silently swallowed and password-reset requests still report success | 9/10 |
| 14 | 🟡 MEDIUM | server/src/services/stats.service.js:5-31 | 5-31 | Admin overview ignores individual count-query errors and can report zeros or partial data | 8/10 |
| 15 | 🟡 MEDIUM | server/src/middleware/rateLimit.js; server/src/app.js | rateLimit.js; app.js:10-22 | No proxy trust configuration or consistent deployment-side rate limiting is present | 7/10 |
| 16 | 🟡 MEDIUM | server/src/app.js; server/src/sockets/index.js | app.js:10-22; sockets/index.js:38-47 | No Helmet security headers or explicit CSP are configured | 7/10 |
| 17 | 🟡 MEDIUM | server/src/middleware/csrf.js:12-25 | 12-25 | Origin-only mutation protection is not a CSRF token and may fail for legitimate non-browser clients | 7/10 |
| 18 | ⚪ LOW | client/src/components/auction/AuctionForm.jsx:35-38 | 35-38 | Preview object URLs are not revoked, causing a browser memory leak across repeated selections | 7/10 |
| 19 | ⚪ LOW | client/src/pages/buyer/AuctionDetail.jsx:109-112 | 109-112 | UI end-state can remain stale until a rerender or socket event, relying on server enforcement | 6/10 |
| 20 | ⚪ LOW | server/src/middleware/schemas.js:30-71 | 30-71 | The password minimum of six characters is weak for account recovery and may not satisfy stronger security policy | 6/10 |

## Detailed Findings

### HIGH-1: Password reset and password change do not revoke sessions

**Files:** `server/src/services/passwordReset.service.js`, `server/src/services/profile.service.js`, `server/src/db/repositories/user.repo.js`, `server/src/middleware/auth.js`

**Root cause:** Reset/change updates `password_hash` only. There is no `session_version` increment in those flows. The login middleware validates `payload.sv` against the database, but logout is the only path that increments it.

**Impact:** Any copied JWT or active cookie remains valid after an owner changes or resets the password, until normal token expiry. Stolen sessions can continue to place bids, change profile data, and access protected operations.

### HIGH-2: Bid deletion RPC is not implemented

**Files:** `server/src/db/repositories/bid.repo.js`, `server/src/db/migrations/*`, `server/src/services/bid.service.js`, `server/src/routes/bid.routes.js`

**Root cause:** The repository calls `supabase.rpc('delete_bid', ...)`, but no migration creates that function. Searching all SQL migrations finds no `delete_bid` definition.

**Impact:** Every delete-bid request returns a database function-not-found error or an unhandled 500. The "My Bids" delete feature cannot work in a freshly migrated or production database.

### HIGH-3: Reset-token verification crashes

**File:** `server/src/controllers/auth.controller.js:34-38`

**Root cause:** The invalid-token branch calls `ApiError.badRequest(...)`, but `ApiError` is not imported by this controller.

**Impact:** Any invalid, expired, or missing reset-token verification request throws `ReferenceError` in the async handler and becomes a 500 response instead of a controlled 400. The reset page displays the generic error state instead of a reliable invalid-link response.

### HIGH-4: Password-reset token use is raceable

**Files:** `server/src/services/passwordReset.service.js`, `server/src/db/repositories/passwordReset.repo.js`

**Root cause:** `verifyToken` reads the token and verifies expiry/usage, then resetPassword separately updates the password and marks the token used. There is no transaction or conditional `UPDATE ... WHERE used_at IS NULL AND expires_at > now()` between these steps.

**Impact:** Two concurrent reset requests can both validate the same token and change the password. The later or slower request can overwrite a password chosen by the other request. The reset flow has no atomic replay protection.

### HIGH-5: Migration coverage and deployment automation are incomplete

**Files:** `README.md`, `server/src/db/migrations/009_profile.sql`, `server/src/db/migrations/0010_password_reset.sql`, `server/src/db/migrations/008_email_outbox.sql`

**Root cause:** The README migration instructions stop at migration 008, while profile fields and password-reset tables are in migrations 009 and 0010. The application never runs migrations.

**Impact:** Profile or password-reset operations fail if migrations 009/0010 were not manually applied. Operators can successfully deploy application code to an incompatible database schema. Migration order is operationally fragile and not repeatable by a deployment pipeline.

### HIGH-6: Webhook secret validation is unsafe if misconfigured

**File:** `server/src/routes/webhook.routes.js:7-10`

**Root cause:** It compares `req.headers["x-webhook-secret"]` directly to `process.env.SUPABASE_WEBHOOK_SECRET` without requiring the environment variable. If both are undefined, `undefined !== undefined` is false.

**Impact:** A request with no secret may be accepted when `SUPABASE_WEBHOOK_SECRET` is not configured. The current handler has only logging and no operational mutation, so immediate impact is limited, but it creates an unauthenticated webhook trust boundary and could become harmful if processing is enabled.

### HIGH-7: Serverless deployment omits background jobs

**Files:** `server/vercel.json`, `server/api/server.js`, `server/src/jobs/closeAuctions.job.js`, `server/src/jobs/emailOutbox.job.js`

**Root cause:** The Vercel entry exports an HTTP server and does not start either interval job. The Railway entry starts both jobs.

**Impact:** If the backend is deployed through `server/vercel.json`, active auctions do not close automatically and the durable email outbox is not processed unless externally scheduled. The README identifies this entry as legacy, but it remains an available deployment surface.

### HIGH-8: Admin direct auction deletion bypasses domain cleanup

**File:** `server/src/controllers/admin.controller.js:69-78`

**Root cause:** The admin removal handler directly deletes the auction row. This relies on database cascades and bypasses cancellation/notification transactions.

**Impact:** Bids cascade-delete, so bid history and auction evidence may be lost. Users and sellers receive no standardized cancellation or removal notification. It is also more difficult to audit a removed auction.

### MEDIUM-1: Bearer token in localStorage

**Files:** `client/src/utils/authToken.js`, `server/src/utils/jwt.js`, `client/src/api/axios.js`

**Root cause:** The implementation returns both a bearer token and an HttpOnly cookie. The bearer is persisted in localStorage for the default seven-day JWT lifetime.

**Impact:** JavaScript-running XSS can read the token and replay it until expiry or server-side invalidation. The repository already acknowledges this reduced security posture in the README.

### MEDIUM-2: Bid fast paths precede the atomic RPC

**Files:** `server/src/services/bid.service.js`, `server/src/db/migrations/008_email_outbox.sql`

**Root cause:** The service checks price and auction state before the RPC, and fetches the previous highest bidder in a separate query before locking and inserting.

**Impact:** Stale or duplicate notifications can occur under concurrent bidding. The actual RPC is serialized and rechecks the authoritative state, so bids themselves remain protected, but the snapshot and notification data can be inconsistent.

### MEDIUM-3: Anti-sniping can repeatedly extend

**File:** `server/src/db/migrations/008_email_outbox.sql:72-106`

**Root cause:** It calculates `v_new_end := v_auction.ends_at + interval '60 seconds'` when less than 60 seconds remains.

**Impact:** Repeated bids near the deadline extend the existing deadline again and again rather than establishing a fixed bounded deadline. A lively auction can remain open far beyond the intended end time.

### MEDIUM-4: Silently ignored post-bid edits

**File:** `server/src/services/auction.service.js:32-54`

**Root cause:** When bids exist, price, increment, and end-time fields are deleted from the patch instead of rejected.

**Impact:** API callers receive success even though their submitted fields were not applied. This is misleading and can create auction administration/UI inconsistencies.

### MEDIUM-5: Email delivery queue hides enqueue failures

**File:** `server/src/services/email.service.js:20-58`

**Root cause:** `sendMany` catches Supabase insert errors, logs them, and returns zero. `send` and password-reset callers interpret this as an unavailable or silently unsuccessful operation.

**Impact:** Password-reset or notification emails can disappear while the API reports success or the reset request appears to succeed.

### MEDIUM-6: Partial admin statistics can be reported

**File:** `server/src/services/stats.service.js:5-31`

**Root cause:** Count queries are awaited through `Promise.all`, but each result's `error` field is not checked.

**Impact:** Database/RLS/query failures can yield null or partial counts without throwing. The dashboard can display zero or incorrect totals.

### MEDIUM-7: Proxy/rate-limit deployment behavior

**Files:** `server/src/middleware/rateLimit.js`, `server/src/app.js`

**Root cause:** The app does not configure `trust proxy`, and rate limits use IP-based defaults on login/signup/forgot-password where applicable.

**Impact:** Behind Railway/Vercel, forwarded client IP handling can be inconsistent or produce shared limiter buckets. This can reduce login-protection effectiveness or cause false throttling. Express-rate-limit validation can also emit deployment warnings.

### MEDIUM-8: Missing Helmet/CSP headers

**Files:** `server/package.json`, `server/src/app.js`

**Root cause:** Helmet is installed but never registered.

**Impact:** Responses lack baseline browser hardening headers such as content-sniffing, frame, and other browser policy protections. Impact depends on the frontend hosting and CSP configuration.

### MEDIUM-9: Origin-only CSRF protection

**File:** `server/src/middleware/csrf.js:12-25`

**Root cause:** Mutation protection checks only `Origin` against a list and exempts webhook paths. It has no signed CSRF token or strict cookie-to-header binding.

**Impact:** It provides limited browser-origin protection, but protection is weaker than a double-submit or same-site-cookie token and can reject or accept requests differently across clients/proxies. The separate allowed-origin list and bearer/cookie combination reduce exploitation surface.

### LOW-1: Auction image preview memory leak

**File:** `client/src/components/auction/AuctionForm.jsx:35-38`

**Root cause:** `URL.createObjectURL` values are created but never revoked.

**Impact:** Repeatedly selecting files over a long session retains blob URLs and memory until page teardown.

### LOW-2: Local auction end-state freshness

**File:** `client/src/pages/buyer/AuctionDetail.jsx:109-112`

**Root cause:** `isEnded` is calculated from `Date.now()` during render, not by a timer; the countdown component may finish without updating the parent.

**Impact:** The bid form may remain enabled briefly after a deadline even though the server rejects the bid. The socket close event may refresh it, but timing is inconsistent.

### LOW-3: Weak password minimum

**File:** `server/src/middleware/schemas.js:30-71`

**Root cause:** Signup, password change, and reset accept passwords as short as six characters.

**Impact:** Accounts are more susceptible to guessing and credential attacks. This is lower severity than session and reset-flow defects but should be considered.

## Test Coverage Gaps

The existing suite has eight passing tests, but it does not directly execute:

- Password reset verification and concurrent reset use
- Password reset/change session revocation
- The missing `delete_bid` RPC
- Migration application against a fresh database
- Email-outbox enqueue failure behavior
- Real SMTP delivery and retries
- A real Supabase database instance
- A real deployed Vercel or Railway server
- Frontend build and route rendering

## Overall Assessment

The bidding and closing core has a good atomic-RPC foundation, and the existing tests confirm role checks, bounded pagination, session invalidation on logout, socket origin checks, and serialized bidding behavior. The highest-risk gaps are password-reset/session integrity, the missing delete-bid database routine, migration/deployment drift, and misconfiguration of scheduled background work.
