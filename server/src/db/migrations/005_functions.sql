-- Atomic place_bid() with row lock + anti-sniping
create or replace function public.place_bid(
  p_auction_id uuid,
  p_bidder_id uuid,
  p_amount numeric
)
returns public.bids
language plpgsql
security definer
as $$
declare
  v_auction public.auctions;
  v_bid public.bids;
  v_min numeric;
  v_new_end timestamptz;
begin
  -- lock auction row
  select * into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    raise exception 'AUCTION_NOT_FOUND';
  end if;

  if v_auction.status <> 'active' then
    raise exception 'AUCTION_NOT_ACTIVE';
  end if;

  if now() >= v_auction.ends_at then
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

  -- anti-sniping: extend if < 60s left
  if v_auction.ends_at - now() < interval '60 seconds' then
    v_new_end := v_auction.ends_at + interval '60 seconds';
  else
    v_new_end := v_auction.ends_at;
  end if;

  update public.auctions
  set current_price = p_amount,
      ends_at = v_new_end,
      updated_at = now()
  where id = p_auction_id;

  return v_bid;
end;
$$;