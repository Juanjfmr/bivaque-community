begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- ── Table structure ──────────────────────────────────────────────────────────

select has_table('public', 'groups', 'groups table exists');
select has_table('public', 'group_memberships', 'group_memberships table exists');

select has_column('public', 'groups', 'id', 'groups has id');
select has_column('public', 'groups', 'name', 'groups has name');
select has_column('public', 'groups', 'description', 'groups has description');
select has_column('public', 'groups', 'visibility', 'groups has visibility');
select has_column('public', 'groups', 'locality_id', 'groups has locality_id');
select has_column('public', 'groups', 'created_by', 'groups has created_by');
select has_column('public', 'groups', 'owner_user_id', 'groups has owner_user_id');
select has_column('public', 'groups', 'created_at', 'groups has created_at');

select has_column('public', 'group_memberships', 'group_id', 'group_memberships has group_id');
select has_column('public', 'group_memberships', 'user_id', 'group_memberships has user_id');
select has_column('public', 'group_memberships', 'role', 'group_memberships has role');
select has_column('public', 'group_memberships', 'status', 'group_memberships has status');
select has_column('public', 'group_memberships', 'joined_at', 'group_memberships has joined_at');

-- ── RLS enabled + forced ─────────────────────────────────────────────────────

select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where relname = 'groups'
      and relnamespace = 'public'::regnamespace
  $$,
  $$ values (true) $$,
  'RLS is enabled and forced on groups'
);

select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where relname = 'group_memberships'
      and relnamespace = 'public'::regnamespace
  $$,
  $$ values (true) $$,
  'RLS is enabled and forced on group_memberships'
);

-- ── Member sees groups in their locality ─────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select name from public.groups order by name
  $$,
  $$ values ('Clube do Livro'::text), ('Grupo de Corrida'::text) $$,
  'member sees all groups in their locality (public and private metadata)'
);

-- ── Member sees public group memberships ─────────────────────────────────────

select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'
  $$,
  array[2::bigint],
  'public group member list is visible to locality members'
);

-- ── Private group members visible only to approved members ───────────────────

-- member-one is the owner of the private group, so they see all memberships
select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000002'
  $$,
  array[2::bigint],
  'owner sees pending and approved private group memberships'
);

-- ── Join public group (auto-approved) ────────────────────────────────────────

-- hidden-member (004) joins the public group
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select lives_ok(
  $$
    select public.join_group('40000000-0000-4000-8000-000000000001')
  $$,
  'locality member can join a public group'
);

select results_eq(
  $$
    select role::text, status::text
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  $$ values ('member', 'approved') $$,
  'public group join creates approved member row'
);

-- ── Request private group (pending) ──────────────────────────────────────────

select lives_ok(
  $$
    select public.join_group('40000000-0000-4000-8000-000000000002')
  $$,
  'locality member can request to join a private group'
);

-- hidden-member cannot see their own pending membership in the private group
-- (RLS hides memberships in private groups from non-approved members).
-- Verify the row exists via the group owner (member-one).
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select status::text
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000002'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  $$ values ('pending') $$,
  'private group request creates pending membership (visible to owner)'
);


-- ── Delete own membership (leave group) ──────────────────────────────────────

select lives_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'member can leave a group'
);

select is_empty(
  $$
    select 1
    from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'membership row is gone after leaving'
);

reset role;

select * from finish();
rollback;
