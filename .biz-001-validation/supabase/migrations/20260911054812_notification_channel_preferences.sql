-- RECON-031 — the notification preference becomes type × channel.
--
-- ADR-20260909-canais-de-notificacao is approved (09/09/2026) and is the
-- authority here. D1: a matrix (user_id, notification_type, channel, enabled)
-- with the two channels the product actually delivers — `in_app` (the in-app
-- inbox that `public.notifications` already holds) and `email` (the outbox's
-- email channel). `push` is NOT created: there is no connected web-push
-- service, and a control that does not deliver is exactly the screen that
-- lies. D2: the matrix is seeded from the four existing booleans so nobody
-- loses or gains delivery. D3: `product_news` is its own type, off by default
-- for existing and new accounts. D4: one reader per delivery path — the
-- outbox dispatcher for e-mail and `private.notification_channel_allows` for
-- the in-app path — never one check per producer.
--
-- D4, read literally, says "the producer does not read the matrix". In the
-- current architecture the in-app notification is written by DB triggers, so a
-- real `in_app` control cannot exist without the trigger path asking the same
-- single helper. The helper is the single point; no producer re-implements the
-- rule. This is recorded in the RECON-031 report for the independent reviewer.

-- ── 1. the matrix ────────────────────────────────────────────────────────────

create type public.notification_channel as enum ('in_app', 'email');

create table public.notification_channel_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_type text not null check (
    notification_type in ('comments', 'events', 'mentions', 'messages', 'product_news')
  ),
  channel public.notification_channel not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_type, channel)
);

alter table public.notification_channel_preferences enable row level security;
alter table public.notification_channel_preferences force row level security;

revoke all on table public.notification_channel_preferences from anon, authenticated;

grant select, insert, update on table public.notification_channel_preferences to authenticated;
grant select, insert, update, delete on table public.notification_channel_preferences to service_role;

create policy notification_channel_preferences_select_own
on public.notification_channel_preferences
for select
to authenticated
using (user_id = (select auth.uid()));

create policy notification_channel_preferences_insert_own
on public.notification_channel_preferences
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy notification_channel_preferences_update_own
on public.notification_channel_preferences
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ── 2. product_news is a type of its own, off by default (D3) ───────────────
-- The column default is the opt-out guarantee: a brand-new account and an
-- account created before this migration both read false until the person
-- turns product communication on.

alter table public.notification_preferences
  add column product_news boolean not null default false;

-- ── 3. seed the matrix from the existing booleans (D2) ──────────────────────
-- A type that was on becomes in_app = true and email = true; a type that was
-- off becomes both false. `product_news` seeds false because the column
-- default is false. Nobody's delivery changes at migration time.

insert into public.notification_channel_preferences (
  user_id,
  notification_type,
  channel,
  enabled
)
select
  np.user_id,
  t.notification_type,
  c.channel,
  t.enabled
from public.notification_preferences np
cross join lateral (
  values
    ('comments', np.comments),
    ('events', np.events),
    ('mentions', np.mentions),
    ('messages', np.messages),
    ('product_news', np.product_news)
) as t (notification_type, enabled)
cross join (
  values
    ('in_app'::public.notification_channel),
    ('email'::public.notification_channel)
) as c (channel);

-- ── 4. one reader: map a notification type to its preference key ────────────
-- The producer writes the notification type (`comment`, `event_rsvp`, …); the
-- preference key is the stable column/row name. This mapping lives in one
-- function so a new producer cannot invent a parallel rule.

