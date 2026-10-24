-- Lote 5, tarefa A1 (COM-002) — o ciclo da pergunta.
--
-- Autoridade: ADR-20261023-comunidade-do-prototipo.md, secao "2. Pergunta e
-- resposta". O que esta suite prova, contra o schema real:
--   * o titulo da pergunta tem de 8 a 300 caracteres;
--   * resolver por resposta grava a resolucao atual E a ultima; resolver sem
--     resposta esvazia a atual e mantem a ultima; reabrir mantem a ultima;
--   * quem nao e a autora nao marca, nao resolve e nao reabre (positivo e
--     negativo por via de permissao);
--   * a autoria so escreve CONTEUDO: o PATCH direto nas colunas de resolucao ou
--     em `edited_at` e recusado por permissao;
--   * excluir a resposta que resolveu reabre a pergunta; excluir a pergunta leva
--     as respostas junto (cascade);
--   * a resposta de OUTRA pergunta e recusada pelo RPC e pelo gatilho;
--   * `list_indications` separa "Minhas" e "Para ajudar" pela autoria, no
--     servidor, e no "Para ajudar" quem nao tem resposta vem primeiro;
--   * a leitura da conversa (`list_question_replies`) devolve a resposta
--     removida pela moderacao como aviso, sem texto e sem autor, e nao abre a
--     conversa para quem nao alcanca o pedido.

begin;

create extension if not exists pgtap with schema extensions;
select plan(59);

\ir fixtures/foundation.inc
\ir fixtures/recommendations.inc

reset role;

-- ── cenario ────────────────────────────────────────────────────────────────
-- member-one (001) tem duas perguntas na cidade 001; member-two (002) tem duas
-- (uma respondida, uma sem resposta), para o filtro por autoria e para a ordem
-- do "Para ajudar".

insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Preciso de eletricista em casa',
   'O quadro de luz esta desarmando.', 'servicos_locais'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Onde encontrar um bom pediatra',
   'Para crianca de 3 anos.', 'saude_bem_estar'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000001', 'Indicacao de chaveiro na zona norte',
   'Perdi a chave de casa.', 'servicos_locais'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000001', 'Procuro costureira para ajustes',
   'Duas calcas para ajustar.', 'servicos_locais');

insert into public.recommendation_replies (id, request_id, author_id, body)
values
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000002', 'Chama o seu Raimundo, ele atende a vila toda.'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000002', 'Tambem uso o Raimundo, servico bom e rapido.'),
  ('61000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000002', 'A Dra. Helena atende muito bem no centro.'),
  ('61000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000001', 'A Dona Celia faz chaves na feira do bairro.');

-- ── 1. o titulo: 8..300 ────────────────────────────────────────────────────
-- Na cidade 002 de proposito: nao poluir as contagens de list_indications da
-- cidade 001 la embaixo.

select lives_ok(
  $$
    insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
    values ('62000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002', 'Chaveiro', '', 'servicos_locais')
  $$,
  'titulo com 8 caracteres e aceito'
);

select throws_ok(
  $$
    insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
    values ('62000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002', 'Chaveir', '', 'servicos_locais')
  $$,
  '23514',
  null,
  'titulo com 7 caracteres e recusado'
);

select lives_ok(
  $$
    insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
    values ('62000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002', repeat('a', 300), '', 'outros')
  $$,
  'titulo com 300 caracteres e aceito'
);

select throws_ok(
  $$
    insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
    values ('62000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000002', repeat('a', 301), '', 'outros')
  $$,
  '23514',
  null,
  'titulo com 301 caracteres e recusado'
);

-- ── 2. resolver por resposta: atual e ultima ───────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '60000000-0000-4000-8000-000000000001'::uuid,
      '61000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'a autora marca uma resposta da propria pergunta'
);

