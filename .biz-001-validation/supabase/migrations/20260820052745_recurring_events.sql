-- Onda F Task 4: o encontro recorrente.
--
-- Design decision recorded in docs/agents/F4-design-question.md, resolved by
-- the owner as option B: virtual occurrences, one events row per recurring
-- meetup, with `occurrence_date` added to event_rsvps so a September RSVP
-- never silently becomes an October RSVP. The alternative (materializing N
-- future rows) was rejected by the plan itself (§Step 1: "não tabela nova").
--
-- Two patterns only, matching the plan's own examples — "toda primeira
-- sexta" and "todo dia 15":
--   monthly_weekday_ordinal: the Nth (1st-4th) occurrence of a weekday each
--     month. Ordinal 5 ("last") is deliberately not supported — it does not
--     exist every month, and the plan's examples never need it.
--   monthly_day_of_month: a fixed day-of-month, clamped to the last day of
--     shorter months (the "dia 31 em mês de 30" case the plan calls out).

-- ── 1. Recurrence columns on events ─────────────────────────────────────────

alter table public.events
  add column recurrence_type text,
  add column recurrence_weekday smallint,
  add column recurrence_ordinal smallint,
  add column recurrence_day_of_month smallint,
  add column last_reminder_sent_for date;

alter table public.events
  add constraint events_recurrence_type_check
    check (recurrence_type is null or recurrence_type in ('monthly_weekday_ordinal', 'monthly_day_of_month')),
  add constraint events_recurrence_weekday_check
    check (recurrence_weekday is null or recurrence_weekday between 0 and 6),
  add constraint events_recurrence_ordinal_check
    check (recurrence_ordinal is null or recurrence_ordinal between 1 and 4),
  add constraint events_recurrence_day_of_month_check
    check (recurrence_day_of_month is null or recurrence_day_of_month between 1 and 31),
  -- exactly one of the two shapes, or neither (a plain, non-recurring event).
  add constraint events_recurrence_shape_check
    check (
      (recurrence_type is null
        and recurrence_weekday is null and recurrence_ordinal is null and recurrence_day_of_month is null)
      or (recurrence_type = 'monthly_weekday_ordinal'
        and recurrence_weekday is not null and recurrence_ordinal is not null
        and recurrence_day_of_month is null)
      or (recurrence_type = 'monthly_day_of_month'
        and recurrence_day_of_month is not null
        and recurrence_weekday is null and recurrence_ordinal is null)
    );

-- ── 2. next_occurrence: pure, reusable by the client (preview) and by cron ──
-- STABLE, no side effects, safe to grant to authenticated — the composer
-- calls this to show the computed date and (paired with the holiday check
-- below) the Carnaval-style warning BEFORE the organizer publishes.
create function public.next_occurrence(
  p_from date,
  p_recurrence_type text,
  p_recurrence_weekday smallint default null,
  p_recurrence_ordinal smallint default null,
  p_recurrence_day_of_month smallint default null
)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $func$
declare
  v_month_start date := date_trunc('month', p_from)::date;
  v_candidate date;
  v_days_in_month int;
  v_first_weekday_offset int;
  v_first_occurrence date;
  v_iterations int := 0;
begin
  if p_recurrence_type = 'monthly_day_of_month' then
    if p_recurrence_day_of_month is null then
      raise exception 'recurrence_day_of_month is required' using errcode = '23514';
    end if;
    loop
      v_iterations := v_iterations + 1;
      exit when v_iterations > 24;
      v_days_in_month := extract(day from (v_month_start + interval '1 month' - interval '1 day'))::int;
      v_candidate := v_month_start + (least(p_recurrence_day_of_month, v_days_in_month) - 1);
      if v_candidate >= p_from then
        return v_candidate;
      end if;
      v_month_start := v_month_start + interval '1 month';
    end loop;
  elsif p_recurrence_type = 'monthly_weekday_ordinal' then
    if p_recurrence_weekday is null or p_recurrence_ordinal is null then
      raise exception 'recurrence_weekday and recurrence_ordinal are required' using errcode = '23514';
    end if;
    loop
      v_iterations := v_iterations + 1;
      exit when v_iterations > 24;
      v_first_weekday_offset := (p_recurrence_weekday - extract(dow from v_month_start)::int + 7) % 7;
      v_first_occurrence := v_month_start + v_first_weekday_offset;
      v_candidate := v_first_occurrence + (p_recurrence_ordinal - 1) * 7;
      -- An ordinal that does not exist this month (its Nth weekday rolls
      -- into the next month) skips the month rather than return a date the
      -- pattern never asked for.
      if extract(month from v_candidate) = extract(month from v_month_start)
         and v_candidate >= p_from then
        return v_candidate;
      end if;
      v_month_start := v_month_start + interval '1 month';
    end loop;
  else
    raise exception 'unknown recurrence_type: %', p_recurrence_type using errcode = '23514';
  end if;

  raise exception 'could not compute next occurrence' using errcode = 'P0001';
