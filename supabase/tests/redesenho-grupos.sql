-- RED-003 — matriz de grupos (R2-matriz-grupos §2–§4).
--
-- Cada célula permitida e cada "não pode" desta parte tem aqui um teste
-- executável por objeto, ação, ator e estado (Aberto/Fechado/Encerrado).
-- Estados: 810…001 Aberto, 810…002 Fechado, 810…003 Encerrado.
-- Atores: 001 dono (dos três), 002 moderador do Fechado, 004 cidade sem vínculo,
-- 003 outra cidade, 005 sem cidade.

begin;

create extension if not exists pgtap with schema extensions;
select plan(42);

\ir fixtures/foundation.inc
\ir fixtures/redesenho.inc

-- ── Apresentação e regras: cidade lê Aberto e Fechado; Encerrado só participa ──
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::int from public.groups where id = '81000000-0000-4000-8000-000000000001'),
  1, 'grupos: cidade lê a apresentação do grupo Aberto');

select is(
  (select count(*)::int from public.groups where id = '81000000-0000-4000-8000-000000000002'),
  1, 'grupos: cidade lê a apresentação do grupo Fechado');

select is(
  (select count(*)::int from public.groups where id = '81000000-0000-4000-8000-000000000003'),
  0, 'grupos-: não participante não lê o grupo Encerrado');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*)::int from public.groups where id = '81000000-0000-4000-8000-000000000001'),
  0, 'grupos-: outra cidade não lê grupo de cidade alheia');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.groups where id = '81000000-0000-4000-8000-000000000003'),
  1, 'grupos+: participante lê o grupo Encerrado');

-- ── Roster: Aberto expõe à cidade; Fechado não ─────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select isnt(
  (select count(*)::int from public.group_memberships
    where group_id = '81000000-0000-4000-8000-000000000001'),
  0, 'grupos: cidade vê o roster do grupo Aberto');

select is(
  (select count(*)::int from public.group_memberships
    where group_id = '81000000-0000-4000-8000-000000000002'),
  0, 'grupos-: cidade não vê o roster do grupo Fechado');

-- ── Entrada: Aberto por RPC; escrito direto na tabela é recusado ───────────
select lives_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000001') $$,
  'grupos+: cidade entra no grupo Aberto pela RPC');

reset role;
select is(
  (select status from public.group_memberships
    where group_id = '81000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'),
  'approved', 'grupos: entrada Aberta concede status ativo');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ insert into public.group_memberships (group_id, user_id, role, status)
     values ('81000000-0000-4000-8000-000000000001',
             '10000000-0000-4000-8000-000000000004', 'member', 'approved') $$,
  42501, null, 'grupos-: escrita direta na participação é recusada');

select lives_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000002', 'Quero participar') $$,
  'grupos+: cidade pede entrada no grupo Fechado pela RPC');

reset role;
select is(
  (select status from public.group_memberships
    where group_id = '81000000-0000-4000-8000-000000000002'
      and user_id = '10000000-0000-4000-8000-000000000004'),
  'pending', 'grupos: pedido no Fechado cria estado pendente');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000003') $$,
  42501, null, 'grupos-: não se entra em grupo Encerrado');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select throws_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: quem não é da cidade não entra');

-- ── Motivo do pedido: privado do autor e de quem decide ────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::int from public.group_join_reasons
    where group_id = '81000000-0000-4000-8000-000000000002'
      and user_id = '10000000-0000-4000-8000-000000000004'),
  1, 'grupos+: autor lê o próprio motivo');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::int from public.group_join_reasons
    where group_id = '81000000-0000-4000-8000-000000000002'
      and user_id = '10000000-0000-4000-8000-000000000004'),
  1, 'grupos+: moderador lê o motivo de quem pediu');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*)::int from public.group_join_reasons
    where group_id = '81000000-0000-4000-8000-000000000001'),
  0, 'grupos-: motivo de terceiros não vaza para quem só entrou');

-- ── Teto de 3 pedidos por grupo a cada 30 dias ─────────────────────────────
select lives_ok(
  $$ select public.cancel_group_request('81000000-0000-4000-8000-000000000002') $$,
  'grupos+: pedido próprio pode ser cancelado (tentativa 1 consumida)');
