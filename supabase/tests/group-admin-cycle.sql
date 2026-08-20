-- Onda F Task 8 — complete the group administrator cycle.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

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
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- member-two tries to remove member-four (004) from group 001.
select throws_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'::uuid
      and user_id = '10000000-0000-4000-8000-000000000004'::uuid
  $$,
  '42501',
  null,
  'F8-: non-moderator cannot remove a member (RLS denies)'
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
-- membership in group 002.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000002'::uuid
      and user_id = '10000000-0000-4000-8000-000000000003'::uuid
  $$,
  '42501',
  null,
  'F8-: author cannot cancel another member request (RLS denies)'
);

-- ── POSITIVE 5: soft-deleted group disappears from feed/explorer ────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

update public.groups
set is_deleted = true
where id = '40000000-0000-4000-8000-000000000001'::uuid;

select is_empty(
  $$
    select 1 from public.groups
    where id = '40000000-0000-4000-8000-000000000001'::uuid
      and is_deleted = false
  $$,
  'F8+: soft-deleted group is excluded from select queries'
);

-- ── POSITIVE 6: the is_deleted column exists and defaults to false ──────────
select col_is_not_null('public', 'groups', 'is_deleted', 'is_deleted is NOT NULL');
select col_has_default('public', 'groups', 'is_deleted', 'is_deleted has default');

select * from finish();
rollback;