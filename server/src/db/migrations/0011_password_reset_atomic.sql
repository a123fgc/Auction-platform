create or replace function public.consume_password_reset(
  p_token_hash text,
  p_password_hash text
)
returns table(user_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_token public.password_reset_tokens;
  v_user_id uuid;
begin
  select t.*
  into v_token
  from public.password_reset_tokens as t
  where t.token_hash = p_token_hash
  for update;

  if not found
     or v_token.used_at is not null
     or v_token.expires_at < clock_timestamp()
  then
    return;
  end if;

  update public.password_reset_tokens as t
  set used_at = clock_timestamp()
  where t.id = v_token.id;

  update public.users as u
  set password_hash = p_password_hash,
      session_version = u.session_version + 1
  where u.id = v_token.user_id
  returning u.id into v_user_id;

  if v_user_id is null then
    return;
  end if;

  user_id := v_user_id;
  return next;
end;
$$;

revoke all on function public.consume_password_reset(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_password_reset(text, text)
  to service_role;