end;
$func$;

revoke all on function public.next_occurrence(date, text, smallint, smallint, smallint) from public;
revoke all on function public.next_occurrence(date, text, smallint, smallint, smallint) from anon;
grant execute on function public.next_occurrence(date, text, smallint, smallint, smallint) to authenticated;
grant execute on function public.next_occurrence(date, text, smallint, smallint, smallint) to service_role;

-- ── 3. check_recurrence_holiday: avisa, não corrige ─────────────────────────
-- Only national holidays (the P0 catalog's own limitation — municipal and
-- state holidays are not in national_holidays and must not be invented).
-- Read-only; never moves a date. The UI decides what to do with the answer.
create function public.check_recurrence_holiday(p_date date)
returns table (is_holiday boolean, holiday_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.national_holidays h where h.date = p_date),
    (select h.name from public.national_holidays h where h.date = p_date limit 1);
$$;

revoke all on function public.check_recurrence_holiday(date) from public;
revoke all on function public.check_recurrence_holiday(date) from anon;
grant execute on function public.check_recurrence_holiday(date) to authenticated;
grant execute on function public.check_recurrence_holiday(date) to service_role;

-- ── 4. snap a newly created recurring event to a real occurrence ──────────
-- The organizer's chosen starts_at supplies the time-of-day and the search
-- anchor; the date itself is replaced with the pattern's actual next match
-- so "toda primeira sexta" starting from an arbitrary Tuesday still lands on
-- a Friday. Non-recurring events (recurrence_type is null) pass through
-- unchanged.
create function private.snap_recurring_event_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next date;
begin
  if new.recurrence_type is not null then
    v_next := public.next_occurrence(
      new.starts_at::date,
      new.recurrence_type,
      new.recurrence_weekday,
      new.recurrence_ordinal,
      new.recurrence_day_of_month
    );
    new.starts_at := (v_next::text || ' ' || to_char(new.starts_at, 'HH24:MI:SS'))::timestamptz;
  end if;
  return new;
end;
$$;

create trigger snap_recurring_event_start_trigger
before insert on public.events
for each row
execute function private.snap_recurring_event_start();

-- ── 5. event_rsvps.occurrence_date — the RSVP is of the occurrence ────────
-- Backfilled from each row's event starts_at (at the time of this
-- migration, every event has exactly one occurrence, so this is exact, not
-- an approximation). A BEFORE INSERT trigger fills it in for every future
-- insert that omits it — the app's existing insert/upsert call sites, and
-- every pgTAP fixture that inserts into event_rsvps directly, keep working
-- unchanged; only the two call sites that need the new PK in their
-- ON CONFLICT target are touched (in the same commit as this migration).

alter table public.event_rsvps add column occurrence_date date;

update public.event_rsvps r
  set occurrence_date = e.starts_at::date
  from public.events e
  where e.id = r.event_id
    and r.occurrence_date is null;

alter table public.event_rsvps alter column occurrence_date set not null;

alter table public.event_rsvps drop constraint event_rsvps_pkey;
alter table public.event_rsvps
  add constraint event_rsvps_pkey primary key (event_id, user_id, occurrence_date);

create function private.default_event_rsvp_occurrence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.occurrence_date is null then
    select e.starts_at::date into new.occurrence_date
    from public.events e
    where e.id = new.event_id;
  end if;
  return new;
end;
$$;

create trigger event_rsvps_default_occurrence_date
before insert on public.event_rsvps
for each row
execute function private.default_event_rsvp_occurrence();