select is(
  (select resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  '61000000-0000-4000-8000-000000000001'::uuid,
  'a resolucao atual aponta para a resposta marcada'
);

select is(
  (select last_resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  '61000000-0000-4000-8000-000000000001'::uuid,
  'marcar por resposta guarda tambem a ultima'
);

select is(
  (select is_resolved from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  true,
  'marcar a resposta fecha a pergunta'
);

select is(
  (select resolved_by from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  '10000000-0000-4000-8000-000000000001'::uuid,
  'quem resolveu foi a autora'
);

-- ── 3. resolver sem resposta: esvazia a atual, mantem a ultima ─────────────

select lives_ok(
  $$ select public.mark_recommendation_resolved('60000000-0000-4000-8000-000000000001'::uuid) $$,
  'a autora marca a pergunta como resolvida sem escolher resposta'
);

select is(
  (select resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  null::uuid,
  'resolver sem resposta esvazia a resolucao atual'
);

select is(
  (select last_resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  '61000000-0000-4000-8000-000000000001'::uuid,
  'resolver sem resposta mantem a ultima'
);

select is(
  (select is_resolved from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  true,
  'resolvida sem resposta continua sendo uma pergunta resolvida'
);

-- ── 4. reabrir: mantem a ultima ────────────────────────────────────────────

select lives_ok(
  $$ select public.reopen_recommendation('60000000-0000-4000-8000-000000000001'::uuid) $$,
  'a autora reabre a pergunta'
);

select is(
  (select is_resolved from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  false,
  'reabrir volta is_resolved para falso'
);

select is(
  (select resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  null::uuid,
  'reabrir esvazia a resolucao atual'
);

select is(
  (select last_resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  '61000000-0000-4000-8000-000000000001'::uuid,
  'reabrir guarda a ultima resposta que resolveu'
);

-- ── 5. negativos de autoria e de integridade ───────────────────────────────

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '60000000-0000-4000-8000-000000000001'::uuid,
      '61000000-0000-4000-8000-000000000001'::uuid
    )
  $$,
  'P0002',
  null,
  'quem nao escreveu a pergunta nao marca a resposta'
);

select throws_ok(
  $$ select public.mark_recommendation_resolved('60000000-0000-4000-8000-000000000001'::uuid) $$,
  'P0002',
  null,
  'quem nao escreveu a pergunta nao a resolve'
);

select throws_ok(
  $$ select public.reopen_recommendation('60000000-0000-4000-8000-000000000001'::uuid) $$,
  'P0002',
  null,
  'quem nao escreveu a pergunta nao a reabre'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '60000000-0000-4000-8000-000000000001'::uuid,
      '61000000-0000-4000-8000-000000000003'::uuid
    )
  $$,
  'P0002',
  null,
  'marcar resposta de outra pergunta e recusado pelo RPC'
);

select throws_ok(
  $$
    update public.recommendation_requests
    set resolved_reply_id = '61000000-0000-4000-8000-000000000003'::uuid
    where id = '60000000-0000-4000-8000-000000000001'::uuid
  $$,
  '42501',
  null,
  'o PATCH direto na resolucao atual e recusado por permissao'
);

select throws_ok(
  $$
    update public.recommendation_requests
    set last_resolved_reply_id = '61000000-0000-4000-8000-000000000003'::uuid
    where id = '60000000-0000-4000-8000-000000000001'::uuid
  $$,
  '42501',
  null,
  'o PATCH direto na ultima resolucao e recusado por permissao'
);

select throws_ok(
  $$
    update public.recommendation_requests
    set is_resolved = true
    where id = '60000000-0000-4000-8000-000000000001'::uuid
  $$,
  '42501',
  null,
  'o PATCH direto de is_resolved e recusado por permissao'
);

select throws_ok(
  $$
    update public.recommendation_requests
    set edited_at = null
    where id = '60000000-0000-4000-8000-000000000001'::uuid
  $$,
  '42501',
  null,
  'a autoria nao consegue apagar a marca de edicao da pergunta'
);

-- A resposta: a autoria (member-two) so escreve o corpo.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    update public.recommendation_replies
    set edited_at = null
    where id = '61000000-0000-4000-8000-000000000002'::uuid
  $$,
  '42501',
  null,
  'a autoria nao consegue apagar a marca de edicao da resposta'
);

select throws_ok(
  $$
    update public.recommendation_replies
    set is_deleted = true
    where id = '61000000-0000-4000-8000-000000000002'::uuid
  $$,
  '42501',
  null,
  'a autoria nao consegue marcar a propria resposta como removida'
);

-- ── 5b. editar a pergunta grava a data da edicao ───────────────────────────

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    update public.recommendation_requests
    set title = 'Preciso de eletricista em casa ainda hoje'
    where id = '60000000-0000-4000-8000-000000000001'::uuid
  $$,
  'a autora edita o titulo da propria pergunta'
);

select ok(
  (select edited_at is not null from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000001'),
  'editar a pergunta grava a data da edicao'
);

-- Resolver NAO e edicao: a data da edicao nao se move.
select lives_ok(
  $$ select public.mark_recommendation_resolved('60000000-0000-4000-8000-000000000002'::uuid) $$,
  'a autora resolve a segunda pergunta'
);

select ok(
  (select edited_at is null from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000002'),
  'resolver nao marca a pergunta como editada'
);

select lives_ok(
  $$ select public.reopen_recommendation('60000000-0000-4000-8000-000000000002'::uuid) $$,
  'a autora reabre a segunda pergunta para restaurar o estado'
);

-- ── 6. "Minhas" e "Para ajudar" no servidor ────────────────────────────────
-- member-one tem a pergunta do fixture (4000...001) e as duas proprias (A, B):
-- tres. member-two tem C e D: dois.

select is(
  (select count(*)::integer from public.list_indications(
    '00000000-0000-4000-8000-000000000001', null, null, null, 50, 0, true)),
  3,
  'Minhas devolve so as perguntas de quem le'
);

select is(
  (select count(*)::integer from public.list_indications(
    '00000000-0000-4000-8000-000000000001', null, null, null, 50, 0, false)),
  2,
  'sem "Minhas", a lista da so as perguntas de outras pessoas'
);

select is(
  (select count(*)::integer from public.list_indications(
    '00000000-0000-4000-8000-000000000001', null, null, null, 50, 0, null)),
  5,
  'sem filtro de autoria, a lista traz as duas autorias'
);

select results_eq(
  $$
    select id from public.list_indications(
      '00000000-0000-4000-8000-000000000001', null, null, false, 50, 0, false
    )
    limit 1
  $$,
  $$ values ('60000000-0000-4000-8000-000000000004'::uuid) $$,
  'Para ajudar: a pergunta sem resposta aparece primeiro'
);

-- ── 7. a conversa: leitura do removido sem vazar texto nem autor ───────────

select is(
  (select count(*)::integer from public.list_question_replies(
    '60000000-0000-4000-8000-000000000001')),
  2,
  'quem alcanca o pedido le as duas respostas'
);

select is(
  (select author_id from public.list_question_replies(
    '60000000-0000-4000-8000-000000000001')
   where id = '61000000-0000-4000-8000-000000000001'),
  '10000000-0000-4000-8000-000000000002'::uuid,
  'resposta viva devolve o autor'
);

-- A autora da resposta (member-two) edita o proprio texto.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$
    update public.recommendation_replies
    set body = 'Chama o seu Raimundo, ele atende a vila toda e cobra justo.'
    where id = '61000000-0000-4000-8000-000000000002'
  $$,
  'a autora da resposta edita o proprio texto'
);

select ok(
  (select edited_at is not null from public.recommendation_replies
    where id = '61000000-0000-4000-8000-000000000002'),
  'editar o texto grava a data da edicao'
);

-- Negativo: quem nao escreveu a resposta nao consegue mudar o texto. A RLS
-- bloqueia a linha sem erro; o texto tem de continuar o mesmo.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    update public.recommendation_replies
    set body = 'Tentativa de outra pessoa de mudar o texto.'
    where id = '61000000-0000-4000-8000-000000000002'
  $$,
  'quem nao escreveu a resposta nao recebe erro ao tentar editar'
);

select is(
  (select body from public.recommendation_replies
    where id = '61000000-0000-4000-8000-000000000002'),
  'Chama o seu Raimundo, ele atende a vila toda e cobra justo.'::text,
  'o texto de outra pessoa nao muda'
);

-- A moderacao remove uma resposta (service_role/operador vira is_deleted).
reset role;

update public.recommendation_replies
   set is_deleted = true
 where id = '61000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select is_removed from public.list_question_replies(
    '60000000-0000-4000-8000-000000000001')
   where id = '61000000-0000-4000-8000-000000000001'),
  true,
  'a resposta removida volta marcada como removida'
);

select is(
  (select body from public.list_question_replies(
    '60000000-0000-4000-8000-000000000001')
   where id = '61000000-0000-4000-8000-000000000001'),
  null::text,
  'o aviso de removido nunca expoe o texto'
);

select is(
  (select author_id from public.list_question_replies(
    '60000000-0000-4000-8000-000000000001')
   where id = '61000000-0000-4000-8000-000000000001'),
  null::uuid,
  'o aviso de removido nunca expoe o autor'
);

-- Negativos: quem nao alcanca o pedido nao le a conversa.

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select throws_ok(
  $$ select * from public.list_question_replies('60000000-0000-4000-8000-000000000001') $$,
  'P0002',
  null,
  'membro de outra cidade nao le a conversa'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select throws_ok(
  $$ select * from public.list_question_replies('60000000-0000-4000-8000-000000000001') $$,
  'P0002',
  null,
  'quem nao e membro de cidade nenhuma nao le a conversa'
);

-- ── 8. excluir a resposta que resolveu reabre a pergunta ───────────────────
-- A pergunta 003 (member-two) tem a resposta 004 (member-one). member-two marca
-- essa resposta como resolucao e member-one — quem escreveu a resposta, nao a
-- pergunta — a exclui, como pode no prototipo (manage.js:65).

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.mark_recommendation_reply_resolved(
      '60000000-0000-4000-8000-000000000003'::uuid,
      '61000000-0000-4000-8000-000000000004'::uuid
    )
  $$,
  'a autora marca a resposta da propria pergunta'
);

select is(
  (select is_resolved from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000003'),
  true,
  'a pergunta esta resolvida antes da exclusao'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    delete from public.recommendation_replies
    where id = '61000000-0000-4000-8000-000000000004'::uuid
  $$,
  'quem escreveu a resposta exclui a propria resposta'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select is_resolved from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000003'),
  false,
  'excluir a resposta que resolveu reabre a pergunta'
);

select is(
  (select resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000003'),
  null::uuid,
  'a resolucao atual e esvaziada'
);

select is(
  (select resolved_at from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000003'),
  null::timestamptz,
  'o instante da resolucao e limpo'
);

select is(
  (select resolved_by from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000003'),
  null::uuid,
  'quem resolveu e limpo'
);

select is(
  (select last_resolved_reply_id from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000003'),
  null::uuid,
  'a ultima resolucao cai com a resposta excluida (on delete set null)'
);

-- ── 9. excluir a pergunta leva as respostas (cascade) ──────────────────────
-- member-one (001) pergunta e member-two (002) responde: a resposta tem de ser
-- de outro membro, porque a policy de insert exige author_id = auth.uid().

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
    values ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001',
            '00000000-0000-4000-8000-000000000001', 'Preciso de um jardineiro', '',
            'servicos_locais')
  $$,
  'a autora cria uma pergunta nova'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$
    insert into public.recommendation_replies (id, request_id, author_id, body)
    values ('61000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000005',
            '10000000-0000-4000-8000-000000000002', 'Chamo o Seu Jorge, ele cuida do quintal.')
  $$,
  'outra pessoa responde a pergunta'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    delete from public.recommendation_requests
    where id = '60000000-0000-4000-8000-000000000005'::uuid
  $$,
  'a autora exclui a propria pergunta com resposta'
);

reset role;

select is(
  (select count(*)::integer from public.recommendation_replies
    where request_id = '60000000-0000-4000-8000-000000000005'),
  0,
  'excluir a pergunta leva as respostas junto'
);

select * from finish();
rollback;