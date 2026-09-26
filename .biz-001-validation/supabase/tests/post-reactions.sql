begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc
\ir fixtures/community.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- POSITIVE: member-one can react on a visible post
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.post_reactions (post_id, user_id)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'member-one can react on a visible seed post'
);

-- verify reaction_count is reflected in feed_posts
select results_eq(
  $$
    select reaction_count, my_reaction
    from public.feed_posts(
      '00000000-0000-4000-8000-000000000001',
      'recent'
    )
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values (1::bigint, true) $$,
  'feed_posts returns reaction_count=1 and my_reaction=true for reactor'
);

-- member-two also reacts on the same post
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.post_reactions (post_id, user_id)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'member-two can react on the same post'
);

-- member-two sees reaction_count=2 and my_reaction=true
select results_eq(
  $$
    select reaction_count, my_reaction
    from public.feed_posts(
      '00000000-0000-4000-8000-000000000001',
      'recent'
    )
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values (2::bigint, true) $$,
  'member-two sees reaction_count=2 and my_reaction=true'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: unique constraint prevents double react
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.post_reactions (post_id, user_id)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23505',
  null,
  'member-one cannot react twice on the same post (unique constraint)'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- POSITIVE: deleting own reaction works
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    delete from public.post_reactions
    where post_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'
  $$,
  'member-two can delete their own reaction'
);

-- verify my_reaction returns to false for member-two
select results_eq(
  $$
    select reaction_count, my_reaction
    from public.feed_posts(
      '00000000-0000-4000-8000-000000000001',
      'recent'
    )
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values (1::bigint, false) $$,
  'feed_posts shows reaction_count=1 and my_reaction=false after member-two deletes reaction'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: non-member cannot react
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.post_reactions (post_id, user_id)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  42501,
  null,
  'non-member cannot react on posts'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: cross-city member cannot react on Manaus post
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.post_reactions (post_id, user_id)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003'
    )
  $$,
  42501,
  null,
  'cross-city member cannot react on another locality post'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: non-member cannot read reactions
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.post_reactions',
  'non-member sees no reactions'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: member-two cannot delete member-one's reaction
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    delete from public.post_reactions
    where post_id = '40000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'member-two cannot delete member-one reaction'
);

select * from finish();
rollback;
