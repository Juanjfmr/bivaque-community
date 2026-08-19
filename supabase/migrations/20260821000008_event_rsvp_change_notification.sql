-- 030: RSVP change notifies the organizer — with debouncing + preference
-- honour (Wave F Task 2 Step 3).
--
-- The previous trigger (20260802001400_personal_notifications.sql:194)
-- fired on AFTER INSERT only. F2 Step 3 needs an UPDATE OF status to also
-- notify when a member flips state (going -> not_going is the headline case
-- — "o organizador descobre a desistência ao contar as cadeiras").

-- Debouncing: old.status = new.status suppresses the notification (the
-- plan says "um aviso por mudança, não por clique"). The action label
-- records the transition (going_to_going is impossible by the same
-- clause; going_to_interested, going_to_not_going, interested_to_going,
-- interested_to_not_going are the meaningful ones).

-- Preferences: notification_preferences.events = false -> no notify.
-- The preference table is read from the trigger as a lookup; we don't
-- replicate the check anywhere else (the trigger is the single source of
-- truth for RSVP notifications).

-- The plan §F2 Step 1 says the value must be added in a separate migration;
-- this one runs after it and uses the new value. PostgreSQL accepts.

drop trigger if exists notify_event_rsvp_trigger on public.event_rsvps;

create or replace function private.notify_event_rsvp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organizer uuid;
  v_prefs_enabled boolean;
begin
  select e.organizer_id into v_organizer
  from public.events e
  where e.id = new.event_id;

  -- Actor must not self-notify (organizer cannot RSVP to own event — the
  -- event_rsvps_block_self_trigger also blocks this case at write time).
  if v_organizer is null or v_organizer = new.user_id then
    return new;
  end if;

  -- Debouncing on UPDATE: if status didn't change, no notification. The
  -- INSERT path skips this check (TG_OP = 'INSERT' and old.* is null).
  if tg_op() = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  -- Honour notification_preferences.events. Default true if no row exists.
  select coalesce(np.events, true) into v_prefs_enabled
  from public.notification_preferences np
  where np.user_id = v_organizer;

  if v_prefs_enabled is false then
    return new;
  end if;

  insert into public.notifications (
    recipient_user_id, actor_user_id, type, action, target_type, target_id
  ) values (
    v_organizer, new.user_id, 'event_rsvp',
    -- Action encodes the new status (the transition itself; old.status is
    -- not informative when the trigger fires on INSERT).
    new.status::text, 'event', new.event_id
  );

  return new;
end;
$$;

create trigger notify_event_rsvp_trigger
after insert or update of status on public.event_rsvps
for each row
execute function private.notify_event_rsvp();