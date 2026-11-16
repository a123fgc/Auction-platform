/* eslint-disable no-console */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const SALT_ROUNDS = 10;
const SELLER_COUNT = 2;
const BUYER_COUNT = 10;
const AUCTION_COUNT = 15;

const CATEGORY_SLUGS = [
  'electronics',
  'fashion',
  'home-garden',
  'collectibles',
  'sports',
  'vehicles',
];

const AUCTION_TITLES = [
  'Vintage Rolex Submariner',
  'MacBook Pro 16" M3 Max',
  'Antique Wooden Rocking Chair',
  'Signed Michael Jordan Jersey',
  'Canon EOS R5 Camera',
  'Original Star Wars Poster (1977)',
  'Leather Chesterfield Sofa',
  'Nintendo Switch OLED Bundle',
  'Diamond Tennis Bracelet',
  'Trek Mountain Bike 2022',
  'First Edition Harry Potter Set',
  'PS5 Disc Edition + Games',
  'Handmade Persian Rug',
  'Vintage Gibson Les Paul',
  'Ray-Ban Aviator Sunglasses',
];

const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
  'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800',
];

async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id,slug');
  if (error) throw error;
  return data;
}

async function clearData() {
  console.log('[seed] clearing existing data...');
  await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('auctions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase
    .from('users')
    .delete()
    .neq('email', 'admin@auction.local');
}

async function ensureAdmin() {
  const hash = await bcrypt.hash('admin123', SALT_ROUNDS);
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@auction.local')
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('users')
    .insert({
      email: 'admin@auction.local',
      password_hash: hash,
      full_name: 'Admin User',
      role: 'admin',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function createUsers() {
  const password_hash = await bcrypt.hash('password123', SALT_ROUNDS);

  const sellers = Array.from({ length: SELLER_COUNT }).map((_, i) => ({
    email: `seller${i + 1}@auction.local`,
    password_hash,
    full_name: `Seller ${i + 1}`,
    role: 'seller',
  }));

  const buyers = Array.from({ length: BUYER_COUNT }).map((_, i) => ({
    email: `buyer${i + 1}@auction.local`,
    password_hash,
    full_name: `Buyer ${i + 1}`,
    role: 'buyer',
  }));

  const { data: createdSellers, error: sErr } = await supabase
    .from('users')
    .insert(sellers)
    .select('id,full_name,role');
  if (sErr) throw sErr;

  const { data: createdBuyers, error: bErr } = await supabase
    .from('users')
    .insert(buyers)
    .select('id,full_name,role');
  if (bErr) throw bErr;

  return { sellers: createdSellers, buyers: createdBuyers };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function createAuctions(sellers, categories) {
  const now = Date.now();
  const rows = [];

  for (let i = 0; i < AUCTION_COUNT; i += 1) {
    const seller = sellers[i % sellers.length];
    const category = categories[i % categories.length];
    const startPrice = Math.round((50 + Math.random() * 950) * 100) / 100;
    const durationH = 24 + Math.floor(Math.random() * 120); // 1–6 days
    const starts_at = new Date(now - 1000 * 60 * 30).toISOString(); // started 30 min ago
    const ends_at = new Date(now + durationH * 3600 * 1000).toISOString();

    rows.push({
      seller_id: seller.id,
      category_id: category.id,
      title: AUCTION_TITLES[i % AUCTION_TITLES.length],
      description: `This is a premium ${AUCTION_TITLES[
        i % AUCTION_TITLES.length
      ].toLowerCase()} being auctioned. Item is in excellent condition, comes from a smoke-free home. Place your bids before time runs out!`,
      images: [pick(IMAGE_POOL), pick(IMAGE_POOL)],
      starting_price: startPrice,
      current_price: startPrice,
      min_increment: 5,
      starts_at,
      ends_at,
      status: 'active',
    });
  }

  const { data, error } = await supabase
    .from('auctions')
    .insert(rows)
    .select('id,current_price,min_increment,seller_id');
  if (error) throw error;
  return data;
}

async function createBids(auctions, buyers) {
  const bidRows = [];

  for (const auction of auctions) {
    const numBids = 1 + Math.floor(Math.random() * 5);
    let current = Number(auction.current_price);
    const increment = Number(auction.min_increment);
    const usedBuyers = new Set();

    for (let i = 0; i < numBids; i += 1) {
      let buyer = pick(buyers);
      let attempts = 0;
      while (
        (usedBuyers.has(buyer.id) && attempts < 10) ||
        buyer.id === auction.seller_id
      ) {
        buyer = pick(buyers);
        attempts += 1;
      }
      if (buyer.id === auction.seller_id) continue;

      current = current + increment + Math.floor(Math.random() * 20);
      bidRows.push({
        auction_id: auction.id,
        bidder_id: buyer.id,
        amount: Math.round(current * 100) / 100,
      });
      usedBuyers.add(buyer.id);

      // Keep auction current_price in sync
      await supabase
        .from('auctions')
        .update({ current_price: current })
        .eq('id', auction.id);
    }
  }

  if (bidRows.length) {
    const { error } = await supabase.from('bids').insert(bidRows);
    if (error) throw error;
  }
  return bidRows.length;
}

async function main() {
  console.log('[seed] starting...');

  await clearData();
  const adminId = await ensureAdmin();
  console.log(`[seed] admin ready (id=${adminId})`);

  const categories = await getCategories();
  if (!categories.length) {
    throw new Error('No categories found. Run migration 002_categories.sql first.');
  }

  const { sellers, buyers } = await createUsers();
  console.log(`[seed] created ${sellers.length} sellers + ${buyers.length} buyers`);

  const auctions = await createAuctions(sellers, categories);
  console.log(`[seed] created ${auctions.length} auctions`);

  const bidCount = await createBids(auctions, buyers);
  console.log(`[seed] created ${bidCount} bids`);

  console.log('\n========================================');
  console.log('SEED COMPLETE');
  console.log('========================================');
  console.log('Admin:   admin@auction.local   / admin123');
  console.log('Seller:  seller1@auction.local / password123');
  console.log('Buyer:   buyer1@auction.local  / password123');
  console.log('========================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] FAILED:', err.message);
  process.exit(1);
});