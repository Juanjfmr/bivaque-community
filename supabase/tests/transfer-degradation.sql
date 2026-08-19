begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Onda T Task 3: degradar, não quebrar.
--
-- Setup: a leaving row was created by T1. The cron job runs daily (D1 owns
-- the schedule) and flips access to read_only when leaving_at < current_date.
-- No row is deleted — the holder keeps reading forever and only stops writing.
--
-- We exercise the helper directly here (service_role can call it) and
-- assert what the plan asks: read continues (positive), write is rejected
-- (negative), no row is removed, reverse returns the row to current.

\ir fixtures/foundation.inc
\ir fixtures/community.inc

-- A third locality as the destination. foundation ships Manaus (0001) and
-- Fixture City (0002); test-destination (0003) lives in this fixture only.
insert into public.localities (id, slug, city_name, state_code, country_code, ibge_code)
values (
  '00000000-0000-4000-8000-000000000003',
  'test-destination',
  'Test Destination',
  'TD',
  'BR',
  '8888888'
);

-- Declare a transfer with a past term date to exercise the degradation
-- helper without waiting for the cron. The declare_locality_transfer
-- helper uses auth.uid() internally (the holder is who declares), so we
-- set the JWT to member-one and run as authenticated. The other two
-- helpers (degrade_locality_origins, reverse_locality_transfer) take the
-- user id as a parameter and run as service_role.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.declare_locality_transfer(
  '00000000-0000-4000-8000-000000000003'::uuid,
  (current_date - interval '7 days')::date
);

-- Sanity: leaving_at is in the past and access is still active.
select is(
  (
    select access::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  'active',
  'before degradation the origin row is still active'
);

-- Run the degradation job. The helper reads leaving_at < current_date and
-- flips access. The same call is what pg_cron will run daily. The
-- helper is granted to service_role only (the cron calls it), so we
-- switch role before invoking it.
set local role service_role;
select public.degrade_locality_origins();

-- Positive: the origin access flips to read_only.
select is(
  (
    select access::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  'read_only',
  'after degradation the origin row is read_only'
);

-- Positive: the row is still there (no deletion — §7.8).
select results_eq(
  $$
    select count(*)::bigint
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  array[2::bigint],
  'no locality_memberships row is deleted by the degradation'
);

-- Negative: writes to the origin locality are rejected. The post policy
-- for insert requires the holder to be an active member of the locality.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Publicar na origem depois da degradacao'
    )
  $$,
  '42501',
  null,
  'writes to a read_only locality are rejected by RLS'
);

-- Positive: writes to the destination locality still work (it is current
-- and active).
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Publicar no destino depois da degradacao'
    )
  $$,
  'writes to the destination locality still work after the origin degraded'
);

-- Reverse: the user cancels the transfer. The helper converts the
-- destination back to leaving and the origin back to current/active.
set local role service_role;
select public.reverse_locality_transfer('10000000-0000-4000-8000-000000000001'::uuid);

select is(
  (
    select kind::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  'current',
  'after reverse the origin is current again'
);

select is(
  (
    select access::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  'active',
  'after reverse the origin is active again'
);

select * from finish();
rollback;
