# 🔨 AuctionHub — Full-Stack Auction Platform

Production-grade auction platform with real-time bidding, anti-sniping,
auto-close job, winner emails, and an admin dashboard.

## Stack

- **Backend:** Node.js + Express + Supabase (Postgres) + Socket.IO + Cloudinary + Nodemailer
- **Frontend:** React 18 + Vite + TailwindCSS + React Router + Axios
- **Auth:** JWT (HTTP-only cookie + Bearer fallback), bcrypt
- **Realtime:** Socket.IO rooms (`auction:<id>`)

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
3. Copy **Project URL** and **service_role key** from Settings → API

### 2. Backend

```bash
cd server
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
npm install
npm run dev       # http://localhost:5000