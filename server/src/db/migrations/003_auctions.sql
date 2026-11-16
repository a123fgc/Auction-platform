create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text not null,
  images text[] not null default '{}',
  starting_price numeric(12,2) not null check (starting_price >= 0),
  current_price numeric(12,2) not null,
  min_increment numeric(12,2) not null default 1.00 check (min_increment > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active','ended','cancelled')),
  winner_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_auction_dates check (ends_at > starts_at)
);

create index if not exists idx_auctions_status on public.auctions (status);
create index if not exists idx_auctions_seller on public.auctions (seller_id);
create index if not exists idx_auctions_category on public.auctions (category_id);
create index if not exists idx_auctions_ends_at on public.auctions (ends_at);

drop trigger if exists trg_auctions_updated_at on public.auctions;
create trigger trg_auctions_updated_at
before update on public.auctions
for each row execute function public.set_updated_at();