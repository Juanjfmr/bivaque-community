-- Onda F Task 8 — complete the group administrator cycle.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

reset role;

-- member-one (001) is owner of group 40000000-0000-4000-8000-000000000001 (public, locality 1).
-- member-two (002) joins and becomes approved (public group auto-approved).
-- member-three (003) requests to join private group 40000000-0000-4000-8000-000000000002.

-- ── POSITIVE 1: owner removes a member ──────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

delete from public.group_memberships
where group_id = '40000000-0000-4000-8000-000000000001'::uuid
  and user_id = '10000000-0000-4000-8000-000000000002'::uuid;

select is_empty(
  $$
    select 1 from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000002'::uuid
  $$,
  'F8+: owner successfully removes a member'
);

-- ── NEGATIVE 2: non-moderator cannot remove a member ────────────────────────
-- member-four needs a real membership row in group 001 first, or the delete
-- below would trivially match nothing regardless of RLS.
reset role;
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  'member',
  'approved'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- member-two tries to remove member-four (004) from group 001. RLS on
-- DELETE filters rows silently (no exception) rather than raising 42501 —
-- the assertion is that the statement runs but removes nothing.
select lives_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000004'::uuid
  $$,
  'F8-: non-moderator delete attempt runs without error (RLS silently excludes the row)'
);

select isnt_empty(
  $$
    select 1 from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000004'::uuid
  $$,
  'F8-: non-moderator cannot remove a member (row still exists, RLS denies)'
);

-- ── POSITIVE 3: author cancels own pending request ──────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

delete from public.group_memberships
where group_id = '40000000-0000-4000-8000-000000000002'::uuid
  and user_id = '10000000-0000-4000-8000-000000000003'::uuid;

select is_empty(
  $$
    select 1 from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000002'::uuid
      and user_id = '10000000-0000-4000-8000-000000000003'::uuid
  $$,
  'F8+: author cancels own pending request'
);

-- ── NEGATIVE 4: author cannot cancel another's request ──────────────────────
-- Already covered by RLS: group_memberships_delete_self only allows deleting
-- own membership. This test verifies that member-two cannot delete member-three's
-- membership in group 002. POSITIVE 3 just deleted that exact row, so re-add
-- it — otherwise the delete below trivially matches nothing regardless of RLS.
reset role;
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  'member',
  'pending'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000002'::uuid
      and user_id = '10000000-0000-4000-8000-000000000003'::uuid
  $$,
  'F8-: another member delete attempt runs without error (RLS silently excludes the row)'
);

-- group 002 is private and member-two isn't a member of it, so
-- group_memberships_select would hide the row from them regardless of
-- whether the delete above actually ran — check as the owner instead.
reset role;
select isnt_empty(
  $$
    select 1 from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000002'::uuid
      and user_id = '10000000-0000-4000-8000-000000000003'::uuid
  $$,
  'F8-: author cannot cancel another member request (row still exists, RLS denies)'
);

-- ── NEGATIVE 5: a non-owner cannot delete the group ─────────────────────────
-- member-four is an approved member of group 001 (added for NEGATIVE 2) but
-- not the owner. delete_group raises a real exception (unlike the DELETE
-- RLS-filter cases above), so throws_ok is the right assertion here.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.delete_group('40000000-0000-4000-8000-000000000001'::uuid) $$,
  'P0001',
  'only the group owner can delete the group',
  'F8-: a non-owner cannot delete the group'
);

-- ── POSITIVE 5: the owner deletes the group; it disappears from feed/explorer
-- delete_group is the fix for the "Excluir grupo" button, which used to
-- write is_deleted through the authenticated client directly and always
-- threw — block_soft_delete_groups only allows the toggle from service_role.
-- The RPC runs as its owner (security definer), which the trigger allows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.delete_group('40000000-0000-4000-8000-000000000001'::uuid) $$,
  'F8+: the group owner deletes the group through the delete_group RPC'
);

select is_empty(
  $$
    select 1 from public.groups
    where id = '40000000-0000-4000-8000-000000000001'::uuid
      and is_deleted = false
  $$,
  'F8+: soft-deleted group is excluded from select queries'
);

-- ── POSITIVE 6: the is_deleted column exists and defaults to false ──────────
select col_not_null('public', 'groups', 'is_deleted', 'is_deleted is NOT NULL');
select col_has_default('public', 'groups', 'is_deleted', 'is_deleted has default');

select * from finish();
rollback;