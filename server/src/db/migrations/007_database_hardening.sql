-- Run manually after migrations 001-006. This file is never applied by the app.

-- Preserve the RPC as the only bid-writing path for untrusted database roles.
create or replace function public.place_bid(
  p_auction_id uuid,
  p_bidder_id uuid,
  p_amount numeric
)
returns public.bids
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_auction public.auctions;
  v_bid public.bids;
  v_min numeric;
  v_new_end timestamptz;
  v_now timestamptz;
begin
  select a.* into v_auction
  from public.auctions as a
  where a.id = p_auction_id
  for update;

  if not found then
    raise exception 'AUCTION_NOT_FOUND';
  end if;

  -- Check wall-clock time after the row lock is acquired.
  v_now := clock_timestamp();

  if v_auction.status <> 'active' then
    raise exception 'AUCTION_NOT_ACTIVE';
  end if;

  if v_now >= v_auction.ends_at then
    raise exception 'AUCTION_ENDED';
  end if;

  if v_auction.seller_id = p_bidder_id then
    raise exception 'SELLER_CANNOT_BID';
  end if;

  v_min := v_auction.current_price + v_auction.min_increment;
  if p_amount < v_min then
    raise exception 'BID_TOO_LOW';
  end if;

  insert into public.bids (auction_id, bidder_id, amount)
  values (p_auction_id, p_bidder_id, p_amount)
  returning * into v_bid;

  if v_auction.ends_at - v_now < interval '60 seconds' then
    v_new_end := v_auction.ends_at + interval '60 seconds';
  else
    v_new_end := v_auction.ends_at;
  end if;

  update public.auctions as a
  set current_price = p_amount,
      ends_at = v_new_end,
      updated_at = v_now
  where a.id = p_auction_id;

  return v_bid;
end;
$$;

revoke all on function public.place_bid(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.place_bid(uuid, uuid, numeric) to service_role;

-- The close operation uses the same auction row lock as place_bid(). Winner
-- selection and the state transition happen in one transaction.
create or replace function public.close_auction_atomic(
  p_auction_id uuid,
  p_force boolean default false
)
returns public.auctions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_auction public.auctions;
  v_winner_id uuid;
begin
  select a.* into v_auction
  from public.auctions as a
  where a.id = p_auction_id
  for update;

  if not found or v_auction.status <> 'active' then
    return null;
  end if;

  if not coalesce(p_force, false) and v_auction.ends_at > clock_timestamp() then
    return null;
  end if;

  select b.bidder_id into v_winner_id
  from public.bids as b
  where b.auction_id = p_auction_id
  order by b.amount desc, b.created_at desc, b.id desc
  limit 1;

  update public.auctions as a
  set status = 'ended', winner_id = v_winner_id
  where a.id = p_auction_id
  returning a.* into v_auction;

  return v_auction;
end;
$$;

revoke all on function public.close_auction_atomic(uuid, boolean) from public, anon, authenticated;
grant execute on function public.close_auction_atomic(uuid, boolean) to service_role;

-- This index backs the case-insensitive email uniqueness used by signup.
do $$
begin
  if exists (
    select 1
    from public.users
    group by lower(email)
    having count(*) > 1
  ) then
    raise exception 'Cannot add case-insensitive email uniqueness: duplicate emails differ only by case';
  end if;
end;
$$;

create unique index if not exists idx_users_email_lower_unique
  on public.users (lower(email));
drop index if exists public.idx_users_email;

-- The old general ends_at index is retained; this smaller index targets the
-- frequent expired-active-auction scan.
create index if not exists idx_auctions_active_ends_at
  on public.auctions (ends_at)
  where status = 'active';

create index if not exists idx_bids_auction_amount_top
  on public.bids (auction_id, amount desc, created_at desc, id desc)
  include (bidder_id);

-- NOT VALID avoids scanning existing rows during deployment while enforcing
-- the invariant for all subsequently inserted or updated auction rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_auctions_current_price_gte_starting'
      and conrelid = 'public.auctions'::regclass
  ) then
    alter table public.auctions
      add constraint chk_auctions_current_price_gte_starting
      check (current_price >= starting_price) not valid;
  end if;
end;
$$;
