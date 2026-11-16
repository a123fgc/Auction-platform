const { z } = require('zod');

// ─── Auth ────────────────────────────────────────────────────────────
const signupSchema = z.object({
  full_name: z.string().min(2, 'Name too short').max(80),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 chars').max(72),
  role: z.enum(['buyer', 'seller']).default('buyer'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

// ─── Auctions ────────────────────────────────────────────────────────
const auctionCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  starting_price: z.coerce.number().nonnegative(),
  min_increment: z.coerce.number().positive().optional().default(1),
  category_id: z.string().uuid().optional().nullable().or(z.literal('').transform(() => null)),
  ends_at: z.string().refine((val) => !isNaN(new Date(val).getTime()), "Invalid date"),
  // images: z.array(...).optional() // Ise filhal hata dein ya optional rakhein
});

const auctionUpdateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
  starting_price: z.coerce.number().positive().optional(),
  ends_at: z.coerce.date().optional(),
  status: z.enum(['active', 'closed', 'cancelled']).optional(),
});

// ─── Bids ────────────────────────────────────────────────────────────
const bidSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
});

// ─── Exports ─────────────────────────────────────────────────────────
module.exports = {
  signupSchema,
  loginSchema,
  auctionCreateSchema,
  auctionUpdateSchema,
  bidSchema,
};