select lives_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000002') $$,
  'grupos: novo pedido (tentativa 2)');
select lives_ok(
  $$ select public.cancel_group_request('81000000-0000-4000-8000-000000000002') $$,
  'grupos: cancelar (tentativa 2)');
select lives_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000002') $$,
  'grupos: novo pedido (tentativa 3)');
select lives_ok(
  $$ select public.cancel_group_request('81000000-0000-4000-8000-000000000002') $$,
  'grupos: cancelar (tentativa 3)');

select throws_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000002') $$,
  54000, null, 'grupos-: o quarto pedido em 30 dias é recusado');

-- ── Antipromoção: papel só por RPC do dono; ninguém se promove ─────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select public.add_group_moderator(
       '81000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: moderador não promove ninguém');

reset role;
select is(
  (select role from public.group_memberships
    where group_id = '81000000-0000-4000-8000-000000000002'
      and user_id = '10000000-0000-4000-8000-000000000002'),
  'moderator', 'grupos: moderador não se promoveu a dono');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ update public.group_memberships set role = 'owner'
     where group_id = '81000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000004' $$,
  42501, null, 'grupos-: ninguém muda o próprio papel por UPDATE');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.add_group_moderator(
       '81000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000004') $$,
  'grupos+: o dono promove um membro a moderador');

-- ── Dono só sai depois de transferir; e a saída passa por RPC ──────────────
select throws_ok(
  $$ select public.leave_group('81000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: o dono não sai sem transferir a propriedade');

select lives_ok(
  $$ select public.transfer_group_ownership(
       '81000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000004') $$,
  'grupos+: o dono transfere a propriedade');

select lives_ok(
  $$ select public.leave_group('81000000-0000-4000-8000-000000000001') $$,
  'grupos+: o antigo dono sai depois de transferir');

-- ── Encerrar: direto é barrado; por RPC limpa pedidos; reabrir volta ───────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ update public.groups set status = 'archived'
     where id = '81000000-0000-4000-8000-000000000002' $$,
  42501, null, 'grupos-: o estado do grupo não muda por UPDATE direto');

-- Devolve o pedido pendente de 004 ao Fechado para o encerramento limpar.
select lives_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000002') $$,
  'grupos: 004 volta a ter pedido pendente no Fechado');

select lives_ok(
  $$ select public.archive_group('81000000-0000-4000-8000-000000000002') $$,
  'grupos+: o dono encerra o grupo');

reset role;
select is(
  (select status from public.groups where id = '81000000-0000-4000-8000-000000000002'),
  'archived', 'grupos: encerrar grava o estado archived');

select is(
  (select count(*)::int from public.group_memberships
    where group_id = '81000000-0000-4000-8000-000000000002' and status = 'pending'),
  0, 'grupos: encerrar limpa os pedidos pendentes');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ select public.reopen_group('81000000-0000-4000-8000-000000000002') $$,
  'grupos+: o dono reabre o grupo');

-- ── notify_level é privado da própria pessoa ───────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ select notify_level from public.group_memberships
     where group_id = '81000000-0000-4000-8000-000000000001' limit 1 $$,
  42501, null, 'grupos-: notify_level de terceiros não é legível');

select isnt(
  public.my_group_notify_level('81000000-0000-4000-8000-000000000001'),
  null, 'grupos+: a própria preferência é lida pela RPC');

-- ── Conteúdo de Encerrado é só leitura de quem participava ─────────────────
reset role;
select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000003'),
  0, 'grupos-: não participante não lê conteúdo de Encerrado');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.posts where id = '91000000-0000-4000-8000-000000000003'),
  1, 'grupos+: participante anterior lê o conteúdo de Encerrado');

-- ── Conta suspensa ou em exclusão nunca ganha acesso ───────────────────────
reset role;
insert into public.profile_suspensions (user_id) values ('10000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ select public.create_group('Grupo Suspenso', 'open',
       '00000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: conta suspensa não cria grupo');

reset role;
insert into public.account_deletion_requests (user_id, due_at)
values ('10000000-0000-4000-8000-000000000004', now() + interval '30 days');
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  $$ select public.join_group('81000000-0000-4000-8000-000000000001') $$,
  42501, null, 'grupos-: conta em exclusão não entra em grupo');

select * from finish();
rollback;