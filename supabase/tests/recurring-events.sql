begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

-- Onda F Task 4: o encontro recorrente.
--
-- The plan asks for a unit test on the holiday warning ("recorrência que
-- cai em 2026-02-16 é sinalizada como Carnaval"). The check itself lives in
-- the database (check_recurrence_holiday reads national_holidays), not in
-- client JS, so its test lives here rather than in tests/unit — 2026-02-16
-- is the exact date the P0 catalog carries Carnaval on
-- (20260817022707_locality_catalog_data.sql:5611), so this is the same
-- assertion the plan names, not an approximation of it.

\ir fixtures/foundation.inc
\ir fixtures/events.inc

reset role;

-- ── 1-3. next_occurrence: pure function, independent oracle via generate_series ──

-- 1. Monthly weekday-ordinal: the first Friday of September 2026, found two
-- ways — the function, and a direct scan of the first week. If these ever
-- disagree, the function's math is wrong, not the fixture.
select is(
  public.next_occurrence('2026-09-01'::date, 'monthly_weekday_ordinal', 5::smallint, 1::smallint, null::smallint),
  (
    select min(d)::date
    from generate_series('2026-09-01'::date, '2026-09-07'::date, '1 day') d
    where extract(dow from d) = 5
  ),
  'first Friday of September 2026 matches an independent scan'
);

-- 2. Month rollover: asking from AFTER September's first Friday already
-- passed must roll to October's first Friday, not repeat September's.
select is(
  public.next_occurrence('2026-09-05'::date, 'monthly_weekday_ordinal', 5::smallint, 1::smallint, null::smallint),
  (
    select min(d)::date
    from generate_series('2026-10-01'::date, '2026-10-07'::date, '1 day') d
    where extract(dow from d) = 5
  ),
  'asking after this month''s occurrence rolls to next month (a virada do mês)'
);

-- 3. Day 31 in a 30-day month clamps to the last day, never an invalid date.
select is(
  public.next_occurrence('2026-04-01'::date, 'monthly_day_of_month', null::smallint, null::smallint, 31::smallint),
  '2026-04-30'::date,
  'day 31 in April (30 days) clamps to April 30, not an invalid date'
);

-- ── 4-5. check_recurrence_holiday: avisa, não corrige ──────────────────────

select is(
  (select is_holiday from public.check_recurrence_holiday('2026-02-16'::date)),
  true,
  '2026-02-16 (Carnaval, from the P0 catalog) is flagged as a holiday'
);

select is(
  (select is_holiday from public.check_recurrence_holiday('2026-02-18'::date)),
  false,
  'an ordinary business day is not flagged (negative)'
);

-- ── 6-7. snap_recurring_event_start: the organizer's date is the anchor,
-- the pattern decides the real date ─────────────────────────────────────────

insert into public.events (organizer_id, locality_id, title, starts_at, recurrence_type, recurrence_day_of_month)
values (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Reunião mensal',
  '2026-09-01 18:00:00+00', -- a Tuesday; the pattern wants day 15
  'monthly_day_of_month',
  15
);

select is(
  (select starts_at::date from public.events where title = 'Reunião mensal'),
  '2026-09-15'::date,
  'the event snaps to the pattern''s real date, not the organizer''s anchor'
);

select is(
  (select starts_at::time from public.events where title = 'Reunião mensal'),
  '18:00:00'::time,
  'the time-of-day the organizer chose survives the snap'
);

-- ── 8-11. advance_recurring_events: the daily job ──────────────────────────

-- A recurring event whose current occurrence is two months in the past —
-- created directly (not via the trigger's "future" framing) so
-- advance_recurring_events has something due to advance right now, with no
-- dependency on the wall-clock date this suite happens to run on.
insert into public.events (
  id, organizer_id, locality_id, title, starts_at, status,
  recurrence_type, recurrence_day_of_month
)
values (
  '30000000-0000-4000-8000-00000000000a',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Churrasco recorrente',
  (current_date - interval '65 days')::date + time '12:00:00',
  'upcoming',
  'monthly_day_of_month',
  extract(day from (current_date - interval '65 days'))::smallint
);

-- member-two RSVPs to the OLD (about-to-advance) occurrence.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.event_rsvps (event_id, user_id, status)
values ('30000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002', 'going');
reset role;

-- A completed recurring event, equally overdue — the negative control.
insert into public.events (
  id, organizer_id, locality_id, title, starts_at, status,
  recurrence_type, recurrence_day_of_month
)
values (
  '30000000-0000-4000-8000-00000000000b',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Encontro encerrado',
  (current_date - interval '65 days')::date + time '12:00:00',
  'completed',
  'monthly_day_of_month',
  extract(day from (current_date - interval '65 days'))::smallint
);

select public.advance_recurring_events();

select isnt(
  (select starts_at::date from public.events where id = '30000000-0000-4000-8000-00000000000a'),
  (current_date - interval '65 days')::date,
  'an overdue upcoming recurring event advances past its old date'
);

select ok(
  (select starts_at::date from public.events where id = '30000000-0000-4000-8000-00000000000a') > current_date - interval '65 days',
  'the new occurrence is strictly after the old one'
);

select is(
  (select starts_at::date from public.events where id = '30000000-0000-4000-8000-00000000000b'),
  (current_date - interval '65 days')::date,
  'a completed recurring event does not advance (negative)'
);

-- The RSVP to the occurrence that just passed is untouched — this is the
-- bug the whole migration exists to prevent (a September RSVP silently
-- becoming an October RSVP). A fresh 'going' RSVP to the NEW occurrence
-- lands as a second row, not an overwrite of the first.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.event_rsvps (event_id, user_id, status)
values ('30000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002', 'going');
reset role;

select results_eq(
  $$
    select occurrence_date::text
    from public.event_rsvps
    where event_id = '30000000-0000-4000-8000-00000000000a'
      and user_id = '10000000-0000-4000-8000-000000000002'
    order by occurrence_date
  $$,
  $$
    values
      ((current_date - interval '65 days')::date::text),
      ((select starts_at::date::text from public.events where id = '30000000-0000-4000-8000-00000000000a'))
  $$,
  'the old occurrence''s RSVP survives the advance as its own row, distinct from the new one'
);

-- ── 12-14. the reminder: one day before, respects opt-out, no duplicates ──

insert into public.events (
  id, organizer_id, locality_id, title, starts_at, status,
  recurrence_type, recurrence_day_of_month
)
values (
  '30000000-0000-4000-8000-00000000000c',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Encontro de amanhã',
  (current_date + 1)::date + time '19:00:00',
  'upcoming',
  'monthly_day_of_month',
  extract(day from (current_date + 1))::smallint
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.event_rsvps (event_id, user_id, status)
values ('30000000-0000-4000-8000-00000000000c', '10000000-0000-4000-8000-000000000002', 'going');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.event_rsvps (event_id, user_id, status)
values ('30000000-0000-4000-8000-00000000000c', '10000000-0000-4000-8000-000000000004', 'going');
reset role;

insert into public.notification_preferences (user_id, events)
values ('10000000-0000-4000-8000-000000000004', false)
on conflict (user_id) do update set events = false;

select private.send_recurring_event_reminders();

select ok(
  exists (
    select 1 from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'event_reminder'
      and target_id = '30000000-0000-4000-8000-00000000000c'
  ),
  'a going RSVP with preferences enabled receives the reminder'
);

select ok(
  not exists (
    select 1 from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000004'
      and type = 'event_reminder'
      and target_id = '30000000-0000-4000-8000-00000000000c'
  ),
  'a going RSVP with events preference disabled receives no reminder (negative)'
);

-- Running the job again the same day must not send a second reminder to
-- the same person for the same occurrence.
select private.send_recurring_event_reminders();

select is(
  (
    select count(*)::bigint from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'event_reminder'
      and target_id = '30000000-0000-4000-8000-00000000000c'
  ),
  1::bigint,
  'running the reminder job twice for the same occurrence does not duplicate (negative)'
);

select * from finish();
rollback;
