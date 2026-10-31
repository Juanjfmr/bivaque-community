begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

\ir fixtures/foundation.inc
\ir fixtures/onboarding.inc

-- ── Consent columns on profiles ──

select has_column('public', 'profiles', 'consent_version', 'profiles has consent_version column');
select has_column('public', 'profiles', 'consented_at', 'profiles has consented_at column');

select col_is_pk('public', 'profiles', array['user_id'], 'profiles user_id remains the primary key');

select col_not_null('public', 'profiles', 'consent_version', 'consent_version is not null');

select col_has_default('public', 'profiles', 'consent_version', 'consent_version defaults to 0');

-- ── Waitlist table ──

select has_table('public', 'waitlist', 'waitlist table exists');
select has_column('public', 'waitlist', 'id', 'waitlist has id');
select has_column('public', 'waitlist', 'email', 'waitlist has email');
select has_column('public', 'waitlist', 'locality_id', 'waitlist has locality_id');
select has_column('public', 'waitlist', 'city_name', 'waitlist has city_name');
select has_column('public', 'waitlist', 'state_code', 'waitlist has state_code');
select has_column('public', 'waitlist', 'created_at', 'waitlist has created_at');

-- prohibited columns
select hasnt_column('public', 'waitlist', 'cpf', 'waitlist does not store CPF');
select hasnt_column('public', 'waitlist', 'payload', 'waitlist does not store portal payload');
select hasnt_column('public', 'waitlist', 'rank', 'waitlist does not store rank');
select hasnt_column('public', 'waitlist', 'address', 'waitlist does not store address');

-- RLS on waitlist
select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where relname = 'waitlist'
      and relnamespace = 'public'::regnamespace
  $$,
  $$ values (true) $$,
  'RLS is enabled and forced on waitlist'
);

select results_eq(
  $$
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'waitlist'
      and grantee in ('anon', 'authenticated')
  $$,
  array[0::bigint],
  'anon and authenticated have no direct waitlist privileges'
);

-- ── Consent fixture data ──

select results_eq(
  $$
    select consent_version, consented_at is not null
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values (1, true) $$,
  'verified holder has accepted consent version 1'
);

-- ── Waitlist fixture data ──

select results_eq(
  $$
    select count(*)
    from public.waitlist
    where locality_id is null
      and city_name = 'Brasília'
      and state_code = 'DF'
  $$,
  array[1::bigint],
  'outside-city waitlist has one Brasília entry'
);

select results_eq(
  $$
    select count(*)
    from public.waitlist
    where email = 'outsider@example.invalid'
      and city_name = 'Brasília'
      and state_code = 'DF'
  $$,
  array[1::bigint],
  'outside-city user is on the Brasília waitlist'
);

-- ── Waitlist unique constraint ──

select throws_ok(
  $$
    insert into public.waitlist (email, city_name, state_code)
    values ('outsider@example.invalid', 'Brasília', 'DF')
  $$,
  null,
  'duplicate email+city pair is rejected on waitlist'
);

-- ── Pending user has no profile ──

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.profiles
    where user_id = '60000000-0000-4000-8000-000000000001'
  $$,
  'pending user has no profile row'
);

reset role;

-- ── Rejected user has no profile ──

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.profiles
    where user_id = '60000000-0000-4000-8000-000000000002'
  $$,
  'rejected user has no profile row'
);

reset role;

-- ── Unverified account cannot read locality data ──

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.localities
    where slug = 'manaus-am'
  $$,
  'unverified user cannot read Manaus locality'
);

reset role;

-- ── Rejected account cannot read locality data ──

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.localities
    where slug = 'manaus-am'
  $$,
  'rejected user cannot read Manaus locality'
);

reset role;

select * from finish();
rollback;
