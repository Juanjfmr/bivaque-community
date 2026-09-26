-- Onda E Task 11 — group interests + suggestion feed.
-- §3.2: interests map to groups, no parallel taxonomy.
-- §3.3: a private group only suggests to members of its container.
--
-- Three negative cases asserted:
--   - cross-locality: a public group from another locality never suggests
--   - private-not-member: a private group the user is not in never suggests
--   - already-member: a group the user already approved-joined never suggests

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- Reset role so we can call the service_role-only wrappers as the owner.
reset role;

-- Add a public group nobody is in yet (member-one can mark it as interest).
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
) values (
  '40000000-0000-4000-8000-000000000010',
  'Voleibol de Praia',
  'Encontros no parque aos sábados',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

-- Add a PRIVATE group member-one is NOT in. This is the §3.3 negative case.
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
) values (
  '40000000-0000-4000-8000-000000000020',
  'Sindicato (privado)',
  'Discussões fechadas de carreira',
  'private',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000004'
);
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000004',
  'owner',
  'approved'
);

-- Add a public group in locality 2 (Fixture City) — the cross-locality
-- negative case.
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
) values (
  '40000000-0000-4000-8000-000000000030',
  'Voleibol em Fixture City',
  'Mesma modalidade, outra cidade',
  'public',
  '00000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000003'
);

-- ── POSITIVE: record an interest, list it back ─────────────────────────────
select lives_ok(
  $$
    select public.record_user_group_interests(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid,
      array['40000000-0000-4000-8000-000000000010'::uuid]
    )
  $$,
  'E11+: verified member records an interest in a public group in their locality'
);

select results_eq(
  $$
    select group_id::text from public.user_group_interests
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('40000000-0000-4000-8000-000000000010'::text) $$,
  'E11+: recorded interest appears in user_group_interests'
);

-- ── POSITIVE: suggest returns groups in the SAME locality ──────────────────
-- The new public group is recorded; it should NOT appear in suggestions
-- (already_interest excludes it). Member-one is approved in groups -001 and
-- -002, so those are excluded too. The PRIVATE group -020 member-one is not
-- in should be excluded (§3.3). So suggestions should be empty for member-one.
select is_empty(
  $$
    select id from public.suggest_groups_for_user(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'E11+: member-one sees no new suggestions (already in or already interest in everything public)'
);

-- ── POSITIVE: clear the interest, the new group appears in suggestions ────
select lives_ok(
  $$
    select public.record_user_group_interests(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid,
      array[]::uuid[]
    )
  $$,
  'E11+: clearing interests succeeds (empty array removes all)'
);

select isnt_empty(
  $$
    select id from public.suggest_groups_for_user(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid
    )
    where id = '40000000-0000-4000-8000-000000000010'::uuid
  $$,
  'E11+: after clearing, the public group member-one is not in reappears'
);

-- ── NEGATIVE: cross-locality group never suggests ──────────────────────────
-- The Fixture City public group is in locality 2; member-one is in locality
-- 1. It must NOT appear in member-one's locality-1 suggestions.
select is_empty(
  $$
    select id from public.suggest_groups_for_user(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid
    )
    where id = '40000000-0000-4000-8000-000000000030'::uuid
  $$,
  'E11-: cross-locality public group never suggests to a member of another locality'
);

-- ── NEGATIVE: private group user is not in never suggests (§3.3) ──────────
-- Group -020 is private and member-one is not in it. It must not appear in
-- suggestions even though it's in the same locality.
select is_empty(
  $$
    select id from public.suggest_groups_for_user(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid
    )
    where id = '40000000-0000-4000-8000-000000000020'::uuid
  $$,
  'E11-: private group user is not in never suggests (§3.3 visibility is container-relative)'
);

-- ── NEGATIVE: record refuses a group outside the locality ──────────────────
select throws_ok(
  $$
    select public.record_user_group_interests(
      '10000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid,
      array['40000000-0000-4000-8000-000000000030'::uuid]
    )
  $$,
  '42501',
  null,
  'E11-: record refuses a group outside the locality with errcode 42501'
);

select * from finish();
rollback;