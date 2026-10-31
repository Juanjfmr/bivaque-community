-- Onda H Task 3 — resolver denuncia e um ato so: ocultar, registrar e avisar.
--
-- Antes desta task havia dois caminhos de resolucao com comportamentos
-- diferentes: a Server Action do painel (que e a que o operador usa) nunca
-- notificava o denunciante, e a rota de API notificava so no `resolve`. Na
-- pratica o retorno ao denunciante da D24 nao existia.
--
-- As assercoes abaixo travam as tres partes juntas. A que mais importa e a do
-- caminho `hide`: era exatamente ela que faltava.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc
\ir fixtures/reports.inc
\ir fixtures/recommendations.inc

-- Um operador. Nao ha fixture de operador no repositorio; member-one nao serve
-- porque e autor de metade do conteudo denunciavel das fixtures.
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-0000000000d1', 'operator@example.invalid');
insert into public.operators (auth_user_id)
values ('10000000-0000-4000-8000-0000000000d1');

-- Denuncias abertas: member-two denuncia o post e o pedido de member-one.
insert into public.reports (id, reporter_user_id, target_type, target_id, reason)
values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   'post', '60000000-0000-4000-8000-000000000001', 'post com conteudo abusivo'),
  ('a0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
   'recommendation_request', '40000000-0000-4000-8000-000000000001',
   'pedido de indicacao usado para vender');

-- ═══════════════════════════════════════════════════════════════════════════
-- hide: oculta o alvo, resolve, e avisa o denunciante
-- ═══════════════════════════════════════════════════════════════════════════

select lives_ok(
  $$ select public.resolve_report(
       'a0000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-0000000000d1',
       'hide', null) $$,
  'operador resolve a denuncia de post com hide'
);

select is(
  (select is_deleted from public.posts where id = '60000000-0000-4000-8000-000000000001'),
  true,
  'hide oculta o post'
);

select is(
  (select status::text from public.reports where id = 'a0000000-0000-4000-8000-000000000001'),
  'resolved',
  'hide resolve a denuncia'
);

-- A assercao que a divergencia entre os dois caminhos custava: no `hide`
-- ninguem era avisado.
select is(
  (select count(*)::int from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000002'
      and type = 'report_resolved'
      and target_id = 'a0000000-0000-4000-8000-000000000001'),
  1,
  'hide avisa o denunciante — era o caminho que nunca notificava'
);

-- O runbook §6 exige "sem revelar a acao tomada". A notificacao aponta para a
-- DENUNCIA, nunca para o conteudo denunciado.
select is(
  (select count(*)::int from public.notifications
    where type = 'report_resolved'
      and target_id = '60000000-0000-4000-8000-000000000001'),
  0,
  'a notificacao nao carrega o id do conteudo denunciado'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- alvo novo: pedido de indicacao
-- ═══════════════════════════════════════════════════════════════════════════

select lives_ok(
  $$ select public.resolve_report(
       'a0000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-0000000000d1',
       'hide', 'propaganda') $$,
  'operador oculta pedido de indicacao — alvo que nao sabia ser ocultado'
);

select is(
  (select is_deleted from public.recommendation_requests
    where id = '40000000-0000-4000-8000-000000000001'),
  true,
  'hide oculta o pedido de indicacao'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- negacoes
-- ═══════════════════════════════════════════════════════════════════════════

select throws_ok(
  $$ select public.resolve_report(
       'a0000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-0000000000d1',
       'hide', null) $$,
  'P0002',
  null,
  'resolver duas vezes a mesma denuncia levanta, e nao cria segunda notificacao'
);

select throws_ok(
  $$ select public.resolve_report(
       'a0000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000002',
       'dismiss', null) $$,
  '42501',
  null,
  'quem nao e operador nao resolve denuncia'
);

select * from finish();
rollback;
