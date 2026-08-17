begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1
    from public.localities
    where id = '00000000-0000-4000-8000-000000000002'
  $$,
  'a Manaus member cannot read another locality'
);

select is_empty(
  $$
    select 1
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000003'
  $$,
  'a Manaus member cannot read a cross-locality profile'
);

select results_eq(
  $$
    update public.profiles
    set display_name = 'Unauthorized Change'
    where user_id = '10000000-0000-4000-8000-000000000002'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'cross-user profile updates affect no rows'
);

select throws_ok(
  $$ select * from private.verification_outcomes $$,
  42501
);

select throws_ok(
  $$ select * from private.family_invitations $$,
  42501
);

select throws_ok(
  $$ select * from private.family_account_links $$,
  42501
);

select throws_ok(
  $$
    insert into public.profiles (user_id, display_name)
    values (
      '10000000-0000-4000-8000-000000000005',
      'Unauthorized Profile'
    )
  $$,
  42501
);

select * from finish();
rollback;
