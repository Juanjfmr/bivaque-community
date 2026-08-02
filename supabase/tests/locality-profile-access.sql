begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc

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
  'a Manaus member sees only the Manaus locality'
);

select results_eq(
  'select display_name from public.profiles order by display_name',
  $$ values ('Member One'::text), ('Member Two'::text) $$,
  'a Manaus member sees visible coarse profiles in Manaus'
);

select results_eq(
  'select count(*) from public.locality_memberships',
  array[1::bigint],
  'a member sees only their own membership row'
);

select lives_ok(
  $$
    update public.profiles
    set display_name = 'Member One Updated'
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'a member can update their own coarse profile'
);

select results_eq(
  $$
    select display_name
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Member One Updated'::text) $$,
  'the self-scoped profile update is visible'
);

select lives_ok(
  $$
    update public.profiles
    set visibility = 'hidden'
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'a member can hide their own profile'
);

select * from finish();
rollback;
