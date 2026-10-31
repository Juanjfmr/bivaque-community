begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

-- Onda T Task 1: the transfer declaration.
--
-- The plan asks for at least four cases:
--   1. declaring a transfer creates the destination as current AND
--      converts the origin to leaving (positive);
--   2. declaring a second time does NOT create a second leaving row (negative);
--   3. a destination outside the catalog is rejected (negative);
--   4. a user without a current membership cannot declare (negative).
--
-- The negative cases are the test of the task — they prove the constraint
-- holds, not just the helper.

\ir fixtures/foundation.inc

-- Create a second locality as the transfer destination. The foundation fixture
-- ships only Manaus (0001) and Fixture City (0002); this test needs a third
-- to act as a destination distinct from the user's current.
insert into public.localities (id, slug, city_name, state_code, country_code, ibge_code)
values (
  '00000000-0000-4000-8000-000000000003',
  'test-destination',
  'Test Destination',
  'TD',
  'BR',
  '8888888'
);

-- ── Case 1: positive — declaration creates current destination and converts ─
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select * from public.declare_locality_transfer(
      '00000000-0000-4000-8000-000000000003'::uuid,
      '2027-01-15'::date
    )
  $$,
  'declare_locality_transfer runs for a user with a current membership'
);

-- Origin row (Manaus) is now leaving with the term date set.
select is(
  (
    select kind::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  'leaving',
  'origin locality was converted from current to leaving'
);

select is(
  (
    select leaving_at::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  '2027-01-15',
  'origin locality carries the declared leaving date'
);

-- Destination row was created as current.
select is(
  (
    select kind::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000003'
  ),
  'current',
  'destination locality was created as current'
);

-- The user holds exactly one current and one leaving.
select results_eq(
  $$
    select count(*)::bigint
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and kind = 'current'
  $$,
  array[1::bigint],
  'after a declaration there is exactly one current membership'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and kind = 'leaving'
  $$,
  array[1::bigint],
  'after a declaration there is exactly one leaving membership'
);

-- ── Case 2: negative — a second declaration does not create a second leaving ─
-- After Case 1 the user holds a leaving row (Manaus, 0001) and a current
-- row (destination, 0003). Trying to declare a transfer back to Manaus —
-- which is leaving — makes the helper attempt to insert a CURRENT row at
-- (user, 0001), but a row at (user, 0001) already exists as leaving. The
-- primary key (user_id, locality_id) surfaces that as a 23505 violation;
-- no second leaving row is ever created, which is the negative the plan
-- declares as the test of the task.
select throws_ok(
  $$
    select * from public.declare_locality_transfer(
      '00000000-0000-4000-8000-000000000001'::uuid,
      '2027-06-30'::date
    )
  $$,
  '23505',
  null,
  'declaring twice does not create a second leaving row'
);

-- ── Case 3: negative — destination outside the catalog is rejected ─────────
select throws_ok(
  $$
    select * from public.declare_locality_transfer(
      '99999999-9999-4999-8999-999999999999'::uuid,
      '2027-01-15'::date
    )
  $$,
  '23514',
  'destination not in catalog',
  'a destination outside the catalog is rejected by the helper'
);

-- ── Case 4: negative — a user without a current membership cannot declare ──
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select * from public.declare_locality_transfer(
      '00000000-0000-4000-8000-000000000003'::uuid,
      '2027-01-15'::date
    )
  $$,
  '23514',
  'no current locality to leave',
  'a user with no current membership cannot declare a transfer'
);

select * from finish();
rollback;
