-- Visibilidade por campo da Forca Armada e da OM autodeclaradas.
--
-- Duas revisoes mudaram este arquivo. A primeira (17/09/2026, critico adversarial
-- com veredito FAIL) mostrou que oito asserts provavam OCULTAR e nenhum provava
-- APAGAR, e que a tabela era listavel em lote: com SELECT para authenticated e
-- uma policy que so filtrava linha, UM request a /rest/v1/profile_affiliations
-- devolvia todas as declaracoes visiveis da cidade. Este arquivo agora prova as
-- duas coisas que o modelo afirma: nao se enumera em lote, e apagar apaga.
--
-- Onde o assert mora agora: a leitura de terceiro NAO passa mais pela tabela (a
-- policy e so do dono); passa por public.profile_affiliations_for(p_target_user_id).

begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

\ir fixtures/foundation.inc

-- member-one (001) e member-four (004) sao da mesma cidade de member-two (002).
-- other-locality (003) e de outra. 001 mostra a Forca Armada e guarda a OM.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values
       ('10000000-0000-4000-8000-000000000001', 'armed_force', 'exercito', true),
       ('10000000-0000-4000-8000-000000000001', 'om', 'CMA', false) $$,
  'membro declara Forca Armada visivel e OM oculta'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000004', 'armed_force', 'marinha', true) $$,
  'segundo membro da cidade tambem declara'
);

-- O dono le as duas proprias linhas, inclusive a oculta: o dado e dele.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::int from public.profile_affiliations
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  2,
  'o dono le os dois campos, inclusive o oculto'
);

-- T1 (achado A2): NAO-ENUMERACAO EM LOTE. Vizinho de cidade nao lista nada.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::int from public.profile_affiliations),
  0,
  'a tabela nao e listavel por terceiro: nenhuma linha alheia (era o vetor de enumeracao em lote)'
);

select is(
  (
    select count(distinct user_id)::int from public.profile_affiliations
    where user_id <> (select auth.uid())
  ),
  0,
  'uma unica query nao revela declaracoes de mais de um titular'
);

-- SEC-014 (A1 de 16/11): authenticated perdeu o execute desta RPC, e ela fica
-- sem porta ate o BLOCK-AFFILIATION decidir a exibicao. As assercoes de
-- CONTEUDO abaixo continuam vivas, rodando como o DONO da funcao (postgres):
-- o corpo e os vetos sao os mesmos, e para authenticated e anon o que mudou e
-- so a porta — provada como 42501 logo adiante.
reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- A leitura de terceiro acontece por alvo, e so devolve o visivel.
select is(
  (select count(*)::int from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')),
  1,
  'a RPC por alvo devolve so o campo marcado como visivel'
);

select is(
  (
    select value from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')
    where field = 'armed_force'
  ),
  'exercito',
  'vizinho de cidade le a Forca Armada marcada como visivel'
);

-- T2: oculto e indistinguivel de nunca declarado (sem oraculo).
select is(
  (
    select count(*)::int from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')
    where field = 'om'
  ),
  0,
  'o campo oculto nao volta pela RPC'
);

select is(
  (
    select count(*)::int from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')
    where field = 'turma'
  ),
  0,
  'campo nunca declarado responde igual ao oculto: nao ha oraculo'
);

-- Outra cidade nao le nem o campo visivel (conteudo: como dono da funcao).
reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::int from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')),
  0,
  'membro de outra cidade nao le nada, nem o campo visivel'
);

-- T3: anon nao le a tabela nem executa a RPC.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$ select count(*) from public.profile_affiliations $$,
  null, null,
  'anon nao le a tabela de afiliacao'
);

select throws_ok(
  $$ select * from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001') $$,
  '42501', null,
  'anon nao executa a leitura por alvo'
);

-- SEC-014 (prova positiva da revogacao): authenticated tambem recebe 42501.
-- Sem esta assercao, a revogacao ficaria provada so pelo teste da porta.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select * from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001') $$,
  '42501', null,
  'authenticated nao executa mais a leitura por alvo (SEC-014)'
);

-- T4 (achado A3): suspenso com token valido nao le.
reset role;
insert into public.profile_suspensions (user_id)
  values ('10000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::int from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')),
  0,
  'conta suspensa com token valido nao le a afiliacao de terceiro'
);

-- T5 (achado A4): titular com exclusao pendente nao e exposto.
reset role;
delete from public.profile_suspensions where user_id = '10000000-0000-4000-8000-000000000002';
insert into public.account_deletion_requests (user_id, due_at)
  values ('10000000-0000-4000-8000-000000000001', now() + interval '30 days');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::int from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')),
  0,
  'titular com exclusao pedida e ainda nao purgada nao e exposto'
);

-- T6 (D3): apagar remove de verdade — some para o terceiro E para o dono.
reset role;
delete from public.account_deletion_requests where user_id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

delete from public.profile_affiliations
 where user_id = '10000000-0000-4000-8000-000000000001';

select is(
  (
    select count(*)::int from public.profile_affiliations
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0,
  'apagar remove a linha: o proprio dono le 0, sem tombstone para religar'
);

reset role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::int from public.profile_affiliations_for('10000000-0000-4000-8000-000000000001')),
  0,
  'e o terceiro tambem le 0: o valor virou inalcancavel'
);

-- Ninguem declara pelo outro (de volta ao papel que avalia a policy).
set local role authenticated;

select throws_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000001', 'om', 'invadido', true) $$,
  null, null,
  'terceiro nao declara afiliacao no perfil alheio'
);

-- D2: a lista de campos e fechada no banco, nao so na tela.
select throws_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000002', 'patente', 'capitao', true) $$,
  null, null,
  'campo fora de armed_force/om e recusado pelo banco'
);

-- D2: a Forca Armada e selecao fechada tambem no banco.
select throws_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000002', 'armed_force', 'fuzileiros', true) $$,
  null, null,
  'Forca Armada fora do enum e recusada pelo banco'
);

-- A8: a OM nao aceita posto, patente nem endereco (D2 mantem isso fora).
select throws_ok(
  $$ insert into public.profile_affiliations (user_id, field, value, is_visible)
     values ('10000000-0000-4000-8000-000000000002', 'om', 'Capitao, Rua das Flores 120', true) $$,
  null, null,
  'OM com posto e endereco e recusada pelo banco'
);

select * from finish();
rollback;
