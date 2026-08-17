begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

\ir fixtures/foundation.inc
\ir fixtures/authz.inc

-- ── cross-user profile modification (member-one → member-two) ──────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    update public.profiles
    set display_name = 'Unauthorized'
    where user_id = '10000000-0000-4000-8000-000000000002'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'verified holder cannot update another member profile'
);

-- ── cross-locality access denial (member-one reads test-other-locality) ────

select is_empty(
  $$
    select 1
    from public.localities
    where id = '00000000-0000-4000-8000-000000000002'
  $$,
  'Manaus member cannot read another locality'
);

select is_empty(
  $$
    select 1
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000003'
  $$,
  'Manaus member cannot read a cross-locality profile'
);

-- ── nonmember denial (user 005, authenticated but not in any locality) ─────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.localities',
  'nonmember sees no localities'
);

select is_empty(
  'select 1 from public.profiles',
  'nonmember sees no profiles'
);

select is_empty(
  'select 1 from public.locality_memberships',
  'nonmember sees no membership rows'
);

select throws_ok(
  $$
    insert into public.profiles (user_id, display_name)
    values (
      '10000000-0000-4000-8000-000000000001',
      'Intruder'
    )
  $$,
  42501,
  null,
  'nonmember cannot insert another user profile (insert is self-scoped only)'
);

-- ── waitlist user denial (user 006, pending verification, no membership) ───

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000006',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.localities',
  'waitlist user sees no localities'
);

select is_empty(
  'select 1 from public.profiles',
  'waitlist user sees no profiles'
);

select is_empty(
  'select 1 from public.locality_memberships',
  'waitlist user sees no membership rows'
);

-- ── unverified locality member (hidden-member, 004, Manaus member) ─────────

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

-- ── accepted family member cannot modify the holder profile ────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    update public.profiles
    set display_name = 'Family Takeover'
    where user_id = '10000000-0000-4000-8000-000000000001'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'accepted family member cannot modify the holder profile'
);

-- ── waitlist user cannot insert a profile ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000006',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.profiles (user_id, display_name)
    values (
      '10000000-0000-4000-8000-000000000001',
      'Waitlist Intruder'
    )
  $$,
  42501,
  null,
  'waitlist user cannot insert another user profile (insert is self-scoped only)'
);

-- ── authenticated cannot access private tables ─────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  'select 1 from private.verification_outcomes',
  42501,
  null,
  'authenticated cannot read verification outcomes'
);

select throws_ok(
  'select 1 from private.family_invitations',
  42501,
  null,
  'authenticated cannot read family invitations'
);

select throws_ok(
  'select 1 from private.family_account_links',
  42501,
  null,
  'authenticated cannot read family account links'
);

-- ── anon cannot execute authorization helpers ──────────────────────────────

set local role anon;

select throws_ok(
  'select private.is_verified_locality_member(''00000000-0000-4000-8000-000000000001'')',
  null,
  null,
  'anon cannot execute is_verified_locality_member'
);

select throws_ok(
  $$
    select private.has_accepted_family(
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  null,
  null,
  'anon cannot execute has_accepted_family'
);

select throws_ok(
  'select private.is_verified_holder(''10000000-0000-4000-8000-000000000001'')',
  null,
  null,
  'anon cannot execute is_verified_holder'
);

-- ── authenticated cannot execute service_role write-path functions ─────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select private.upsert_verification_outcome(
      '10000000-0000-4000-8000-000000000001',
      'verified',
      'active_federal_military'
    )
  $$,
  null,
  null,
  'authenticated cannot execute upsert_verification_outcome'
);

select * from finish();
rollback;
