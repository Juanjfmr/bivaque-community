-- D2/D07: anti-enumeration. A caller may attempt Portal verification at most
-- three times per rolling hour. The response is generic and identical for all
-- denied paths, so the browser never learns whether the CPF is absent, not a
-- serviceman, rate-limited, or failed because the API was unstable.

alter table private.verification_outcomes
  add column attempt_count integer not null default 0,
  add column first_attempt_at timestamptz,
  add column last_attempt_at timestamptz;

create function private.consume_verification_attempt(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_attempt timestamptz;
  v_attempt_count integer;
begin
  select last_attempt_at, attempt_count
  into v_last_attempt, v_attempt_count
  from private.verification_outcomes
  where user_id = p_user_id
  for update;

  if not found then
    insert into private.verification_outcomes (
      user_id,
      status,
      attempt_count,
      first_attempt_at,
      last_attempt_at
    )
    values (
      p_user_id,
      'pending',
      1,
      now(),
      now()
    );
    return true;
  end if;

  if v_last_attempt is null or v_last_attempt < now() - interval '1 hour' then
    update private.verification_outcomes
    set
      attempt_count = 1,
      first_attempt_at = now(),
      last_attempt_at = now()
    where user_id = p_user_id;
    return true;
  end if;

  if v_attempt_count >= 3 then
    return false;
  end if;

  update private.verification_outcomes
  set
    attempt_count = v_attempt_count + 1,
    last_attempt_at = now()
  where user_id = p_user_id;

  return true;
end;
$$;

revoke all on function private.consume_verification_attempt(uuid) from public;
grant execute on function private.consume_verification_attempt(uuid) to service_role;

create function public.consume_verification_attempt(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.consume_verification_attempt(p_user_id);
$$;

revoke all on function public.consume_verification_attempt(uuid) from public;
revoke all on function public.consume_verification_attempt(uuid) from anon;
revoke all on function public.consume_verification_attempt(uuid) from authenticated;
grant execute on function public.consume_verification_attempt(uuid) to service_role;
