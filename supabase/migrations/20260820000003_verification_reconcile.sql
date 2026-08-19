-- D2 Task 2 — reconciliation of stuck pending verifications (CPF-free slice).
--
-- The plan's auto re-verification step (re-call the Portal with the raw CPF)
-- is owner-blocked: this repository never persists the CPF (AGENTS.md), and
-- verification_outcomes has a guarding test that forbids a cpf column, so the
-- server has nothing to re-submit. This migration implements everything the
-- job can do without that decision: a bounded wait, a retry cap, a handoff to
-- the operator's manual queue, and a notification. The moment the owner opts
-- into transient encrypted CPF storage, the dispatch endpoint must add the
-- portal guard check (createPortalVerificationGuard) before re-calling the
-- Portal — see the plan note and the handoff.

create extension if not exists pg_net;

-- The retry counter is separate from the user's browser quota. The job never
-- calls consume_verification_attempt: that counter is anti-enumeration against
-- the browser, and the job is not the browser. Burning it on behalf of a
-- person who was capped would strand her forever.
alter table private.verification_outcomes
  add column reconcile_attempts integer not null default 0;

-- The cap that bounds the wait. Cadence is 15 minutes and a row only becomes a
-- candidate 30 minutes after its last change, so five dispatches mean roughly
-- two and a half hours before a stuck row is handed to the manual queue.
-- Never a loop that re-touches the Portal: there is no Portal call here at all
-- (see header) and the cap guarantees the row leaves 'pending' on its own.
create function private.verification_max_reconcile_attempts()
returns integer
language sql
stable
set search_path = ''
as $$
  select 5::integer;
$$;

-- Candidates for the next dispatch: stuck rows that have not changed in 30
-- minutes and have not hit the cap, oldest first. The 30-minute age is what
-- separates "the Portal was down an hour ago" from "the user is typing right
-- now" — the latter must never be swept up by the job mid-flow.
create function private.verification_reconcile_candidates(p_limit integer default 20)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select v.user_id
  from private.verification_outcomes v
  where v.status in ('pending', 'temporary_error')
    and v.updated_at < now() - interval '30 minutes'
    and v.reconcile_attempts < private.verification_max_reconcile_attempts()
  order by v.updated_at asc
  limit greatest(1, p_limit);
$$;

-- Lease the rows being handed to the app: bumps the retry counter (one dispatch
-- is one try) and resets the clock so a slow endpoint cannot double-select the
-- same row on the next run.
create function private.verification_reconcile_lease(p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update private.verification_outcomes
  set reconcile_attempts = reconcile_attempts + 1,
      updated_at = now()
  where user_id = any(p_user_ids)
    and status in ('pending', 'temporary_error');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- One step of processing for a single user id, run by the internal endpoint
-- per id. It never consumes the user's browser attempt quota; it only reads
-- and writes the reconcile counter. At the cap the row is handed to the
-- operator's manual queue (rejected appears in list_verification_queue) and
-- the person is notified through the outbox — the D1 worker delivers.
create function public.verification_reconcile_step(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status private.verification_status;
  v_reconcile_attempts integer;
  v_email text;
begin
  select status, reconcile_attempts
  into v_status, v_reconcile_attempts
  from private.verification_outcomes
  where user_id = p_user_id;

  if not found then
    return 'resolved';
  end if;

  if v_status not in ('pending', 'temporary_error') then
    return 'resolved';
  end if;

  if v_reconcile_attempts < private.verification_max_reconcile_attempts() then
    return 'deferred';
  end if;

  update private.verification_outcomes
  set status = 'rejected',
      updated_at = now()
  where user_id = p_user_id;

  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is not null and v_email <> '' then
    insert into public.outbox (recipient, channel, type, payload)
    values (
      v_email,
      'email',
      'verification_resolved',
      jsonb_build_object(
        'user_id', p_user_id,
        'status', 'rejected',
        'reason', 'reconcile_capped'
      )
    );
  end if;

  return 'rejected';
end;
$$;

revoke all on function public.verification_reconcile_step(uuid) from public;
revoke all on function public.verification_reconcile_step(uuid) from anon;
revoke all on function public.verification_reconcile_step(uuid) from authenticated;
grant execute on function public.verification_reconcile_step(uuid) to service_role;

-- The scheduled bridge, on the same pattern as private.outbox_dispatch_due:
-- reads the endpoint and secret from Vault and posts the candidate ids to the
-- Next.js internal endpoint. Without both Vault secrets this is a safe no-op,
-- so the job is installable before the deployment URL exists.
create function private.verification_dispatch_reconcile()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_endpoint text;
  v_secret text;
  v_ids uuid[];
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'verification-reconcile-endpoint';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'verification-reconcile-secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return 0;
  end if;

  select array_agg(user_id) into v_ids
  from private.verification_reconcile_candidates(20);

  if v_ids is null or cardinality(v_ids) = 0 then
    return 0;
  end if;

  perform private.verification_reconcile_lease(v_ids);

  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/internal/verification-reconcile',
    body := jsonb_build_object('user_ids', to_jsonb(v_ids)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reconcile-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );

  return cardinality(v_ids);
end;
$$;

revoke all on function private.verification_max_reconcile_attempts() from public;
revoke all on function private.verification_reconcile_candidates(integer) from public;
revoke all on function private.verification_reconcile_lease(uuid[]) from public;
revoke all on function private.verification_dispatch_reconcile() from public;

-- Cron owns the schedule; the function is private and not exposed to Data API.
select cron.schedule(
  'bivaque-verification-reconcile',
  '*/15 * * * *',
  'select private.verification_dispatch_reconcile()'
);
