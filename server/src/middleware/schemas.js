const { z } = require('zod');

const MAX_MONEY = 9_999_999_999.99;
const pageNumber = z.string().regex(/^\d+$/).default('1').transform(Number)
  .pipe(z.number().int().min(1).max(10_000));
const pageLimit = (defaultValue = 20, maximum = 50) => z.string().regex(/^\d+$/)
  .default(String(defaultValue)).transform(Number)
  .pipe(z.number().int().min(1).max(maximum));
const searchText = z.string().trim().max(100)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Search cannot contain control characters')
  .optional();
const paginationFields = (defaultLimit = 20, maximumLimit = 50) => ({
  page: pageNumber,
  limit: pageLimit(defaultLimit, maximumLimit),
});
const uuid = z.string().uuid();
const categoryId = z.string().uuid().nullable().optional()
  .or(z.literal('').transform(() => null));

function money({ min = 0 } = {}) {
  return z.union([
    z.number().finite(),
    z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  ]).transform(Number)
    .pipe(z.number().finite().min(min).max(MAX_MONEY))
    .refine((amount) => {
      const cents = amount * 100;
      return Math.abs(cents - Math.round(cents)) < 1e-7;
    }, 'Amount must use at most two decimal places');
}

const timestamp = z.string().refine((value) => (
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value))
), 'Timestamp must be ISO 8601 and include a timezone');

// ─── Auth ────────────────────────────────────────────────────────────
const signupSchema = z.object({
  full_name: z.string().min(2, 'Name too short').max(80),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 chars').max(72),
  role: z.enum(['buyer', 'seller']).default('buyer'),
}).strict();

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
}).strict();

// ─── Auctions ────────────────────────────────────────────────────────
const auctionCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  starting_price: money(),
  min_increment: money({ min: 0.01 }).optional().default(1),
  category_id: categoryId,
  ends_at: timestamp,
  // images: z.array(...).optional() // Ise filhal hata dein ya optional rakhein
}).strict();

const auctionUpdateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).optional(),
  starting_price: money({ min: 0.01 }).optional(),
  min_increment: money({ min: 0.01 }).optional(),
  category_id: categoryId,
  ends_at: timestamp.optional(),
}).strict();

// ─── Bids ────────────────────────────────────────────────────────────
const bidSchema = z.object({
  amount: money({ min: 0.01 }),
}).strict();

const paginationSchema = z.object(paginationFields()).strict();
const auctionListQuerySchema = z.object({
  ...paginationFields(12, 48),
  search: searchText,
  category: uuid.optional(),
  sort: z.enum(['ending_soon', 'newest', 'price_asc', 'price_desc']).default('ending_soon'),
}).strict();
const sellerAuctionListQuerySchema = z.object({
  ...paginationFields(12, 48),
  status: z.enum(['active', 'ended', 'cancelled']).optional(),
  sort: z.enum(['ending_soon', 'newest', 'price_asc', 'price_desc']).default('newest'),
}).strict();
const adminUserListQuerySchema = z.object({
  ...paginationFields(),
  role: z.enum(['buyer', 'seller', 'admin']).optional(),
  search: searchText,
}).strict();
const adminAuctionListQuerySchema = z.object({
  ...paginationFields(),
  status: z.enum(['active', 'ended', 'cancelled']).optional(),
  search: searchText,
}).strict();
const suspendUserSchema = z.object({ suspended: z.boolean().default(true) }).strict();
const idParamSchema = z.object({ id: uuid }).strict();
const auctionIdParamSchema = z.object({ auctionId: uuid }).strict();

// ─── Exports ─────────────────────────────────────────────────────────
module.exports = {
  signupSchema,
  loginSchema,
  auctionCreateSchema,
  auctionUpdateSchema,
  bidSchema,
  paginationSchema,
  auctionListQuerySchema,
  sellerAuctionListQuerySchema,
  adminUserListQuerySchema,
  adminAuctionListQuerySchema,
  suspendUserSchema,
  idParamSchema,
  auctionIdParamSchema,
};
