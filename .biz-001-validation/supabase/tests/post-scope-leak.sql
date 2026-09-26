-- Regression tests for migration 018 (fix_post_scope_leak).
--
-- Two holes are covered here:
--   1. Group scope — private-group posts, comments and reactions must not be
--      readable or writable by locality members outside the group. A PENDING
--      membership request must not qualify as membership.
--   2. feed_posts() authorization — the security-definer RPC must not return
--      rows to a caller who is not a member of the requested locality.
--
-- Every denial has a matching positive assertion so the fix cannot pass by
-- simply denying everyone.

begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc
\ir fixtures/community.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- Extra fixtures: posts scoped to the public and private groups from
-- groups.inc. Seeded as the migration role so RLS does not interfere.
--   40000000-…-0001 = PUBLIC group  "Grupo de Corrida"
--   40000000-…-0002 = PRIVATE group "Clube do Livro"
-- member-one  (001) owns both groups
-- member-two  (002) approved in public, PENDING in private
-- hidden-member (004) Manaus member, in no group
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.posts (
  id, locality_id, user_id, group_id, post_type, content, created_at
)
values (
  '4a000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  'text',
  'Leitura do mes definida',
  '2026-08-03 10:00:00+00'
);

insert into public.posts (
  id, locality_id, user_id, group_id, post_type, content, created_at
)
values (
  '4a000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'text',
  'Treino de amanha as seis',
  '2026-08-03 11:00:00+00'
);

insert into public.comments (id, post_id, user_id, content, created_at)
values (
  '5a000000-0000-4000-8000-000000000001',
  '4a000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Combinado entao',
  '2026-08-03 10:05:00+00'
);

insert into public.post_reactions (id, post_id, user_id)
values (
  '6a000000-0000-4000-8000-000000000001',
  '4a000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: member-two has a PENDING request in the private group.
-- Pending must not grant read access.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.posts
    where id = '4a000000-0000-4000-8000-000000000001'
  $$,
  'pending member cannot read a private-group post'
);

select is_empty(
  $$
    select 1 from public.comments
    where id = '5a000000-0000-4000-8000-000000000001'
  $$,
  'pending member cannot read a comment on a private-group post'
);

select isnt_empty(
  $$
    select 1 from public.posts
    where id = '4a000000-0000-4000-8000-000000000002'
  $$,
  'approved member of the public group can read its post'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: hidden-member is a Manaus member but belongs to no group.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.posts
    where id = '4a000000-0000-4000-8000-000000000001'
  $$,
  'locality member outside the group cannot read a private-group post'
);

select is_empty(
  $$
    select 1 from public.comments
    where id = '5a000000-0000-4000-8000-000000000001'
  $$,
  'locality member outside the group cannot read its comments'
);

select is_empty(
  $$
    select 1 from public.post_reactions
    where id = '6a000000-0000-4000-8000-000000000001'
  $$,
  'locality member outside the group cannot read its reactions'
);

select throws_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '4a000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004',
      'Entrando na conversa'
    )
  $$,
  42501,
  null,
  'locality member outside the group cannot comment on a private-group post'
);

select throws_ok(
  $$
    insert into public.post_reactions (post_id, user_id)
    values (
      '4a000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004'
    )
  $$,
  42501,
  null,
  'locality member outside the group cannot react to a private-group post'
);

select throws_ok(
  $$
    insert into public.post_saves (user_id, post_id)
    values (
      '10000000-0000-4000-8000-000000000004',
      '4a000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'locality member outside the group cannot save a private-group post'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, group_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004',
      '40000000-0000-4000-8000-000000000002',
      'text',
      'Postando de fora'
    )
  $$,
  42501,
  null,
  'locality member outside the group cannot post into a private group'
);

select is_empty(
  $$
    select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
    where id = '4a000000-0000-4000-8000-000000000001'
  $$,
  'feed_posts hides private-group posts from non-members of the group'
);

-- positive counterweights: the same actor still sees everything they should

select isnt_empty(
  $$
    select 1 from public.posts
    where id = '4a000000-0000-4000-8000-000000000002'
  $$,
  'locality member can read a public-group post'
);

select isnt_empty(
  $$
    select 1 from public.posts
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'locality member can read a locality-wide post'
);

select isnt_empty(
  $$
    select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'feed_posts still returns locality-wide posts'
);

select isnt_empty(
  $$
    select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
    where id = '4a000000-0000-4000-8000-000000000002'
  $$,
  'feed_posts still returns public-group posts'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: non-member calling feed_posts directly (the security-definer hole).
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001') $$,
  'non-member gets no rows from feed_posts'
);

select is_empty(
  'select 1 from public.posts',
  'non-member still sees no posts through RLS'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: cross-locality member calling feed_posts for Manaus.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001') $$,
  'cross-locality member gets no rows from feed_posts for another locality'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ALLOWED: member-one owns both groups and must retain full access.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select content from public.posts
    where id = '4a000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Leitura do mes definida'::text) $$,
  'group member can read the private-group post'
);

select results_eq(
  $$
    select content from public.comments
    where id = '5a000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Combinado entao'::text) $$,
  'group member can read comments on the private-group post'
);

select isnt_empty(
  $$
    select 1 from public.post_reactions
    where id = '6a000000-0000-4000-8000-000000000001'
  $$,
  'group member can read reactions on the private-group post'
);

select isnt_empty(
  $$
    select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
    where id = '4a000000-0000-4000-8000-000000000001'
  $$,
  'feed_posts returns the private-group post to a group member'
);

select lives_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '4a000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'Marcando a data'
    )
  $$,
  'group member can comment on the private-group post'
);

select lives_ok(
  $$
    insert into public.post_saves (user_id, post_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      '4a000000-0000-4000-8000-000000000001'
    )
  $$,
  'group member can save the private-group post'
);

select * from finish();
rollback;