-- ── 6. advance_recurring_events — the daily job ────────────────────────────
-- Reuses the pg_cron scheduler enabled by D1 (20260814074813). Only
-- 'upcoming' events advance — a cancelled or completed event stays put,
-- which is also what stops a completed recurring event from resurrecting
-- itself every day. ends_at shifts by the same number of days as starts_at
-- so a multi-hour meetup keeps its duration. The notify_event_change
-- trigger (20260802001400) is disabled for the duration of this function's
-- own bulk update: without this, every historical RSVP holder — including
-- everyone who went to occurrences months ago — would get an "event
-- changed" notification every time the date rolls forward. Re-enabled
-- before return, including on the loop's natural exit.
create function public.advance_recurring_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_count integer := 0;
  v_row record;
  v_next date;
  v_day_delta integer;
begin
  alter table public.events disable trigger notify_event_change_trigger;

  for v_row in
    select id, starts_at, ends_at, recurrence_type, recurrence_weekday, recurrence_ordinal,
           recurrence_day_of_month
    from public.events
    where recurrence_type is not null
      and status = 'upcoming'
      and starts_at < now()
  loop
    v_next := public.next_occurrence(
      (v_row.starts_at::date + 1),
      v_row.recurrence_type,
      v_row.recurrence_weekday,
      v_row.recurrence_ordinal,
      v_row.recurrence_day_of_month
    );
    v_day_delta := v_next - v_row.starts_at::date;

    update public.events
      set starts_at = (v_next::text || ' ' || to_char(v_row.starts_at, 'HH24:MI:SS'))::timestamptz,
          ends_at = case
            when v_row.ends_at is not null then v_row.ends_at + (v_day_delta || ' days')::interval
            else null
          end,
          last_reminder_sent_for = null,
          updated_at = now()
      where id = v_row.id;

    v_count := v_count + 1;
  end loop;

  alter table public.events enable trigger notify_event_change_trigger;

  return v_count;
exception
  when others then
    alter table public.events enable trigger notify_event_change_trigger;
    raise;
end;
$func$;

revoke all on function public.advance_recurring_events() from public;
revoke all on function public.advance_recurring_events() from anon;
revoke all on function public.advance_recurring_events() from authenticated;
grant execute on function public.advance_recurring_events() to service_role;

select cron.schedule(
  'bivaque-advance-recurring-events',
  '0 6 * * *',
  'select public.advance_recurring_events()'
);

-- ── 7. the reminder ─────────────────────────────────────────────────────────
-- One day before a recurring event's current occurrence, everyone who RSVP'd
-- going/interested TO THAT OCCURRENCE gets a reminder — in-app notification
-- plus an outbox email, same dual-write shape as
-- 20260821000011_recommendation_reply_notify.sql. last_reminder_sent_for
-- guards against sending twice for the same occurrence when the job runs
-- more than once before the date passes; advance_recurring_events resets it
-- to null whenever the occurrence rolls forward, so the next occurrence gets
-- its own reminder.
create function private.send_recurring_event_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_event record;
  v_recipient record;
  v_prefs_enabled boolean;
  v_count integer := 0;
begin
  for v_event in
    select id, title, starts_at, organizer_id
    from public.events
    where recurrence_type is not null
      and status = 'upcoming'
      and starts_at::date = current_date + 1
      and (last_reminder_sent_for is null or last_reminder_sent_for <> starts_at::date)
  loop
    for v_recipient in
      select r.user_id, u.email
      from public.event_rsvps r
      join auth.users u on u.id = r.user_id
      where r.event_id = v_event.id
        and r.occurrence_date = v_event.starts_at::date
        and r.status in ('going', 'interested')
    loop
      select coalesce(np.events, true) into v_prefs_enabled
      from public.notification_preferences np
      where np.user_id = v_recipient.user_id;

      if v_prefs_enabled is not false then
        insert into public.notifications (
          recipient_user_id, actor_user_id, type, action, target_type, target_id
        ) values (
          v_recipient.user_id, null, 'event_reminder', 'upcoming', 'event', v_event.id
        );

        if v_recipient.email is not null and v_recipient.email <> '' then
          insert into public.outbox (recipient, channel, type, payload)
          values (
            v_recipient.email, 'email', 'event_reminder',
            jsonb_build_object('event_id', v_event.id, 'title', v_event.title, 'starts_at', v_event.starts_at)
          );
        end if;

        v_count := v_count + 1;
      end if;
    end loop;

    update public.events
      set last_reminder_sent_for = v_event.starts_at::date
      where id = v_event.id;
  end loop;

  return v_count;
end;
$func$;

select cron.schedule(
  'bivaque-recurring-event-reminders',
  '0 12 * * *',
  'select private.send_recurring_event_reminders()'
);
