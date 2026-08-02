begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

\ir fixtures/foundation.inc
\ir fixtures/community.inc

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: nonmember cannot interact with the feed
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.posts',
  'nonmember sees no posts'
);

select is_empty(
  'select 1 from public.comments',
  'nonmember sees no comments'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005',
      'text',
      'Post de intruso'
    )
  $$,
  42501,
  null,
  'nonmember cannot insert a post'
);

select throws_ok(
  $$
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005',
      'Comentario de intruso'
    )
  $$,
  42501,
  null,
  'nonmember cannot insert a comment'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: cross-city member cannot access Manaus feed
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.posts',
  'cross-city member sees no posts from another locality'
);

select is_empty(
  'select 1 from public.comments',
  'cross-city member sees no comments from another locality'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003',
      'text',
      'Post cross-city'
    )
  $$,
  42501,
  null,
  'cross-city member cannot insert a post into another locality'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: forbidden content types are rejected at the schema CHECK level
-- These tests run as member-one (a valid Manaus member) to prove the denial
-- comes from the CHECK constraint, not from RLS.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- anonymous / video / marketplace / AI terms

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Post anônimo na comunidade'
    )
  $$,
  '23514',
  null,
  'post with "anonimo" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Assista ao vídeo da semana'
    )
  $$,
  '23514',
  null,
  'post with "video" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Ofertas do marketplace local'
    )
  $$,
  '23514',
  null,
  'post with "marketplace" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Conteudo gerado por IA'
    )
  $$,
  '23514',
  null,
  'post with "gerado por IA" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Texto com inteligencia artificial'
    )
  $$,
  '23514',
  null,
  'post with "inteligencia artificial" in content rejected by CHECK'
);

-- OM / rank / address / CPF / verification labels

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Minha OM e o batalhao'
    )
  $$,
  '23514',
  null,
  'post with "OM" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Qual a sua patente?'
    )
  $$,
  '23514',
  null,
  'post with "patente" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Meu endereco residencial fica na rua X'
    )
  $$,
  '23514',
  null,
  'post with "endereco residencial" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Meu CPF foi bloqueado'
    )
  $$,
  '23514',
  null,
  'post with "CPF" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Selo de verificacao para membros'
    )
  $$,
  '23514',
  null,
  'post with "selo de verificacao" in content rejected by CHECK'
);

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Posto militar e graduacao militar'
    )
  $$,
  '23514',
  null,
  'post with "posto militar" in content rejected by CHECK'
);

-- commercial / sales terms

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Anuncio comercial com venda de produtos'
    )
  $$,
  '23514',
  null,
  'post with "comercial" and "venda" in content rejected by CHECK'
);

-- structural integrity: link post without URL

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'link',
      'Confira este link'
    )
  $$,
  '23514',
  null,
  'link post without link_url rejected by CHECK'
);

-- invalid post type (video not in enum)

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'video',
      'Assista ao meu video'
    )
  $$,
  null,
  null,
  'post_type "video" is not in the enum'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: cross-user mutation (member-two tries to modify member-one's post)
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
    update public.posts
    set content = 'Hacked by member-two'
    where id = '40000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'member-two cannot update member-one post'
);

select results_eq(
  $$
    delete from public.posts
    where id = '40000000-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ select null::uuid where false $$,
  'member-two cannot delete member-one post'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DENIAL: forbidden terms in comments
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
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'Meu CPF e 123'
    )
  $$,
  '23514',
  null,
  'comment with "CPF" in content rejected by CHECK'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ALLOWED: verified member (member-one) can read the feed (positive identity)
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- confirm member-one can see their own seed post and its comment
select results_eq(
  $$
    select content
    from public.posts
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Bem-vindos ao Bivaque Manaus!'::text) $$,
  'member-one can read seed post'
);

select results_eq(
  $$
    select content
    from public.comments
    where id = '50000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Que legal!'::text) $$,
  'member-one can read seed comment'
);

-- confirm member-one can create a valid text post
select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Ola comunidade!'
    )
  $$,
  'member-one can insert a valid text post'
);

-- confirm unverified member (hidden-member, 004) can read posts
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select content
    from public.posts
    where id = '40000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Bem-vindos ao Bivaque Manaus!'::text) $$,
  'unverified locality member can read posts in their locality'
);

select * from finish();
rollback;
