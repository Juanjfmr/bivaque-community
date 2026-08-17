begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

-- P0 Task 4 (Step 5): provisioning the member creates the membership in the
-- given locality and one profile per person (Task 3 consequence). The TS
-- provisionMember does exactly two upserts; the pgTAP mirrors them so the
-- schema consequence is proven where the data lives.

\ir fixtures/foundation.inc

-- user 003 already has a membership in the fixture locality (0002) and a
-- profile. Provision them in Manaus (0001): the second membership lands, and
-- the profile stays a single row.
set local role service_role;

select lives_ok(
  $$
    insert into public.locality_memberships (user_id, locality_id)
    values ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001')
    on conflict (user_id, locality_id) do nothing;

    insert into public.profiles (user_id, display_name, visibility)
    values ('10000000-0000-4000-8000-000000000003', 'Third Locality', 'locality_members')
    on conflict (user_id) do update set display_name = excluded.display_name;
  $$,
  'provisioning in a second locality succeeds'
);

select results_eq(
  $$
    select count(*)
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000003'
  $$,
  array[2::bigint],
  'two memberships for the same user across two localities'
);

select results_eq(
  $$
    select count(*)
    from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000003'
  $$,
  array[1::bigint],
  'one profile per person even with two memberships'
);

select results_eq(
  $$
    select locality_id::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000003'
    order by locality_id
  $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::text), ('00000000-0000-4000-8000-000000000002'::text) $$,
  'both memberships carry their correct localities'
);

select * from finish();
rollback;
