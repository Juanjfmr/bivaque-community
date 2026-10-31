-- Fix: promoting a revoked operator silently did nothing.
--
-- The bootstrap RPC used "on conflict (auth_user_id) do nothing", so calling it
-- for a user whose row already carried revoked_at left them revoked while still
-- returning their user id. The return value is the only signal the caller gets,
-- and it says success either way, so a re-grant could fail with nothing to show
-- for it. The failure surfaces later as an operator who cannot act and a row
-- that has to be read by hand to explain why.
--
-- Reactivation is now explicit: the conflict path clears revoked_at and
-- revoked_by, and refreshes granted_by and granted_at so the audit trail
-- records who restored access and when, not who granted it the first time.
--
-- granted_by stays null when the call comes from service_role, which has no
-- JWT and therefore no auth.uid(). That is unchanged and inherent to
-- bootstrapping: the first grant in a fresh environment has no human to
-- attribute it to.

create or replace function private.promote_operator_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where email = target_email;

  if target_id is null then
    raise exception 'no auth.users row with email %', target_email;
  end if;

  insert into public.operators (auth_user_id, granted_by, notes)
  values (
    target_id,
    (select auth.uid()),
    'promoted by private.promote_operator_by_email'
  )
  on conflict (auth_user_id) do update
    set revoked_at = null,
        revoked_by = null,
        granted_by = (select auth.uid()),
        granted_at = now();

  return target_id;
end;
$$;

revoke all on function private.promote_operator_by_email(text) from public;
revoke all on function private.promote_operator_by_email(text) from anon;
revoke all on function private.promote_operator_by_email(text) from authenticated;

grant execute on function private.promote_operator_by_email(text) to service_role;
