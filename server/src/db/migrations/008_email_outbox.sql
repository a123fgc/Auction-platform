-- Apply manually after migrations 001-007. The app does not run migrations.
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  template_key text not null default 'raw',
  payload jsonb not null default '{}'::jsonb,
  subject text,
  html_body text,
  text_body text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'dead')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint chk_email_outbox_raw_content check (
    template_key <> 'raw' or (subject is not null and html_body is not null)
  )
);

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public, anon, authenticated;
grant all on public.email_outbox to service_role;

create index if not exists idx_email_outbox_pending
  on public.email_outbox (next_attempt_at, created_at)
  where status = 'pending';
create index if not exists idx_email_outbox_stale_processing
  on public.email_outbox (locked_at)
  where status = 'processing';

-- Bid state and outbid notification commit in the same transaction.
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
  v_previous record;
  v_min numeric;
  v_new_end timestamptz;
  v_now timestamptz;
begin
  select a.* into v_auction
  from public.auctions as a
  where a.id = p_auction_id
  for update;

  if not found then raise exception 'AUCTION_NOT_FOUND'; end if;
  v_now := clock_timestamp();
  if v_auction.status <> 'active' then raise exception 'AUCTION_NOT_ACTIVE'; end if;
  if v_now >= v_auction.ends_at then raise exception 'AUCTION_ENDED'; end if;
  if v_auction.seller_id = p_bidder_id then raise exception 'SELLER_CANNOT_BID'; end if;

  v_min := v_auction.current_price + v_auction.min_increment;
  if p_amount < v_min then raise exception 'BID_TOO_LOW'; end if;

  select b.bidder_id, b.amount, u.email, u.full_name
  into v_previous
  from public.bids as b
  join public.users as u on u.id = b.bidder_id
  where b.auction_id = p_auction_id
  order by b.amount desc, b.created_at desc, b.id desc
  limit 1;

  insert into public.bids (auction_id, bidder_id, amount)
  values (p_auction_id, p_bidder_id, p_amount)
  returning * into v_bid;

  if v_previous.bidder_id is not null and v_previous.bidder_id <> p_bidder_id then
    insert into public.email_outbox (recipient, template_key, payload)
    values (
      v_previous.email,
      'outbid',
      jsonb_build_object(
        'name', v_previous.full_name,
        'auctionTitle', v_auction.title,
        'auctionId', p_auction_id::text,
        'newAmount', v_previous.amount,
        'currentAmount', p_amount
      )
    );
  end if;

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

-- Closing and all winner/seller notification records commit together.
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
  v_top record;
  v_seller public.users;
begin
  select a.* into v_auction
  from public.auctions as a
  where a.id = p_auction_id
  for update;

  if not found or v_auction.status <> 'active' then return null; end if;
  if not coalesce(p_force, false) and v_auction.ends_at > clock_timestamp() then return null; end if;

  select b.bidder_id, b.amount, u.email, u.full_name
  into v_top
  from public.bids as b
  join public.users as u on u.id = b.bidder_id
  where b.auction_id = p_auction_id
  order by b.amount desc, b.created_at desc, b.id desc
  limit 1;

  select u.* into v_seller from public.users as u where u.id = v_auction.seller_id;

  update public.auctions as a
  set status = 'ended', winner_id = v_top.bidder_id
  where a.id = p_auction_id
  returning a.* into v_auction;

  if v_top.bidder_id is not null then
    insert into public.email_outbox (recipient, template_key, payload)
    values
      (v_top.email, 'auction_won', jsonb_build_object(
        'name', v_top.full_name,
        'auctionTitle', v_auction.title,
        'auctionId', p_auction_id::text,
        'amount', v_top.amount,
        'sellerName', v_seller.full_name
      )),
      (v_seller.email, 'auction_sold', jsonb_build_object(
        'name', v_seller.full_name,
        'auctionTitle', v_auction.title,
        'auctionId', p_auction_id::text,
        'amount', v_top.amount,
        'winnerName', v_top.full_name
      ));
  else
    insert into public.email_outbox (recipient, template_key, payload)
    values (v_seller.email, 'auction_ended', jsonb_build_object(
      'name', v_seller.full_name,
      'auctionTitle', v_auction.title,
      'auctionId', p_auction_id::text
    ));
  end if;

  return v_auction;
end;
$$;

revoke all on function public.close_auction_atomic(uuid, boolean) from public, anon, authenticated;
grant execute on function public.close_auction_atomic(uuid, boolean) to service_role;

create or replace function public.claim_email_outbox(p_batch_size integer default 10)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  with candidates as (
    select e.id
    from public.email_outbox as e
    where (e.status = 'pending' and e.next_attempt_at <= clock_timestamp())
       or (e.status = 'processing' and e.locked_at < clock_timestamp() - interval '10 minutes')
    order by e.created_at
    limit greatest(1, least(coalesce(p_batch_size, 10), 50))
    for update skip locked
  )
  update public.email_outbox as e
  set status = 'processing',
      locked_at = clock_timestamp(),
      attempts = e.attempts + 1
  from candidates as c
  where e.id = c.id
  returning e.*;
end;
$$;

revoke all on function public.claim_email_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_email_outbox(integer) to service_role;

-- Cancellation and its notification records commit or roll back together.
create or replace function public.cancel_auction_with_notifications(
  p_auction_id uuid,
  p_actor_id uuid
)
returns public.auctions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_auction public.auctions;
  v_actor_role text;
begin
  select a.* into v_auction
  from public.auctions as a
  where a.id = p_auction_id
  for update;

  if not found then
    return null;
  end if;

  select u.role into v_actor_role
  from public.users as u
  where u.id = p_actor_id and not u.is_suspended;

  if v_actor_role is null
     or v_actor_role not in ('seller', 'admin')
     or (v_actor_role <> 'admin' and v_auction.seller_id <> p_actor_id) then
    raise exception 'CANCEL_NOT_ALLOWED';
  end if;

  if v_auction.status <> 'active' then
    return null;
  end if;

  update public.auctions as a
  set status = 'cancelled'
  where a.id = p_auction_id
  returning a.* into v_auction;

  insert into public.email_outbox (recipient, template_key, payload)
  select distinct on (u.id)
    u.email,
    'auction_cancelled',
    jsonb_build_object(
      'name', u.full_name,
      'auctionTitle', v_auction.title,
      'auctionId', v_auction.id::text
    )
  from public.bids as b
  join public.users as u on u.id = b.bidder_id
  where b.auction_id = p_auction_id
  order by u.id;

  return v_auction;
end;
$$;

revoke all on function public.cancel_auction_with_notifications(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_auction_with_notifications(uuid, uuid) to service_role;