create function private.notification_type_key(p_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type = 'comment' then 'comments'
    when p_type in ('event_rsvp', 'event_change', 'event_reminder') then 'events'
    when p_type = 'direct_message' then 'messages'
    when p_type = 'product_news' then 'product_news'
    else null
  end;
$$;

revoke all on function private.notification_type_key(text) from public;

-- Type-level preference. Missing row keeps the historical default: receive,
-- except `product_news`, which is opt-in (D3). An unknown type is not governed
-- by any preference and stays allowed (the same default the triggers used).
create function private.notification_type_enabled(p_type text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then true
    when private.notification_type_key(p_type) is null then true
    when private.notification_type_key(p_type) = 'comments' then coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'events' then coalesce(
      (select np.events from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'messages' then coalesce(
      (select np.messages from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'mentions' then coalesce(
      (select np.mentions from public.notification_preferences np where np.user_id = p_user_id),
      true
    )
    when private.notification_type_key(p_type) = 'product_news' then coalesce(
      (select np.product_news from public.notification_preferences np where np.user_id = p_user_id),
      false
    )
    else true
  end;
$$;

revoke all on function private.notification_type_enabled(text, uuid) from public;

-- Channel-level rule: type off delivers by no channel; type on delivers by the
-- channels the matrix leaves enabled. A missing matrix row keeps the type's
-- state (true when the type is on) so a preference written before this
-- migration keeps the same delivery.
create function private.notification_channel_allows(
  p_type text,
  p_channel public.notification_channel,
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
    when private.notification_type_key(p_type) is null then true
    else private.notification_type_enabled(p_type, p_user_id)
      and coalesce(
        (
          select ncp.enabled
          from public.notification_channel_preferences ncp
          where ncp.user_id = p_user_id
            and ncp.notification_type = private.notification_type_key(p_type)
            and ncp.channel = p_channel
        ),
        private.notification_type_enabled(p_type, p_user_id)
      )
  end;
$$;

revoke all on function private.notification_channel_allows(text, public.notification_channel, uuid)
  from public;

-- ── 5. the in-app producers ask the single helper, not the table ────────────

create or replace function private.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_author uuid;
begin
  select p.user_id into v_post_author
  from public.posts p
  where p.id = new.post_id;

  -- Actor must not self-notify.
  if v_post_author is not null and v_post_author <> new.user_id then
    if private.notification_channel_allows('comment', 'in_app', v_post_author) then
      insert into public.notifications
        (recipient_user_id, actor_user_id, type, action, target_type, target_id)
      values
        (v_post_author, new.user_id, 'comment', 'created', 'post', new.post_id);
    end if;
  end if;

  return new;
end;
$$;

-- This replaces the 20260814053908 version, NOT the one from 20260821000008.
-- The later migration added the UPDATE debounce and encoded the new status in
-- `action`; both must survive here, or this migration silently reverts the
-- change notification. Only the preference read moves to the single helper.
create or replace function private.notify_event_rsvp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organizer uuid;
begin
  select e.organizer_id into v_organizer
  from public.events e
  where e.id = new.event_id;

  -- Actor must not self-notify (organizer cannot RSVP to own event).
  if v_organizer is null or v_organizer = new.user_id then
    return new;
  end if;

  -- Debouncing on UPDATE: a status that did not change does not notify. The
  -- INSERT path has no old row and skips this check (preserved from
  -- 20260821000008_event_rsvp_change_notification.sql).
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  -- The in-app producer asks the single helper, which resolves the 'events'
  -- type preference and the in_app matrix row together.
  if private.notification_channel_allows('event_rsvp', 'in_app', v_organizer) then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_organizer, new.user_id, 'event_rsvp', new.status::text, 'event', new.event_id);
  end if;

  return new;
end;
$$;

create or replace function private.notify_event_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Skip if no meaningful column changed.
  if old.title is not distinct from new.title
     and old.starts_at is not distinct from new.starts_at
     and old.status is not distinct from new.status
     and old.venue is not distinct from new.venue
     and old.description is not distinct from new.description then
    return new;
  end if;

  -- Notify every RSVP'd user except the organizer, each recipient checked by
  -- the same channel helper.
  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select r.user_id, new.organizer_id, 'event_change', 'updated', 'event', new.id
  from public.event_rsvps r
  where r.event_id = new.id
    and r.user_id <> new.organizer_id
    and private.notification_channel_allows('event_change', 'in_app', r.user_id);

  return new;
end;
$$;

-- ── 6. the outbox dispatcher checks the e-mail channel (D5) ─────────────────
-- The scheduled `private.outbox_prepare_due()` marks disallowed rows skipped
-- before the HTTP call; the TypeScript dispatcher applies the same rule. Both
-- read the same function, so a preference can never be honoured in one path
-- and forgotten in the other.

create or replace function private.outbox_delivery_allowed(
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
  and case
    when p_channel = 'email' then private.notification_channel_allows(
      p_type,
      'email',
      private.outbox_preference_user_id(p_channel, p_recipient, p_payload)
    )
    else private.notification_type_enabled(
      p_type,
      private.outbox_preference_user_id(p_channel, p_recipient, p_payload)
    )
  end;
$$;

revoke all on function private.outbox_delivery_allowed(public.outbox_channel, text, text, jsonb)
  from public;
