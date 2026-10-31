-- Task 7 (onda B): the notification_preferences table is persisted but no
-- producer reads it. Make the two preferences that HAVE producers actually
-- matter: the comment trigger honours 'comments', and the event triggers honour
-- 'events'. No preference row means the default (receive).

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
    if coalesce(
      (select np.comments from public.notification_preferences np where np.user_id = v_post_author),
      true
    ) then
      insert into public.notifications
        (recipient_user_id, actor_user_id, type, action, target_type, target_id)
      values
        (v_post_author, new.user_id, 'comment', 'created', 'post', new.post_id);
    end if;
  end if;

  return new;
end;
$$;

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
  if v_organizer is not null and v_organizer <> new.user_id then
    if coalesce(
      (select np.events from public.notification_preferences np where np.user_id = v_organizer),
      true
    ) then
      insert into public.notifications
        (recipient_user_id, actor_user_id, type, action, target_type, target_id)
      values
        (v_organizer, new.user_id, 'event_rsvp', 'rsvped', 'event', new.event_id);
    end if;
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

  -- Notify every RSVP'd user except the organizer, honouring each recipient's
  -- 'events' preference (no row means the default: receive).
  insert into public.notifications
    (recipient_user_id, actor_user_id, type, action, target_type, target_id)
  select r.user_id, new.organizer_id, 'event_change', 'updated', 'event', new.id
  from public.event_rsvps r
  where r.event_id = new.id
    and r.user_id <> new.organizer_id
    and coalesce(
      (select np.events from public.notification_preferences np where np.user_id = r.user_id),
      true
    );

  return new;
end;
$$;
