begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

\ir fixtures/foundation.inc

-- event fixture (member-one as organizer)
insert into public.events (id, locality_id, organizer_id, title, starts_at)
values (
  '80000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Retrospectiva do mes',
  '2026-08-20 12:00:00+00'
);

reset role;

-- ── Positive: organizer completes their own event ──────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.complete_event('80000000-0000-4000-8000-000000000002')
  $$,
  '42501',
  null,
  'authenticated cannot call complete_event directly (service_role only)'
);

reset role;

select lives_ok(
  $$
    select public.complete_event('80000000-0000-4000-8000-000000000002')
  $$,
  'service_role completes the event'
);

select is(
  (select status::text from public.events
   where id = '80000000-0000-4000-8000-000000000002'),
  'completed',
  'event status is completed after close'
);

select is(
  (select count(*) from public.events where status = 'completed'),
  1::bigint,
  'exactly one completed event in the fixture'
);

select * from finish();
rollback;