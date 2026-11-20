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
    v_new_end := v_now + interval '60 seconds';
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

revoke all on function public.place_bid(uuid, uuid, numeric)
  from public, anon, authenticated;
grant execute on function public.place_bid(uuid, uuid, numeric)
  to service_role;
