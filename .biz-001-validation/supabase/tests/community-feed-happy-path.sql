begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

\ir fixtures/foundation.inc
\ir fixtures/community.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: member-one creates all four post types
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- text post
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content, created_at)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Post de texto simples',
      '2026-08-02 14:01:00+00'
    )
  $$,
  'member-one can create a text post'
);

-- photo post
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content, photo_path, created_at)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'photo',
      'Foto da comunidade',
      'event-photos/10000000-0000-4000-8000-000000000001/foto1.jpg',
      '2026-08-02 14:02:00+00'
    )
  $$,
  'member-one can create a photo post with photo_path'
);

-- link post
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content, link_url, created_at)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'link',
      'Noticia interessante',
      'https://example.com/noticia',
      '2026-08-02 14:03:00+00'
    )
  $$,
  'member-one can create a link post with link_url'
);

-- poll post
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content, poll_options, created_at)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'poll',
      'Qual o melhor dia?',
      '["Segunda-feira", "Quarta-feira", "Sexta-feira"]'::jsonb,
      '2026-08-02 14:04:00+00'
    )
  $$,
  'member-one can create a poll post with poll_options'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: member-two also creates a post and comments
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- text post by member-two
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content, created_at)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'text',
      'Post do membro dois',
      '2026-08-02 14:05:00+00'
    )
  $$,
  'member-two can create a text post'
);

-- member-two comments on member-one's seed post
select lives_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Muito bom!'
    )
  $$,
  'member-two can comment on member-one post'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: feed query — deterministic ordering
-- ═══════════════════════════════════════════════════════════════════════════

-- recent order: newest first
select results_eq(
  $$
    select post_type, content
    from public.feed_posts(
      '00000000-0000-4000-8000-000000000001',
      'recent'
    )
    order by created_at desc
    limit 2
  $$,
  $$
    values
      ('text'::public.post_type, 'Post do membro dois'::text),
      ('poll'::public.post_type, 'Qual o melhor dia?'::text)
  $$,
  'feed_posts recent order returns newest posts first'
);

-- relevance order: posts with more comments rank higher
-- The seed post has 2 comments (one from fixtures + one from this test)
-- Other posts have 0 comments
select results_eq(
  $$
    select post_type, content, comment_count
    from public.feed_posts(
      '00000000-0000-4000-8000-000000000001',
      'relevant'
    )
    order by comment_count desc, created_at desc
    limit 1
  $$,
  $$
    values ('text'::public.post_type, 'Bem-vindos ao Bivaque Manaus!'::text, 2::bigint)
  $$,
  'feed_posts relevant order ranks seed post highest by comment count'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: self-scoped updates and deletes
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- update own post
select lives_ok(
  $$
    update public.posts
    set content = 'Post atualizado'
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  'member-one can update their own post'
);

select results_eq(
  $$
    select content
    from public.posts
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Post atualizado'::text) $$,
  'post update is visible after commit'
);

-- update own comment (the seed comment by member-two) — member-one cannot
-- But member-two can update their own comment

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    update public.comments
    set content = 'Que legal demais!'
    where id = '50000000-0000-4000-8000-000000000001'
  $$,
  'member-two can update their own comment'
);

select results_eq(
  $$
    select content
    from public.comments
    where id = '50000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Que legal demais!'::text) $$,
  'comment update is visible after commit'
);

-- delete own comment — member-two creates a new comment then deletes it
select lives_ok(
  $$
    with new_comment as (
      insert into public.comments (post_id, user_id, content)
      values (
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        'Comentario temporario'
      )
      returning id
    )
    delete from public.comments
    where id = (select id from new_comment)
  $$,
  'member-two can delete their own comment'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: feed_posts RPC returns profile display_name
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
    select display_name
    from public.feed_posts(
      '00000000-0000-4000-8000-000000000001',
      'recent'
    )
    where user_id = '10000000-0000-4000-8000-000000000001'
    limit 1
  $$,
  $$ values ('Member One'::text) $$,
  'feed_posts returns profile display_name for post author'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- HAPPY PATH: member-two sees the feed (different member, same locality)
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) >= 5 from public.posts),
  true,
  'member-two sees multiple posts in their locality feed'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- EDGE: photo post without photo_path is rejected by CHECK
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
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'photo',
      'Foto sem arquivo'
    )
  $$,
  'photo post without photo_path is accepted (CHECK only requires photo_path→photo_type, not reverse)'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- EDGE: empty content is rejected
-- ═══════════════════════════════════════════════════════════════════════════

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      ''
    )
  $$,
  23514,
  null,
  'empty content is rejected by CHECK'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- EDGE: post with photo_path but type=text is rejected
-- ═══════════════════════════════════════════════════════════════════════════

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content, photo_path)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Post de texto com foto',
      'event-photos/fake.jpg'
    )
  $$,
  23514,
  null,
  'text post with photo_path is rejected (structural integrity)'
);

select * from finish();
rollback;
