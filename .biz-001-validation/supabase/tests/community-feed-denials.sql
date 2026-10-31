begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

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
-- ACCEPTANCE: vocabulary is no longer rejected at the schema level (D21).
-- These tests run as member-one (a valid Manaus member) to prove the words the
-- community actually uses now insert cleanly; abuse is handled by moderation.
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- anonymous / video / marketplace / AI terms

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Post anônimo na comunidade'
    )
  $$,
  'post with "anonimo" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Assista ao vídeo da semana'
    )
  $$,
  'post with "video" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Ofertas do marketplace local'
    )
  $$,
  'post with "marketplace" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Conteudo gerado por IA'
    )
  $$,
  'post with "gerado por IA" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Texto com inteligencia artificial'
    )
  $$,
  'post with "inteligencia artificial" in content is accepted (D21)'
);

-- OM / rank / address / CPF / verification labels

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Minha OM e o batalhao'
    )
  $$,
  'post with "OM" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Qual a sua patente?'
    )
  $$,
  'post with "patente" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Meu endereco residencial fica na rua X'
    )
  $$,
  'post with "endereco residencial" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Meu CPF foi bloqueado'
    )
  $$,
  'post with "CPF" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Selo de verificacao para membros'
    )
  $$,
  'post with "selo de verificacao" in content is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Posto militar e graduacao militar'
    )
  $$,
  'post with "posto militar" in content is accepted (D21)'
);

-- commercial / sales terms

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Anuncio comercial com venda de produtos'
    )
  $$,
  'post with "comercial" and "venda" in content is accepted (D21)'
);

-- Motivating cases from D21 (BIVAQUE.md): these must publish.

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Procuro plano de saúde para dependente'
    )
  $$,
  'post asking for a health plan is accepted (D21)'
);

select lives_ok(
  $$
    insert into public.posts (locality_id, user_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'text',
      'Alguém tem o telefone do despachante?'
    )
  $$,
  'post asking for a phone number is accepted (D21)'
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
-- ACCEPTANCE: vocabulary in comments is no longer rejected (D21)
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
    insert into public.comments (post_id, user_id, content)
    values (
      '40000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'Meu CPF e 123'
    )
  $$,
  'comment with "CPF" in content is accepted (D21)'
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
