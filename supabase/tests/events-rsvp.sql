begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

\ir fixtures/foundation.inc
\ir fixtures/events.inc

-- ── authenticated member-one (organizer) ─────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Visibility: member-one sees locality events they organized or are in their locality.

select results_eq(
  'select title from public.events order by starts_at',
  $$ values ('Encontro no Parque'::text), ('Evento Cancelado'::text) $$,
  'organizer sees all locality events'
);

select results_eq(
  'select status from public.event_rsvps order by event_id',
  $$ values ('interested'::public.event_rsvp_status) $$,
  'organizer sees RSVPs for their events'
);

-- Create a new event.

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Nova Confraternização',
      '2026-09-01 18:00:00+00',
      'Centro de Convenções'
    )
  $$,
  'verified locality member can create an event with a venue'
);

select results_eq(
  $$
    select title, venue
    from public.events
    where title = 'Nova Confraternização'
  $$,
  $$ values ('Nova Confraternização'::text, 'Centro de Convenções'::text) $$,
  'created event with venue is visible'
);

-- Update own event (cancel).

select lives_ok(
  $$
    update public.events
    set status = 'cancelled'
    where title = 'Nova Confraternização'
  $$,
  'organizer can cancel own event'
);

select results_eq(
  'select status from public.events where title = ''Nova Confraternização''',
  $$ values ('cancelled'::public.event_status) $$,
  'event status updated to cancelled'
);

-- ── authenticated member-two (RSVP operations) ───────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- member-two can see locality events.

select results_eq(
  'select count(*) from public.events',
  array[3::bigint],
  'locality member sees events in their locality'
);

-- member-two can RSVP (upsert from interested to going).

select lives_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'going'
    )
    on conflict (event_id, user_id, occurrence_date) do update
    set status = 'going', updated_at = now()
  $$,
  'locality member can upsert RSVP from interested to going'
);

select results_eq(
  $$
    select status
    from public.event_rsvps
    where event_id = '30000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('going'::public.event_rsvp_status) $$,
  'RSVP updated to going'
);

-- member-three RSVPs as interested.

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000007',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000007',
      'interested'
    )
  $$,
  'another locality member can RSVP as interested'
);

select results_eq(
  'select count(*) from public.event_rsvps where event_id = ''30000000-0000-4000-8000-000000000001''',
  array[2::bigint],
  'event has two RSVPs'
);

-- ── cross-locality visibility denial ─────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.events',
  'cross-locality user sees no events from another locality'
);

select is_empty(
  'select 1 from public.event_rsvps',
  'cross-locality user sees no RSVPs from another locality'
);

-- ── nonmember denial ─────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.events',
  'nonmember sees no events'
);

select is_empty(
  'select 1 from public.event_rsvps',
  'nonmember sees no RSVPs'
);

-- ── unverified locality member can see events ────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) from public.events',
  array[3::bigint],
  'unverified locality member can see events'
);

-- ── organizer cannot RSVP to own event (trigger) ────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status)
    values (
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'going'
    )
  $$,
  'P0001',
  null,
  'organizer cannot RSVP to their own event'
);

-- ── group-scoped events are visible to locality members ──────────────────────

reset role;

-- Insert a group-scoped (group_id non-null) event as member-one.
-- group_id is opaque until groups migration wires membership RLS.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, group_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000010',
      'Evento de Grupo',
      '2026-09-15 14:00:00+00'
    )
  $$,
  'verified member can create a group-scoped event'
);

select * from finish();
rollback;
