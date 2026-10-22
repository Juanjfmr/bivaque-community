-- Ocultar para mim (ADR-20261022, secao 2).
--
-- O que esta suite prova, contra o schema real:
--   * o vinculo e pessoal: so o dono le, cria e apaga as proprias linhas, e a
--     negativa de cada caminho tem teste;
--   * ocultar NAO e moderacao: is_deleted continua falso e a lista de outra
--     pessoa continua com a pergunta;
--   * a lista da Comunidade (list_indications) deixa de trazer o que o leitor
--     ocultou, e a leitura direta da pergunta continua funcionando;
--   * "Ocultados" (list_hidden_questions) devolve a pergunta e a data e nao
--     devolve o que a moderacao removeu;
--   * apagar a pergunta, apagar a conta de vez (cascade) ou purgar a conta
--     leva as ocultacoes junto.

begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

\ir fixtures/foundation.inc
\ir fixtures/recommendations.inc

-- Pergunta de outra cidade: existe para provar que ninguem oculta o que nao
-- consegue ver.
insert into public.recommendation_requests (
  id, author_id, locality_id, title, body, category
)
values (
  '40000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'Onde achar chaveiro na outra cidade?',
  'Preciso de um chaveiro de confianca aqui na outra cidade.',
  'servicos_locais'
);

-- Pergunta usada so no fim, para provar o cascade da conta.
insert into public.recommendation_requests (
  id, author_id, locality_id, title, body, category
)
values (
  '40000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Alguem indica um eletricista?',
  'Preciso de eletricista para uma instalacao simples em casa.',
  'servicos_locais'
);

-- ── 1. antes de ocultar, a leitora ve a pergunta na lista da Comunidade ─────
-- (sem esta medida, o zero depois da ocultacao nao provaria nada)

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)
    from public.list_indications('00000000-0000-4000-8000-000000000001')
    where id = '40000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'antes de ocultar, a leitora ve a pergunta na lista da cidade'
);

-- ── 2. ela oculta uma delas ────────────────────────────────────────────────

select lives_ok(
  $$ insert into public.hidden_questions (user_id, request_id)
     values ('10000000-0000-4000-8000-000000000002',
             '40000000-0000-4000-8000-000000000001') $$,
  'a leitora oculta uma pergunta para si'
);

select is(
  (select count(*) from public.hidden_questions),
  1::bigint,
  'a linha oculta aparece para quem ocultou'
);

-- 3) par unico: repetir a ocultacao nao cria segunda linha
select throws_ok(
  $$ insert into public.hidden_questions (user_id, request_id)
     values ('10000000-0000-4000-8000-000000000002',
             '40000000-0000-4000-8000-000000000001') $$,
  '23505',
  null,
  'o par pessoa + pergunta e unico'
);

-- ── 4. isolamento: outra pessoa nao ve a ocultacao ─────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.hidden_questions),
  0::bigint,
  'outra pessoa nao le a ocultacao de alguem'
);

-- 5) e nao apaga o que nao e dela (a linha continua la depois da tentativa)
select lives_ok(
  $$ delete from public.hidden_questions
     where request_id = '40000000-0000-4000-8000-000000000001' $$,
  'a tentativa de apagar a ocultacao de outra pessoa nao falha nem apaga'
);

-- 6) ocultar nao e moderacao: is_deleted continua falso
select is(
  (select is_deleted from public.recommendation_requests
    where id = '40000000-0000-4000-8000-000000000001'),
  false,
  'ocultar nao muda is_deleted'
);

-- 7) e a lista de outra pessoa continua com a pergunta
select is(
  (select count(*) from public.recommendation_requests
    where id = '40000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a pergunta continua na lista de outra pessoa'
);

select is(
  (
    select count(*)
    from public.list_indications('00000000-0000-4000-8000-000000000001')
    where id = '40000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'a lista da Comunidade de outra pessoa nao perde a pergunta'
);

-- 8) ninguem cria ocultacao em nome de outra pessoa
select throws_ok(
  $$ insert into public.hidden_questions (user_id, request_id)
     values ('10000000-0000-4000-8000-000000000002',
             '40000000-0000-4000-8000-000000000003') $$,
  '42501',
  null,
  'nao se cria ocultacao para outra pessoa'
);

-- 9) nem oculta o que nao consegue ver
select throws_ok(
  $$ insert into public.hidden_questions (user_id, request_id)
     values ('10000000-0000-4000-8000-000000000001',
             '40000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'nao se oculta pergunta de cidade que nao se le'
);

-- ── 10. de volta a quem ocultou: o efeito e so dela ────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.hidden_questions),
  1::bigint,
  'a tentativa de outra pessoa nao apagou a ocultacao'
);

