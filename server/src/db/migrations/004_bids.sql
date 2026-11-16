create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_bids_auction on public.bids (auction_id, created_at desc);
create index if not exists idx_bids_bidder on public.bids (bidder_id, created_at desc);