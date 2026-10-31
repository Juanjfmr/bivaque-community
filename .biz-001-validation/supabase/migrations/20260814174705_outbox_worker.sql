-- D1 Task 3 (Steps 2-3): the outbox delivery worker bridge.
--
-- pg_cron owns the schedule. The database prepares due rows, marks opt-out and
-- disabled-preference rows skipped, and hands the rest to the Next.js internal
-- endpoint over pg_net. The application owns the channel adapters and persists
-- the delivery mutation. Keeping the HTTP call in the database is what lets the
-- same pg_cron job reconcile `pending` rows without an external worker process.

create extension if not exists pg_net;

-- Operational opt-out table. Recipient + channel is the key: an unsubscribe
-- link for email must work without a login, so we cannot key opt-out by user id.
-- Like `outbox`, this carries contact data and is never exposed via Data API.
create table public.notification_opt_outs (
  channel public.outbox_channel not null,
  recipient text not null,
  created_at timestamptz not null default now(),
  primary key (channel, recipient)
);

alter table public.notification_opt_outs enable row level security;
alter table public.notification_opt_outs force row level security;

revoke all on table public.notification_opt_outs from anon, authenticated;
grant all on table public.notification_opt_outs to service_role;

-- The switch to the fallback channel is recorded on the row. The original
-- channel stays in `channel`; these two columns say where the message went and
-- why, so an operator can discover that WhatsApp died without reading the app
-- logs.
alter table public.outbox
  add column fallback_channel public.outbox_channel;

alter table public.outbox
  add column fallback_reason text;

-- --- pure decision helpers ------------------------------------------------
--
-- They are deliberately SQL so pgTAP can prove the rule that the worker must
-- honour, and the TypeScript domain module can prove the same rule without a
-- database.

create function private.outbox_max_attempts()
returns integer
language sql
stable
set search_path = ''
as $$
  select 5::integer;
$$;

create function private.outbox_base_retry_interval()
returns interval
language sql
stable
set search_path = ''
as $$
  select interval '60 seconds';
$$;

-- true when the row is allowed to be attempted again. A row inside its
-- exponential-backoff window is not due. The window is 60s * 2^attempts.
create function private.outbox_is_due(
  p_updated_at timestamptz,
  p_attempts integer,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_at >= p_updated_at + private.outbox_base_retry_interval() * power(2::double precision, p_attempts)::double precision;
$$;

-- Map an outbox notification type to the preference column that governs it.
-- No preference row means receive (the same default used by the in-app
-- notification triggers).
create function private.outbox_preference_allows(
  p_type text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then true
    when p_type = 'comment' then coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when p_type in ('event_rsvp', 'event_change') then coalesce(
      (select np.events from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when p_type = 'direct_message' then coalesce(
      (select np.messages from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    else true
  end;
$$;

-- Resolve the user id for preference lookup: an explicit payload user_id wins;
-- for email recipients we can fall back to the auth email. WhatsApp recipients
-- without an explicit user_id are still protected by opt-out, but cannot be
-- preference-checked until the adapter writes the user id into the payload.
create function private.outbox_preference_user_id(
  p_channel public.outbox_channel,
  p_recipient text,
  p_payload jsonb
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(p_payload ->> 'user_id', '')::uuid,
    case
      when p_channel = 'email' then (
        select u.id from auth.users u where lower(u.email) = lower(p_recipient) limit 1
      )
      else null
    end
  );
$$;

create function private.outbox_delivery_allowed(
  p_channel public.outbox_channel,
  p_recipient text,
  p_type text,
  p_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.notification_opt_outs o
    where o.channel = p_channel
      and o.recipient = p_recipient
  )
  and private.outbox_preference_allows(
    p_type,
    private.outbox_preference_user_id(p_channel, p_recipient, p_payload)
  );
$$;

-- --- queue mechanics ------------------------------------------------------

-- Marks due-but-not-allowed rows skipped, leases due-and-allowed rows by
-- advancing updated_at (so a slow HTTP request does not re-select them), and
-- returns the ids handed to the application. Pure enough for pgTAP because it
-- never touches pg_net or the vault.
create function private.outbox_prepare_due()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  update public.outbox o
  set status = 'skipped',
      updated_at = now()
  where o.status = 'pending'
    and o.attempts < private.outbox_max_attempts()
    and private.outbox_is_due(o.updated_at, o.attempts)
    and not private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload);

  for v_id in
    update public.outbox o
    set updated_at = now()
    where o.status = 'pending'
      and o.attempts < private.outbox_max_attempts()
      and private.outbox_is_due(o.updated_at, o.attempts)
      and private.outbox_delivery_allowed(o.channel, o.recipient, o.type, o.payload)
    returning o.id
  loop
    return next v_id;
  end loop;
end;
$$;

-- Persist the mutation produced by the application adapters. The application
-- passes the exact timestamps from the domain decision so a not-due no-op never
-- accidentally resets the backoff clock.
create function private.outbox_apply_delivery(
  p_id uuid,
  p_status public.outbox_status,
  p_attempts integer,
  p_last_error text,
  p_fallback_channel public.outbox_channel default null,
  p_fallback_reason text default null,
  p_updated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.outbox
  set status = p_status,
      attempts = p_attempts,
      last_error = p_last_error,
      fallback_channel = p_fallback_channel,
      fallback_reason = p_fallback_reason,
      updated_at = p_updated_at
  where id = p_id;
end;
$$;

-- --- scheduled bridge -----------------------------------------------------

-- Reads the endpoint and shared secret from Vault, prepares due rows and posts
-- their ids to the Next.js internal endpoint. Without both Vault secrets this
-- is a no-op: the worker is safe to install before the deployment URL exists.
create function private.outbox_dispatch_due()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_endpoint text;
  v_secret text;
  v_ids jsonb;
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'outbox-worker-endpoint';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'outbox-worker-secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return 0;
  end if;

  select coalesce(jsonb_agg(id), '[]'::jsonb) into v_ids
  from private.outbox_prepare_due() as id;

  if v_ids = '[]'::jsonb then
    return 0;
  end if;

  perform net.http_post(
    url := rtrim(v_endpoint, '/') || '/api/internal/outbox',
    body := jsonb_build_object('ids', v_ids),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-outbox-secret', v_secret
    ),
    timeout_milliseconds := 30000
  );

  return jsonb_array_length(v_ids)::integer;
end;
$$;

revoke all on function private.outbox_max_attempts() from public;
revoke all on function private.outbox_base_retry_interval() from public;
revoke all on function private.outbox_is_due(timestamptz, integer, timestamptz) from public;
revoke all on function private.outbox_preference_allows(text, uuid) from public;
revoke all on function private.outbox_preference_user_id(public.outbox_channel, text, jsonb) from public;
revoke all on function private.outbox_delivery_allowed(public.outbox_channel, text, text, jsonb) from public;
revoke all on function private.outbox_prepare_due() from public;
revoke all on function private.outbox_apply_delivery(uuid, public.outbox_status, integer, text, public.outbox_channel, text, timestamptz) from public;
revoke all on function private.outbox_dispatch_due() from public;

-- Cron owns the schedule; the function is private and not exposed to Data API.
select cron.schedule(
  'bivaque-outbox-worker',
  '* * * * *',
  'select private.outbox_dispatch_due()'
);


