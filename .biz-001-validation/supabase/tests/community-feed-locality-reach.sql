-- Onda E Task 1 — locality-reach posts land in every vila feed.
-- Without this, posts published with community_id = null (city-wide reach)
-- never appear in any vila feed, because feed_community's previous where
-- clause only matched community_id = p_community_id or group_id in
-- visible_groups. The composer already records this choice; the feed did not.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Two locality-reach posts: one in the locality of Vila Ajuricaba (the
-- community the test reads), one in the other locality. Both have
-- community_id and group_id NULL, which is exactly the shape the composer
-- produces when the audience selector picks "city-wide reach".
insert into public.posts (
  id, locality_id, user_id, community_id, group_id, post_type, content, created_at
)
values
  (
    '90000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    null,
    null,
    'text',
    'Aviso da cidade para todas as vilas',
    '2026-08-04 12:00:00+00'
  ),
  (
    '90000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    null,
    null,
    'text',
    'Aviso de outra cidade nao deve vazar',
    '2026-08-04 13:00:00+00'
  ),
  -- A post of Vila Vizinha (community -002) in the same locality. If the
  -- new locality-reach branch stopped filtering by community, this post
  -- would leak into Vila Ajuricaba's feed. The negative test below
  -- asserts it does not.
  (
    '90000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    null,
    'text',
    'Post da vila vizinha',
    '2026-08-04 14:00:00+00'
  );

-- ── POSITIVE ───────────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000004' $$,
  'E1+: post de alcance da cidade aparece no feed da vila da mesma localidade'
);

select isnt_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000001' $$,
  'E1+: post da vila continua aparecendo (regressao da base)'
);

select isnt_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000002' $$,
  'E1+: post de grupo publico da vila continua aparecendo'
);

-- ── NEGATIVE ───────────────────────────────────────────────────────────────

-- cross-vila isolation: even though Vila Vizinha is in the same locality,
-- its posts must not appear in Vila Ajuricaba's feed. The new locality-reach
-- branch is keyed on locality_id, not on community_id, so the only reason a
-- post from community -002 would leak is if the branch stopped filtering by
-- community. The community_id IS NULL branch excludes it; community_id =
-- p_community_id branch excludes it; group_id in visible_groups excludes it.
-- We assert it stays out.
select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where community_id = '70000000-0000-4000-8000-000000000002' $$,
  'E1-: posts da outra vila na mesma cidade nao vazam'
);

-- cross-locality isolation: a locality-reach post in another city must NOT
-- appear.
select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000005' $$,
  'E1-: post de alcance de outra cidade nao vaza para a vila'
);

-- pending member: the negative gate is the am_member cte, not the locality
-- branch. member-two is pending in community -001 and must see nothing.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id in (
       '90000000-0000-4000-8000-000000000001',
       '90000000-0000-4000-8000-000000000002',
       '90000000-0000-4000-8000-000000000004'
     ) $$,
  'E1-: membro pendente nao ve nenhum post da vila (gate de am_member)'
);

select * from finish();
rollback;
