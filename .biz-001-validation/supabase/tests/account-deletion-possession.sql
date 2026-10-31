-- RECON-052-FOLLOWUP: as tres regras de posse que a purga passou a aplicar.
--
-- Decisoes do responsavel (18/09/2026):
--   1. comunidade/grupo de conta purgada vai para um moderador aprovado;
--      sem moderador, para a operacao;
--   2. vitrine e anuncios da conta purgada encerram;
--   3. pedidos de servico abertos com a conta entre as partes cancelam.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

\ir fixtures/foundation.inc

-- ── Setup (superusuario): operador, posse, anuncios, vitrine e pedidos.
reset role;

-- Operador: 003 e o unico. Vira o destino quando nao ha moderador.
insert into public.operators (auth_user_id)
  values ('10000000-0000-4000-8000-000000000003');

-- Comunidade A (owner 001) com moderador 002 aprovado. Comunidade B (owner
-- 001) SEM moderador. Comunidade C (owner 004): controle, nao entra na purga.
insert into public.communities (id, name, locality_id, created_by, owner_user_id)
values
  ('71000000-0000-4000-8000-0000000000a1', 'Comunidade A', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-0000000000b1', 'Comunidade B', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-0000000000c1', 'Comunidade C', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004');

insert into public.community_memberships (community_id, user_id, role, status)
values
  ('71000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000002', 'moderator', 'approved'),
  ('71000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001', 'owner', 'approved');

-- Grupo G (owner 001) com moderador 002 aprovado.
insert into public.groups (id, name, locality_id, created_by, owner_user_id)
values
  ('60000000-0000-4000-8000-0000000000a1', 'Grupo G', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');
insert into public.group_memberships (group_id, user_id, role, status)
values
  ('60000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000002', 'moderator', 'approved'),
  ('60000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001', 'owner', 'approved');

-- Listings: um do 001 (active) e um do 005 (controle).
-- kind = 'item' exige category, description, price_cents, neighborhood e condition.
insert into public.listings (id, owner_user_id, kind, status, title, description, category, price_cents, neighborhood, condition, locality_id)
values
  ('b1000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001', 'item', 'active', 'Anuncio do 001', 'desc 001', 'casa_moveis', 100, 'Centro', 'used', '00000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'item', 'active', 'Anuncio do 005', 'desc 005', 'casa_moveis', 200, 'Centro', 'used', '00000000-0000-4000-8000-000000000001');

-- Provider profiles + contas: um do 001 e um do 005.
insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values
  ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '71000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001');
insert into public.provider_profiles (id, owner_user_id, display_name, category)
values
  ('30000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001', 'Prestador 001', 'assistencia_tecnica'),
  ('30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'Prestador 005', 'alimentacao');


-- Pedidos de servico: um com o 001 como pedinte, um de controle com o 005.
insert into public.service_requests
  (requester_user_id, provider_id, provider_user_id, category, description)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'assistencia_tecnica', 'pedido do 001'),
  ('10000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000005', 'assistencia_tecnica', 'pedido de controle');

-- ── Executa a regra para o 001 e verifica cada pendenccia.
select public.settle_account_possessions('10000000-0000-4000-8000-000000000001');

-- 1. Posse de comunidade: A vai para o moderador 002; B (sem moderador) vai
--    para a operacao (003); C (de outro dono) nao muda.
select is(
  (select owner_user_id from public.communities where id = '71000000-0000-4000-8000-0000000000a1'),
  '10000000-0000-4000-8000-000000000002',
  'comunidade com moderador vai para o moderador'
);

select is(
  (select owner_user_id from public.communities where id = '71000000-0000-4000-8000-0000000000b1'),
  '10000000-0000-4000-8000-000000000003',
  'comunidade sem moderador vai para a operacao'
);

select is(
  (select owner_user_id from public.communities where id = '71000000-0000-4000-8000-0000000000c1'),
  '10000000-0000-4000-8000-000000000004',
  'comunidade de outra pessoa nao muda'
);

-- 2. Grupo: vai para o moderador 002. (Sem moderador -> operacao, mesmo
--    caminho da comunidade, coberto pelo caso B acima.)
select is(
  (select owner_user_id from public.groups where id = '60000000-0000-4000-8000-0000000000a1'),
  '10000000-0000-4000-8000-000000000002',
  'grupo com moderador vai para o moderador'
);

-- 3. Anuncios: do 001 fecham; do 005 continuam ativos.
select is(
  (select status from public.listings where id = 'b1000000-0000-4000-8000-0000000000a1'),
  'closed',
  'anuncio da conta purgada fecha'
);

select is(
  (select status from public.listings where id = 'b1000000-0000-4000-8000-0000000000b1'),
  'active',
  'anuncio de outra pessoa continua ativo'
);

-- 4. Vitrine: provider_accounts do 001 revogado; do 005 nao.
select is(
  (select (revoked_at is not null)::text from public.provider_accounts where auth_user_id = '10000000-0000-4000-8000-000000000001'),
  'true',
  'vitrine do prestador purgado e revogada'
);

select is(
  (select (revoked_at is not null)::text from public.provider_accounts where auth_user_id = '10000000-0000-4000-8000-000000000005'),
  'false',
  'vitrine de outro prestador permanece'
);

-- 5. Pedidos: o com o 001 na ponta cancela; o de controle permanece.
select is(
  (select status from public.service_requests where description = 'pedido do 001'),
  'cancelled',
  'pedido da conta purgada cancela'
);

select is(
  (select status from public.service_requests where description = 'pedido de controle'),
  'open',
  'pedido sem a conta purgada permanece aberto'
);

-- ── Caminho limpo: chamar para um usuario sem nada nao da erro.
select lives_ok(
  $$ select public.settle_account_possessions('10000000-0000-4000-8000-000000000004') $$,
  'chamar a regra para conta sem posse nao falha'
);

select * from finish();
rollback;