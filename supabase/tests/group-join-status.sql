begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

-- Onda F Task 1 — Step 4: pgTAP for the authz fix.

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- member-one is owner of groups 001 and 002 in the fixture, with
-- status='approved' for both. The test cleans these before asserting so
-- the join_group insert actually happens (the RPC has on conflict do
-- nothing — the existing approved row would otherwise be preserved).
delete from public.group_memberships where group_id = '80000000-0000-4000-8000-000000000001'::uuid and user_id = '10000000-0000-4000-8000-000000000001'::uuid;
delete from public.group_memberships where group_id = '80000000-0000-4000-8000-000000000002'::uuid and user_id = '10000000-0000-4000-8000-000000000001'::uuid;

-- 1. Entering a public group via the join_group RPC lands as approved.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.join_group('80000000-0000-4000-8000-000000000001'::uuid)
  $$,
  'join_group runs for a member-one on a public group'
);

select is(
  (
    select status::text
    from public.group_memberships
    where group_id = '80000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000001'::uuid
  ),
  'approved',
  'public group membership lands as approved (visibility → status)'
);

-- 2. Entering a private group via the join_group RPC lands as pending.
select public.join_group('80000000-0000-4000-8000-000000000002'::uuid);

select is(
  (
    select status::text
    from public.group_memberships
    where group_id = '80000000-0000-4000-8000-800000000002'::uuid
      and user_id = '10000000-0000-4000-8000-000000000001'::uuid
  ),
  'pending',
  'private group membership lands as pending (visibility → status)'
);

-- 3. transfer_group_ownership called by a non-owner is denied.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.transfer_group_ownership(
      '80000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000004'::uuid
    )
  $$,
  'P0001',
  null,
  'transfer_group_ownership called by a non-owner is denied'
);

-- 4. The negative that proves Step 3: no row exists for an outsider.
select is_empty(
  $$
    select 1
    from public.group_memberships
    where group_id = '80000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000003'::uuid
  $$,
  'no row exists for user 003 (member-two did not join this group)'
);

-- 5. The holder of an event_rsvps can delete it.
-- 6. An outsider cannot delete another user's rsvp.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.event_rsvps (event_id, user_id, status)
values (
  '60000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'going'
);
select lives_ok(
  $$
    delete from public.event_rsvps
    where event_id = '60000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000001'::uuid
  $$,
  'holder deletes their own event_rsvps (positive, F1 Step 2b)'
);

-- Re-seed and switch to the outsider. The delete is a no-op
-- because event_rsvps_delete_self requires user_id = auth.uid(); the
-- row is owned by 001 and the outsider is 002.
insert into public.event_rsvps (event_id, user_id, status)
values (
  '60000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'going'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    delete from public.event_rsvps
    where event_id = '60000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000001'::uuid
  $$,
  'outsider delete on holders rsvp is a no-op (negative)'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.event_rsvps
    where event_id = '60000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000001'::uuid
  $$,
  array[1::bigint],
  'the holders rsvp survived the outsiders delete attempt'
);

select * from finish();
rollback;
