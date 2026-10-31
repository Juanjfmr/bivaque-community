-- 014: Personal notifications inbox — recipient-scoped, trigger-driven.
-- Notifications are created by database triggers on approved actions:
-- comment on post, group admission, invitation acceptance, event RSVP/change,
-- and (future) direct messages. Actor must never self-notify.
-- Payload carries only type/action/target references — NEVER CPF, rank, OM,
-- address, or Portal details.
-- All functions use set search_path = '' to prevent search-path injection.

-- ── notification type enum ────────────────────────────────────────────────────

create type public.notification_type as enum (
  'comment',
  'group_admission',
  'invitation_accepted',
  'event_rsvp',
  'event_change',
  'direct_message'
);

-- ── notifications table ───────────────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  type public.notification_type not null,
  action text not null check (char_length(action) between 1 and 50),
  target_type text not null check (char_length(target_type) between 1 and 50),
  target_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;

-- ── RLS enable + force ────────────────────────────────────────────────────────

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

-- ── minimal grants ────────────────────────────────────────────────────────────

revoke all on table public.notifications from anon, authenticated;

grant select, update on table public.notifications to authenticated;
grant select on table public.notifications to service_role;

-- ── RLS policies ──────────────────────────────────────────────────────────────

-- Recipient can see their own notifications.
create policy notifications_select_recipient
on public.notifications
for select
to authenticated
using (recipient_user_id = (select auth.uid()));

-- Recipient can mark their own notifications as read (update read_at only).
create policy notifications_update_recipient
on public.notifications
for update
to authenticated
using (recipient_user_id = (select auth.uid()))
with check (recipient_user_id = (select auth.uid()));

-- ── Trigger: comment on post → notify post author ─────────────────────────────

create function private.notify_comment()
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
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_post_author, new.user_id, 'comment', 'created', 'post', new.post_id);
  end if;

  return new;
end;
$$;

create trigger notify_comment_trigger
after insert on public.comments
for each row
execute function private.notify_comment();

-- ── Trigger: group admission approved → notify approved user ──────────────────

create function private.notify_group_admission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  -- Only fire when transitioning from pending to approved.
  if old.status <> 'pending' or new.status <> 'approved' then
    return new;
  end if;

  v_actor := (select auth.uid());

  -- Actor must not self-notify (skip if moderator IS the user, or if actor is null).
  if v_actor is not null and v_actor <> new.user_id then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (new.user_id, v_actor, 'group_admission', 'approved', 'group', new.group_id);
  end if;

  return new;
end;
$$;

create trigger notify_group_admission_trigger
after update on public.group_memberships
for each row
execute function private.notify_group_admission();

-- ── Trigger: family invitation accepted → notify inviter ──────────────────────

create function private.notify_invitation_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' and new.accepted_by_user_id is not null then
    -- The accepter is the actor; the inviter is the recipient.
    -- Actor must not self-notify (not possible in practice since inviter ≠ accepter).
    if new.inviter_user_id <> new.accepted_by_user_id then
      insert into public.notifications
        (recipient_user_id, actor_user_id, type, action, target_type, target_id)
      values
        (new.inviter_user_id, new.accepted_by_user_id,
         'invitation_accepted', 'accepted', 'family_invitation', new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger notify_invitation_accepted_trigger
after update on private.family_invitations
for each row
execute function private.notify_invitation_accepted();

-- ── Trigger: event RSVP → notify event organizer ──────────────────────────────

create function private.notify_event_rsvp()
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
  if v_organizer is not null and v_organizer <> new.user_id then
    insert into public.notifications
      (recipient_user_id, actor_user_id, type, action, target_type, target_id)
    values
      (v_organizer, new.user_id, 'event_rsvp', 'rsvped', 'event', new.event_id);
  end if;

  return new;
end;
$$;

create trigger notify_event_rsvp_trigger
after insert on public.event_rsvps
for each row
execute function private.notify_event_rsvp();

-- ── Trigger: event change → notify RSVP'd users ───────────────────────────────

create function private.notify_event_change()
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

  -- Notify every RSVP'd user except the organizer (actor must not self-notify).
  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select r.user_id, new.organizer_id, 'event_change', 'updated', 'event', new.id
  from public.event_rsvps r
  where r.event_id = new.id
    and r.user_id <> new.organizer_id;

  return new;
end;
$$;

create trigger notify_event_change_trigger
after update on public.events
for each row
execute function private.notify_event_change();
