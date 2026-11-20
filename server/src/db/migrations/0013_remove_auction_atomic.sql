create or replace function public.remove_auction_atomic(
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
  select u.role
  into v_actor_role
  from public.users as u
  where u.id = p_actor_id
    and u.is_suspended = false;

  if v_actor_role is null or v_actor_role <> 'admin' then
    raise exception 'REMOVE_NOT_ALLOWED';
  end if;

  select a.*
  into v_auction
  from public.auctions as a
  where a.id = p_auction_id
  for update;

  if not found then
    return null;
  end if;

  if v_auction.status = 'active' then
    return public.cancel_auction_with_notifications(p_auction_id, p_actor_id);
  end if;

  update public.auctions as a
  set status = 'cancelled',
      updated_at = clock_timestamp()
  where a.id = p_auction_id
  returning a.* into v_auction;

  return v_auction;
end;
$$;

revoke all on function public.remove_auction_atomic(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.remove_auction_atomic(uuid, uuid)
  to service_role;