select is(
  (
    select count(*)
    from public.list_indications('00000000-0000-4000-8000-000000000001')
    where id = '40000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'a lista da Comunidade deixa de trazer o que o leitor ocultou'
);

-- 11) o link direto continua abrindo a pergunta
select is(
  (select count(*) from public.recommendation_requests
    where id = '40000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a leitura direta da pergunta ocultada continua'
);

-- ── 12. "Ocultados" ────────────────────────────────────────────────────────

select results_eq(
  $$ select title, hidden_at is not null from public.list_hidden_questions() $$,
  $$ values ('Algum dentista de confianca na zona leste?'::text, true) $$,
  'a tela Ocultados devolve a pergunta e a data da ocultacao'
);

-- ── 13. anonimo nao alcanca a tabela ───────────────────────────────────────

reset role;

select is(
  has_table_privilege('anon', 'public.hidden_questions', 'SELECT'),
  false,
  'anonimo nao le hidden_questions'
);

select is(
  has_table_privilege('authenticated', 'public.hidden_questions', 'UPDATE'),
  false,
  'nao existe update de ocultacao para o cliente'
);

select is(
  has_table_privilege('authenticated', 'public.hidden_questions', 'SELECT')
    and has_table_privilege('authenticated', 'public.hidden_questions', 'INSERT')
    and has_table_privilege('authenticated', 'public.hidden_questions', 'DELETE'),
  true,
  'o cliente le, cria e apaga ocultacoes (e so isso)'
);

-- ── 14. moderacao: o que sumiu para todos nao aparece em Ocultados ─────────

update public.recommendation_requests
   set is_deleted = true
 where id = '40000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.list_hidden_questions()),
  0::bigint,
  'pergunta removida pela moderacao nao aparece em Ocultados'
);

reset role;

update public.recommendation_requests
   set is_deleted = false
 where id = '40000000-0000-4000-8000-000000000001';

-- ── 15. cascade pela pergunta ──────────────────────────────────────────────

delete from public.recommendation_requests
 where id = '40000000-0000-4000-8000-000000000001';

select is(
  (select count(*) from public.hidden_questions
    where request_id = '40000000-0000-4000-8000-000000000001'),
  0::bigint,
  'apagar a pergunta apaga a ocultacao'
);

-- ── 16. cascade pela conta ─────────────────────────────────────────────────

insert into public.hidden_questions (user_id, request_id)
values ('10000000-0000-4000-8000-000000000004',
        '40000000-0000-4000-8000-000000000003');

select is(
  (select count(*) from public.hidden_questions
    where user_id = '10000000-0000-4000-8000-000000000004'),
  1::bigint,
  'a quarta pessoa tem uma ocultacao antes de sair'
);

delete from auth.users where id = '10000000-0000-4000-8000-000000000004';

select is(
  (select count(*) from public.hidden_questions
    where user_id = '10000000-0000-4000-8000-000000000004'),
  0::bigint,
  'apagar a conta apaga as ocultacoes dela'
);

-- ── 17. o caminho real da exclusao: a purga ────────────────────────────────
--
-- A conta nao e apagada de verdade: o GoTrue faz soft delete em auth.users. Se
-- a purga nao apagasse a linha de origem, o cascade nunca dispararia e a
-- ocultacao ficaria para sempre.

insert into public.hidden_questions (user_id, request_id)
values ('10000000-0000-4000-8000-000000000005',
        '40000000-0000-4000-8000-000000000003');

select is(
  (select count(*) from public.hidden_questions
    where user_id = '10000000-0000-4000-8000-000000000005'),
  1::bigint,
  'a quinta pessoa tem uma ocultacao antes da purga'
);

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000005',
  now() - interval '16 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000005'),
  'purged',
  'a purga da conta roda depois do vencimento'
);

select is(
  (select count(*) from public.hidden_questions
    where user_id = '10000000-0000-4000-8000-000000000005'),
  0::bigint,
  'a purga apaga as ocultacoes da pessoa'
);

select is(
  (select count(*) from public.hidden_questions),
  0::bigint,
  'nenhuma ocultacao de terceiro sobra'
);

select * from finish();

rollback;
