-- RED-003 — matriz de publicações (R2-matriz-publicacoes §2–§4).
-- Cobre posts, comments, post_reactions, post_saves, post_follows e a nova
-- hidden_posts, por ator e estado. Publicação é sempre de grupo.

begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

\ir fixtures/foundation.inc
\ir fixtures/redesenho.inc

-- ── Leitura por estado ─────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000001'),
  1, 'publicacoes+: cidade lê publicação do grupo Aberto');

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000002'),
  0, 'publicacoes-: cidade não lê publicação do grupo Fechado');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000002'),
  1, 'publicacoes+: membro lê publicação do grupo Fechado');

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000003'),
  0, 'publicacoes-: membro do Fechado não lê publicação do Encerrado alheio');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000001'),
  0, 'publicacoes-: outra cidade não lê publicação de grupo alheio');

-- ── Criar: só membro ativo, nunca em Encerrado ─────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into public.posts (locality_id, user_id, group_id, post_type, content)
     values ('00000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000002',
             '81000000-0000-4000-8000-000000000002', 'text', 'Aviso do moderador') $$,
  'publicacoes+: membro publica no grupo Fechado');

select throws_ok(
  $$ insert into public.posts (locality_id, user_id, group_id, post_type, content)
     values ('00000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000002',
             '81000000-0000-4000-8000-000000000003', 'text', 'Escrevendo no Encerrado') $$,
  42501, null, 'publicacoes-: não se publica em grupo Encerrado');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ insert into public.posts (locality_id, user_id, post_type, content)
     values ('00000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001', 'text', 'Sem grupo não existe') $$,
  null, null, 'publicacoes-: publicação sem grupo é recusada');

-- ── Comentários e reações ──────────────────────────────────────────────────
select lives_ok(
  $$ insert into public.comments (id, post_id, user_id, content)
     values ('93000000-0000-4000-8000-000000000201',
             '91000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001', 'Comentário do autor') $$,
  'publicacoes+: o autor comenta na própria publicação');

select lives_ok(
  $$ insert into public.post_reactions (id, post_id, user_id)
     values ('94000000-0000-4000-8000-000000000001',
             '91000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001') $$,
  'publicacoes+: Útil é uma reação própria por publicação');

select throws_ok(
  $$ insert into public.post_reactions (id, post_id, user_id)
     values ('94000000-0000-4000-8000-000000000002',
             '91000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000001') $$,
  23505, null, 'publicacoes-: não há duas reações da mesma pessoa');

select lives_ok(
  $$ delete from public.post_reactions
     where post_id = '91000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000001' $$,
  'publicacoes+: a própria reação pode ser desfeita');

-- comentário do autor continua editável; remoção por moderação não volta
select lives_ok(
  $$ update public.comments set content = 'Comentário editado'
     where id = '93000000-0000-4000-8000-000000000201' $$,
  'publicacoes+: o autor edita o próprio comentário');

reset role;
update public.posts set is_deleted = true where id = '91000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ update public.posts set is_deleted = false
     where id = '91000000-0000-4000-8000-000000000001' $$,
  42501, null, 'publicacoes-: o autor não ressuscita conteúdo removido pela moderação');

-- ── Salvos, seguidos e ocultação são pessoais ──────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into public.post_saves (post_id, user_id)
     values ('91000000-0000-4000-8000-000000000002',
             '10000000-0000-4000-8000-000000000002') $$,
  'publicacoes+: salvar publicação legível');

select lives_ok(
  $$ insert into public.post_follows (post_id, user_id)
     values ('91000000-0000-4000-8000-000000000002',
             '10000000-0000-4000-8000-000000000002') $$,
  'publicacoes+: seguir publicação legível');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.post_saves
    where user_id = '10000000-0000-4000-8000-000000000002'),
  0, 'publicacoes-: os salvos de outra pessoa não são legíveis');

select is(
  (select count(*)::int from public.post_follows
    where user_id = '10000000-0000-4000-8000-000000000002'),
  0, 'publicacoes-: os seguidos de outra pessoa não são legíveis');

-- hidden_posts: ocultar é pessoal e exige leitura da publicação
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into public.hidden_posts (user_id, post_id)
     values ('10000000-0000-4000-8000-000000000002',
             '91000000-0000-4000-8000-000000000002') $$,
  'publicacoes+: ocultar a publicação legível');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.hidden_posts
    where user_id = '10000000-0000-4000-8000-000000000002'),
  0, 'publicacoes-: a ocultação de outra pessoa não é legível');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ delete from public.hidden_posts
     where user_id = '10000000-0000-4000-8000-000000000002'
       and post_id = '91000000-0000-4000-8000-000000000002' $$,
  'publicacoes+: mostrar de novo (a lista pessoal volta)');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ insert into public.hidden_posts (user_id, post_id)
     values ('10000000-0000-4000-8000-000000000004',
             '91000000-0000-4000-8000-000000000002') $$,
  42501, null, 'publicacoes-: não se oculta publicação ilegível');

-- ── Feeds respeitam o estado do grupo ──────────────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select isnt_empty(
  $$ select id from public.feed_group('81000000-0000-4000-8000-000000000002') $$,
  'publicacoes+: o feed do grupo Fechado aparece para o membro');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is_empty(
  $$ select id from public.feed_group('81000000-0000-4000-8000-000000000002') $$,
  'publicacoes-: o feed do Fechado não aparece para a cidade');

select is_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
     where id = '91000000-0000-4000-8000-000000000002' $$,
  'publicacoes-: o feed da cidade não inclui publicação de grupo Fechado');

select isnt_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001') $$,
  'publicacoes+: o feed da cidade entrega o que é do Aberto');

select * from finish();
rollback;