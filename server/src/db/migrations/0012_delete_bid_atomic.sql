create or replace function public.delete_bid(
  p_bid_id uuid,
  p_bidder_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_bid public.bids;
  v_auction public.auctions;
  v_new_price numeric;
begin
  select b.*
  into v_bid
  from public.bids as b
  where b.id = p_bid_id
    and b.bidder_id = p_bidder_id;

  if not found then
    raise exception 'BID_NOT_FOUND_OR_FORBIDDEN';
  end if;

  select a.*
  into v_auction
  from public.auctions as a
  where a.id = v_bid.auction_id
  for update;

  if not found then
    raise exception 'AUCTION_NOT_FOUND';
  end if;
  if v_auction.status <> 'active' then
    raise exception 'AUCTION_NOT_ACTIVE';
  end if;
  if clock_timestamp() >= v_auction.ends_at then
    raise exception 'AUCTION_ENDED';
  end if;

  select b.*
  into v_bid
  from public.bids as b
  where b.id = p_bid_id
    and b.bidder_id = p_bidder_id
  for update;

  if not found then
    raise exception 'BID_NOT_FOUND_OR_FORBIDDEN';
  end if;

  delete from public.bids as b
  where b.id = v_bid.id;

  select b.amount
  into v_new_price
  from public.bids as b
  where b.auction_id = v_auction.id
  order by b.amount desc, b.created_at desc, b.id desc
  limit 1;

  v_new_price := coalesce(v_new_price, v_auction.starting_price);

  update public.auctions as a
  set current_price = v_new_price,
      updated_at = clock_timestamp()
  where a.id = v_auction.id
  returning a.* into v_auction;

  return jsonb_build_object(
    'bid', to_jsonb(v_bid),
    'auction', to_jsonb(v_auction)
  );
end;
$$;

revoke all on function public.delete_bid(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_bid(uuid, uuid)
  to service_role;
