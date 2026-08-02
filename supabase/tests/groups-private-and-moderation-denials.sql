begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- ── Cross-locality member cannot see this locality's groups ──────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.groups
    where locality_id = '00000000-0000-4000-8000-000000000001'
  $$,
  'cross-locality member cannot see groups in Manaus'
);

reset role;

-- ── Non-locality-member cannot see any groups ────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.groups
  $$,
  'non-locality-member sees no groups'
);

reset role;

-- ── Non-locality-member cannot join a group ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.join_group('40000000-0000-4000-8000-000000000001')
  $$,
  null,
  'non-locality-member cannot join a group'
);

reset role;

-- ── Non-member cannot see private group membership list ──────────────────────

-- member-two (002) is pending in the private group and not approved.
-- They should not see the approved membership rows of the private group.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000002'
      and user_id <> '10000000-0000-4000-8000-000000000002'
  $$,
  'pending member cannot see other private group members'
);

reset role;

-- ── Non-moderator cannot approve members ─────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.approve_group_member(
      '40000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  null,
  'non-moderator cannot approve group members'
);

reset role;

-- ── Non-moderator cannot add co-moderators ───────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.add_group_moderator(
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004'
    )
  $$,
  null,
  'non-moderator cannot add co-moderators'
);

reset role;

-- ── Cannot demote the group owner ────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.remove_group_moderator(
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  null,
  'owner cannot be demoted via remove moderator'
);

reset role;

-- ── Non-owner cannot delete a group ──────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    delete from public.groups
    where id = '40000000-0000-4000-8000-000000000001'
    returning id
  $$,
  42501,
  null,
  'non-owner cannot delete a group (no delete grant on groups table)'
);

reset role;

-- ── Non-owner cannot transfer ownership ──────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.transfer_group_ownership(
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  null,
  'non-owner cannot transfer group ownership'
);

reset role;

-- ── Non-locality-member cannot create groups ─────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_group(
      'Grupo Proibido',
      'public',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  null,
  'non-locality-member cannot create a group'
);

reset role;

-- ── Unverified locality member cannot create groups ──────────────────────────

-- hidden-member (004) is a Manaus member but not verified
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_group(
      'Grupo Nao Verificado',
      'public',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  null,
  'unverified member cannot create a group'
);

reset role;

-- ── Cannot add non-member as moderator ───────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.add_group_moderator(
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  null,
  'cannot add a non-member as moderator'
);

reset role;

-- ── Transfer to non-member is rejected ───────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.transfer_group_ownership(
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  null,
  'cannot transfer ownership to a non-member'
);

reset role;

select * from finish();
rollback;
