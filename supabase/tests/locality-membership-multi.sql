begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

-- P0 Task 3 (Step 5): the schema accepts more than one membership per user,
-- and is_locality_member is a set test that answers true for both. The
-- negative matters: a user with no membership sees nobody's profile.

\ir fixtures/foundation.inc

-- user 003 (other-locality@example.invalid) already has a membership in the
-- fixture locality (00000000-...-0002). Give them a second one in Manaus:
-- the PK is now (user_id, locality_id), so this insert must succeed.
insert into public.locality_memberships (user_id, locality_id)
values ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001');

select throws_ok(
  $$
    insert into public.locality_memberships (user_id, locality_id)
    values ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001')
  $$,
  '23505',
  null,
  'a duplicate (user, locality) membership is still rejected by the PK'
);

-- The positive side: two memberships for the same user are accepted.
select results_eq(
  $$
    select count(*)
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000003'
  $$,
  array[2::bigint],
  'the same user holds two memberships in two localities'
);

-- is_locality_member answers true for both localities, as the holder.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  private.is_locality_member('00000000-0000-4000-8000-000000000001'),
  true,
  'is_locality_member is true for the first locality'
);
select is(
  private.is_locality_member('00000000-0000-4000-8000-000000000002'),
  true,
  'is_locality_member is true for the second locality'
);

-- The negative: user 005 has no membership and therefore sees nobody's
-- profile — "who can see my profile" is computed from the memberships.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.profiles',
  'a user with no membership sees no profiles at all'
);

select * from finish();
rollback;
