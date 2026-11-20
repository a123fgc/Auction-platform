# 🔨 AuctionHub — Full-Stack Auction Platform

Production-grade auction platform with real-time bidding, anti-sniping,
auto-close job, winner emails, and an admin dashboard.

## Stack

- **Backend:** Node.js + Express + Supabase (Postgres) + Socket.IO + Cloudinary + Nodemailer
- **Frontend:** React 18 + Vite + TailwindCSS + React Router + Axios
- **Auth:** JWT in an HTTP-only cookie, bcrypt
- **Realtime:** Socket.IO rooms (`auction:<id>`)

The browser bearer token is stored in localStorage at the user's request. This makes it readable to JavaScript and increases the impact of an XSS vulnerability; cookie-only HttpOnly auth is safer for production.

## Project layout

## Setup

### 1. Supabase

1. Create a project at https://supabase.com
2. Open **SQL Editor** and run migrations **in order**:
   - `server/src/db/migrations/001_users.sql`
   - `002_categories.sql`
   - `003_auctions.sql`
   - `004_bids.sql`
   - `005_functions.sql`
   - `006_user_session_version.sql`
   - `007_database_hardening.sql`
   - `008_email_outbox.sql`
   - `009_profile.sql`
   - `0010_password_reset.sql`
   - `0011_password_reset_atomic.sql`
   - `0012_delete_bid_atomic.sql`
   - `0013_remove_auction_atomic.sql`
   - `0014_bounded_anti_sniping.sql`
3. Apply these SQL files manually in order. The application never runs migrations automatically.
   Migration 007 checks for case-insensitive duplicate email addresses and stops with an error if cleanup is required; it does not modify user data.
   Migration 008 creates the durable email outbox and transactionally queues outbid, close, and cancellation notifications for SMTP delivery and retry.
4. Copy **Project URL** and **service_role key** from Settings → API

### Deployment configuration

The frontend and backend use separate environment examples: `client/.env.example` and `server/.env.example`. Do not copy backend secrets into Vercel or any `VITE_*` variable; Vite embeds those values in browser assets.

#### Vercel (frontend)

- Set the Vercel project root to `client`.
- Build command: `npm run build`; output directory: `dist`; install command: `npm ci`.
- Set `VITE_API_URL` to the Railway backend origin plus `/api` and `VITE_SOCKET_URL` to the same backend origin without `/api`. For the currently documented deployment, these are `https://cheerful-simplicity-production-1f983414.up.railway.app/api` and `https://cheerful-simplicity-production-1f983414.up.railway.app`.
- These are public endpoint URLs, not secrets. Do not put credentials, signing keys, or service-role keys in Vercel frontend variables.

#### Railway (backend)

- Set the service root directory to `server`, build/install with `npm ci`, and start with `npm start`.
- The server binds to `0.0.0.0` and the validated `PORT` supplied by Railway (fallback `5000` for local use).
- Set `NODE_ENV=production` and `CLIENT_URL` to the exact deployed frontend origin `https://client-6b460au9k-asad-developer.vercel.app`. Add only intentionally supported origins to `CLIENT_URLS`.
- Set `TRUST_PROXY=1` when the backend runs behind a single reverse proxy (Railway/Vercel). Set it to `0` only for direct connections.
- Set `CRON_SECRET` to a long random value when using the serverless entry point.
- Configure the backend-only values from `server/.env.example` in Railway's variable manager. Their values are not verifiable from this repository. SMTP settings are required for production email delivery.
- Use `/api/health` for process liveness and `/api/ready` for readiness; readiness returns `503` when the database check fails. Configure the Railway health check to `/api/ready` after migrations have been applied.
- Apply migrations manually, in order, before deploying code that depends on them. This repository does not apply migrations automatically.

`server/vercel.json` and `server/api/server.js` are a legacy serverless entry point. They do not run the Railway scheduled jobs and should not be used as the backend deployment configuration. The root Vercel project should target `client`.

### 2. Backend

```bash
cd server
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
npm install
npm run dev       # http://localhost:5000
