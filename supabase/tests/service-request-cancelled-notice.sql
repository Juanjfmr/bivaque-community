-- RECON-052-FOLLOWUP, decisao 3: o aviso neutro ao outro lado do pedido cancelado.
--
-- O lote AN entregou o cancelamento e deixou o aviso fora, porque ele exige tipo
-- proprio em notification_type, copy e deep-link. Este teste cobre o que o banco
-- promete: o aviso sai para a OUTRA PONTA, nao nomeia ator, e nao sai quando nao
-- ha pedido aberto para cancelar.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc

reset role;

-- Operador para o caminho de sucessao (nao usado aqui, mas a funcao o le).
insert into public.operators (auth_user_id)
  values ('10000000-0000-4000-8000-000000000003');

-- A vila saiu (ADR-20261024 §4): a conta de prestador pertence à CIDADE, não a
-- uma comunidade. ORDEM: a conta de prestador primeiro, e só então o perfil
-- (provider_profiles.owner_user_id é FK para provider_accounts.auth_user_id).
-- Inverter isso falha no FK.
--
-- A conta abaixo é fixture direta do superusuário, não o caminho de convite: o
-- `invited_by` só preenche o NOT NULL e não é medido aqui (o convite de operador
-- vive em provider-invitation.sql).
insert into public.provider_accounts (auth_user_id, invited_by, locality_id)
values ('10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001');
insert into public.provider_profiles (id, owner_user_id, display_name, category)
values ('30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'Prestador 005', 'assistencia_tecnica');

-- Pedido A: o 001 e o PEDINTE (a outra ponta e o 005).
-- Pedido B: o 001 e o PRESTADOR (a outra ponta e o 004).
-- Pedido C: sem o 001 — nao pode gerar aviso.
insert into public.service_requests
  (id, requester_user_id, provider_id, provider_user_id, category, description, status)
values
  ('40000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'assistencia_tecnica', 'pedido A', 'open'),
  ('40000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000001', 'assistencia_tecnica', 'pedido B', 'in_conversation'),
  ('40000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'assistencia_tecnica', 'pedido C', 'open');

-- Um pedido JA cancelado antes da purga: nao conta como cancelamento novo.
insert into public.service_requests
  (id, requester_user_id, provider_id, provider_user_id, category, description, status)
values
  ('40000000-0000-4000-8000-0000000000d1', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'assistencia_tecnica', 'pedido D ja cancelado', 'cancelled');

-- A acao sob teste e `settle_account_possessions`, operacao do SERVIDOR: o
-- EXECUTE e so de `service_role` (grant da migration), entao os papeis de
-- aplicacao sao negados abaixo (fronteira medida antes da purga) e o efeito e
-- medido pelo canal privilegiado. O parametro e a CONTA-ALVO (quem esta saindo),
-- nao o ator autenticado: a autorizacao vem do canal, nao do UUID. As leituras
-- seguintes sao observacao de estado, nao prova de RLS.

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.settle_account_possessions('10000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'authenticated nao executa a purga (canal do servidor)'
);

select set_config('request.jwt.claim.sub', '', true);
reset role;
set local role anon;
select throws_ok(
  $$ select public.settle_account_possessions('10000000-0000-4000-8000-000000000001') $$,
  '42501',
  null,
  'anon nao executa a purga (canal do servidor)'
);

reset role;
select is(
  (select count(*)::int from public.service_requests
    where status in ('open', 'in_conversation')),
  3,
  'as tentativas negadas nao cancelaram pedido algum'
);

set local role service_role;
select public.settle_account_possessions('10000000-0000-4000-8000-000000000001');
reset role;

-- 1. Pedido A cancelou e o aviso foi para o 005 (a outra ponta).
select is(
  (select status::text from public.service_requests where id = '40000000-0000-4000-8000-0000000000a1'),
  'cancelled',
  'pedido com a conta purgada como pedinte cancela'
);

select is(
  (select recipient_user_id::text from public.notifications where target_id = '40000000-0000-4000-8000-0000000000a1'),
  '10000000-0000-4000-8000-000000000005',
  'o aviso vai para a outra ponta, nao para quem saiu'
);

-- 2. Pedido B: o 001 era o prestador; o aviso vai para o 004 (pedinte).
select is(
  (select recipient_user_id::text from public.notifications where target_id = '40000000-0000-4000-8000-0000000000b1'),
  '10000000-0000-4000-8000-000000000004',
  'o CASE cobre o purgado como prestador'
);

-- 3. O aviso nao nomeia ator: actor_user_id nulo nos dois.
select is(
  (select count(*)::int from public.notifications where type = 'service_request' and actor_user_id is null),
  2,
  'nenhum aviso nomeia quem saiu (o motivo da saida e dado pessoal)'
);

-- 4. O tipo e proprio, e o alvo e o pedido — o deep-link do app depende disso.
select is(
  (select count(*)::int from public.notifications where type = 'service_request' and target_type = 'service_request'),
  2,
  'o tipo e proprio (nao empresta direct_message) e o alvo e o pedido'
);

-- 5. Pedido C nao envolve a conta purgada: nem cancela, nem avisa.
select is(
  (select status::text from public.service_requests where id = '40000000-0000-4000-8000-0000000000c1'),
  'open',
  'pedido sem a conta purgada nao cancela'
);

select is(
  (select count(*)::int from public.notifications where target_id = '40000000-0000-4000-8000-0000000000c1'),
  0,
  'e nao gera aviso'
);

-- 6. Pedido ja cancelado nao ganha aviso novo.
select is(
  (select count(*)::int from public.notifications where target_id = '40000000-0000-4000-8000-0000000000d1'),
  0,
  'pedido ja cancelado nao gera aviso'
);

select * from finish();
rollback;
