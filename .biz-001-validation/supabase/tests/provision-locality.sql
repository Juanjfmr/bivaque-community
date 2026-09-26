begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

-- P0 Task 4 (Step 5): provisioning the member creates the membership in the
-- given locality and one profile per person (Task 3 consequence). The TS
-- provisionMember does exactly two upserts; the pgTAP mirrors them so the
-- schema consequence is proven where the data lives.
--
-- Onda T Task 1 (Step 5): the partial unique index on (user_id) WHERE
-- kind = 'current' forbids a second `current` row. The helper that respects
-- the model is provision_member_locality (SECURITY DEFINER), which converts
-- the existing current to leaving (term_at null until the user declares one)
-- and creates the destination as current. The pgTAP here calls the helper,
-- not a raw insert — the same shape the route handler uses.

\ir fixtures/foundation.inc

-- user 003 already has a current membership in the fixture locality (0002)
-- and a profile. Provision them in Manaus (0001): the helper converts the
-- existing row to leaving and creates Manaus as current, and the profile
-- stays a single row.
set local role service_role;

select lives_ok(
  $$
    select public.provision_member_locality(
      '10000000-0000-4000-8000-000000000003'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid
    );
  $$,
  'provisioning in a second locality succeeds via the helper'
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
    select locality_id::text || ':' || kind::text
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000003'
    order by locality_id, kind
  $$,
  $$ values
    ('00000000-0000-4000-8000-000000000001'::text || ':current'),
    ('00000000-0000-4000-8000-000000000002'::text || ':leaving')
  $$,
  'the new locality is current and the previous current became leaving'
);

select * from finish();
rollback;
