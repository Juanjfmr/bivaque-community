begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Onda T Task 4: the switcher tells the member their degraded origin is
-- read-only, before they try to publish. The T3 migration (20260820000000)
-- added the active-membership check to posts/comments/post_reactions but
-- not to events — a read-only holder could still organize a new event in
-- the origin through direct API access. This test proves the guard added in
-- 20260820045749_locality_switcher_write_guard.sql closes that gap, and
-- that it does not regress the ordinary (non-transferred) case.

\ir fixtures/foundation.inc
\ir fixtures/community.inc

insert into public.localities (id, slug, city_name, state_code, country_code, ibge_code)
values (
  '00000000-0000-4000-8000-000000000003',
  'test-destination',
  'Test Destination',
  'TD',
  'BR',
  '8888888'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Positive, before transferring: an ordinary active member organizes an
-- event in their own locality without any regression from the new check.
select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento antes da transferencia',
      '2026-09-10 10:00:00+00'
    )
  $$,
  'an active locality member organizes an event with no regression'
);

select public.declare_locality_transfer(
  '00000000-0000-4000-8000-000000000003'::uuid,
  (current_date - interval '7 days')::date
);

-- Positive, still active (leaving_at is in the past but the daily job has
-- not run yet): organizing in the origin still works.
select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento antes da degradacao',
      '2026-09-11 10:00:00+00'
    )
  $$,
  'the origin still accepts new events before the daily job degrades it'
);

set local role service_role;
select public.degrade_locality_origins();

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Negative: after degradation, the origin is read-only and organizing a new
-- event there is rejected.
select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Evento depois da degradacao',
      '2026-09-12 10:00:00+00'
    )
  $$,
  '42501',
  null,
  'organizing a new event in a read-only origin is rejected'
);

-- Positive: the destination (current, active) still accepts events.
select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000003',
      'Evento no destino',
      '2026-09-13 10:00:00+00'
    )
  $$,
  'the destination keeps accepting new events after the origin degraded'
);

select * from finish();
rollback;
