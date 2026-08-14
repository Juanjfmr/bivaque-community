begin;

create extension if not exists pgtap with schema extensions;
select plan(29);

\ir fixtures/foundation.inc
\ir fixtures/trust.inc
\ir fixtures/authz.inc

-- ── helper function correctness (postgres role) ────────────────────────────

-- is_verified_locality_member

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  private.is_verified_locality_member('00000000-0000-4000-8000-000000000001'),
  true,
  'member-one (verified + Manaus member) is a verified locality member'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select is(
  private.is_verified_locality_member('00000000-0000-4000-8000-000000000001'),
  true,
  'member-two (verified veteran + Manaus member) is a verified locality member'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select is(
  private.is_verified_locality_member('00000000-0000-4000-8000-000000000001'),
  false,
  'hidden-member (Manaus member, not verified) is not a verified locality member'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);

select is(
  private.is_verified_locality_member('00000000-0000-4000-8000-000000000001'),
  false,
  'non-member (no membership) is not a verified locality member'
);

-- has_accepted_family

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  private.has_accepted_family(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  ),
  true,
  'has_accepted_family returns true for an accepted family pair'
);

select is(
  private.has_accepted_family(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005'
  ),
  false,
  'has_accepted_family returns false for a non-accepted user'
);

select is(
  private.has_accepted_family(
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001'
  ),
  false,
  'has_accepted_family is directional: family-to-holder is not an accepted link'
);

-- is_verified_holder

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  private.is_verified_holder('10000000-0000-4000-8000-000000000001'),
  true,
  'is_verified_holder returns true for a verified holder'
);

select is(
  private.is_verified_holder('10000000-0000-4000-8000-000000000004'),
  false,
  'is_verified_holder returns false for an unverified user'
);

select is(
  private.is_verified_holder('10000000-0000-4000-8000-000000000006'),
  false,
  'is_verified_holder returns false for a pending waitlist user'
);

-- ── verified holder access (member-one, authenticated) ─────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select slug from public.localities order by slug',
  $$ values ('manaus-am'::text) $$,
  'verified holder reads the Manaus locality'
);

select results_eq(
  'select display_name from public.profiles order by display_name',
  $$ values ('Hidden Member'::text), ('Member One'::text), ('Member Two'::text) $$,
  'verified holder sees visible profiles in Manaus'
);

select results_eq(
  'select count(*) from public.locality_memberships',
  array[1::bigint],
  'verified holder sees only their own membership row'
);

-- ── accepted family member access (member-two, authenticated) ──────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select slug from public.localities order by slug',
  $$ values ('manaus-am'::text) $$,
  'accepted family member (also a Manaus member) reads Manaus'
);

select results_eq(
  'select display_name from public.profiles order by display_name',
  $$ values ('Hidden Member'::text), ('Member One'::text), ('Member Two'::text) $$,
  'accepted family member sees visible profiles in Manaus'
);

select results_eq(
  'select count(*) from public.locality_memberships',
  array[1::bigint],
  'accepted family member sees only their own membership row'
);

-- ── unverified locality member access (hidden-member, 004) ─────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select slug from public.localities order by slug',
  $$ values ('manaus-am'::text) $$,
  'unverified locality member can still read their own locality'
);

select results_eq(
  'select display_name from public.profiles order by display_name',
  $$ values ('Hidden Member'::text), ('Member One'::text), ('Member Two'::text) $$,
  'unverified member sees visible profiles in their locality'
);

-- ── self-scoped profile updates ────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.profiles
    set display_name = 'Holder Updated'
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'verified holder can update their own profile'
);

select results_eq(
  $$
    select display_name
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Holder Updated'::text) $$,
  'verified holder self-scoped update is visible'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    update public.profiles
    set display_name = 'Family Own'
    where user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  'accepted family member can update their own profile'
);

select results_eq(
  $$
    select display_name
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('Family Own'::text) $$,
  'accepted family member self-scoped update is visible'
);

-- ── service role access to private tables ──────────────────────────────────

reset role;

select lives_ok(
  'select count(*) from private.verification_outcomes',
  'service_role can read verification outcomes'
);

select lives_ok(
  'select count(*) from private.family_invitations',
  'service_role can read family invitations'
);

select lives_ok(
  'select count(*) from private.family_account_links',
  'service_role can read family account links'
);

select lives_ok(
  $$
    select private.upsert_verification_outcome(
      '10000000-0000-4000-8000-000000000001',
      'verified',
      'active_federal_military'
    )
  $$,
  'service_role can execute write-path upsert_verification_outcome'
);

-- ── helper function execute grants ─────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  'select private.is_verified_locality_member(''00000000-0000-4000-8000-000000000001'')',
  'authenticated can execute is_verified_locality_member'
);

select lives_ok(
  $$
    select private.has_accepted_family(
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'authenticated can execute has_accepted_family'
);

select lives_ok(
  'select private.is_verified_holder(''10000000-0000-4000-8000-000000000001'')',
  'authenticated can execute is_verified_holder'
);

select * from finish();
rollback;
