-- A heranca de posse da purga move os DOIS fatos de dono: a coluna
-- owner_user_id e a membership owner/approved que private.is_group_owner e as
-- telas leem. Antes (20260918214735) so a coluna mudava e o herdeiro ficava sem
-- poder nas RPCs; a operacao, quando herdava, nem membro era.

begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

\ir fixtures/foundation.inc

reset role;

-- Operador unico: 003. Vira o destino quando nao ha moderador.
insert into public.operators (auth_user_id)
  values ('10000000-0000-4000-8000-000000000003');

-- Comunidade A (dono 001, moderador 002). Comunidade B (dono 001, sem
-- moderador). Comunidade C (dono 004), onde 001 e so membro.
insert into public.communities (id, name, locality_id, created_by, owner_user_id)
values
  ('72000000-0000-4000-8000-0000000000a1', 'Comunidade A', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-0000000000b1', 'Comunidade B', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-0000000000c1', 'Comunidade C', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004');

insert into public.community_memberships (community_id, user_id, role, status)
values
  ('72000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('72000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000002', 'moderator', 'approved'),
  ('72000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('72000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-000000000004', 'owner', 'approved'),
  ('72000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-000000000001', 'member', 'approved');

-- Grupo G (avulso, dono 001, moderador 002). Grupo H (na comunidade C, dono
-- 001, sem moderador): a operacao herda e precisa entrar na comunidade.
-- Grupo K (avulso, dono 005, 001 membro): controle.
insert into public.groups (id, name, locality_id, created_by, owner_user_id, community_id)
values
  ('61000000-0000-4000-8000-0000000000a1', 'Grupo G', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null),
  ('61000000-0000-4000-8000-0000000000b1', 'Grupo H', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-0000000000c1'),
  ('61000000-0000-4000-8000-0000000000c1', 'Grupo K', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', null);

insert into public.group_memberships (group_id, user_id, role, status)
values
  ('61000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('61000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-000000000002', 'moderator', 'approved'),
  ('61000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('61000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-000000000005', 'owner', 'approved'),
  ('61000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-000000000001', 'member', 'approved');

select public.settle_account_possessions('10000000-0000-4000-8000-000000000001');

-- ── Comunidades
select is(
  (select role::text || '/' || status::text from public.community_memberships
    where community_id = '72000000-0000-4000-8000-0000000000a1'
      and user_id = '10000000-0000-4000-8000-000000000002'),
  'owner/approved',
  'moderador herdeiro da comunidade vira owner na membership'
);

select is(
  (select role::text from public.community_memberships
    where community_id = '72000000-0000-4000-8000-0000000000a1'
      and user_id = '10000000-0000-4000-8000-000000000001'),
  'member',
  'dono antigo da comunidade e rebaixado a member'
);

select is(
  (select owner_user_id from public.communities where id = '72000000-0000-4000-8000-0000000000b1'),
  '10000000-0000-4000-8000-000000000003',
  'comunidade sem moderador vai para a operacao (coluna)'
);

select is(
  (select role::text || '/' || status::text from public.community_memberships
    where community_id = '72000000-0000-4000-8000-0000000000b1'
      and user_id = '10000000-0000-4000-8000-000000000003'),
  'owner/approved',
  'operacao que nao era membro ganha a membership owner/approved'
);

select is(
  (select owner_user_id::text || ' ' || (
     select role::text from public.community_memberships
      where community_id = c.id and user_id = c.owner_user_id)
     from public.communities c where c.id = '72000000-0000-4000-8000-0000000000c1'),
  '10000000-0000-4000-8000-000000000004 owner',
  'comunidade de outra pessoa nao muda de dono'
);

-- ── Grupos
select is(
  (select role::text || '/' || status::text from public.group_memberships
    where group_id = '61000000-0000-4000-8000-0000000000a1'
      and user_id = '10000000-0000-4000-8000-000000000002'),
  'owner/approved',
  'moderador herdeiro do grupo vira owner na membership'
);

select is(
  (select role::text from public.group_memberships
    where group_id = '61000000-0000-4000-8000-0000000000a1'
      and user_id = '10000000-0000-4000-8000-000000000001'),
  'member',
  'dono antigo do grupo e rebaixado a member'
);

select is(
  (select owner_user_id from public.groups where id = '61000000-0000-4000-8000-0000000000b1'),
  '10000000-0000-4000-8000-000000000003',
  'grupo de comunidade sem moderador vai para a operacao (coluna)'
);

select is(
  (select role::text || '/' || status::text from public.group_memberships
    where group_id = '61000000-0000-4000-8000-0000000000b1'
      and user_id = '10000000-0000-4000-8000-000000000003'),
  'owner/approved',
  'operacao herda o grupo tambem na membership'
);

select is(
  (select role::text || '/' || status::text from public.community_memberships
    where community_id = '72000000-0000-4000-8000-0000000000c1'
      and user_id = '10000000-0000-4000-8000-000000000003'),
  'member/approved',
  'operacao entra como membro aprovado da comunidade do grupo herdado'
);

select is(
  (select role::text from public.group_memberships
    where group_id = '61000000-0000-4000-8000-0000000000c1'
      and user_id = '10000000-0000-4000-8000-000000000005'),
  'owner',
  'grupo de outra pessoa mantem o dono na membership'
);

-- ── As RPCs que leem a membership passam a reconhecer o herdeiro
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.delete_group('61000000-0000-4000-8000-0000000000a1') $$,
  'moderador herdeiro consegue excluir o grupo herdado'
);

select throws_ok(
  $$ select public.delete_group('61000000-0000-4000-8000-0000000000c1') $$,
  'only the group owner can delete the group',
  'herdeiro de um grupo nao ganha poder sobre grupo de outra pessoa'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ select public.delete_group('61000000-0000-4000-8000-0000000000b1') $$,
  'only the group owner can delete the group',
  'dono antigo perde o poder de dono no grupo'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select lives_ok(
  $$ select public.transfer_group_ownership(
       '61000000-0000-4000-8000-0000000000b1',
       '10000000-0000-4000-8000-000000000003') $$,
  'operacao herdeira passa na checagem de dono de transfer_group_ownership'
);

reset role;

-- ── Sem moderador e sem operacao (a unica foi revogada): nada muda.
update public.operators set revoked_at = now()
 where auth_user_id = '10000000-0000-4000-8000-000000000003';

select public.settle_account_possessions('10000000-0000-4000-8000-000000000005');

select is(
  (select owner_user_id from public.groups where id = '61000000-0000-4000-8000-0000000000c1'),
  '10000000-0000-4000-8000-000000000005',
  'sem herdeiro possivel, o grupo continua com o dono'
);

-- ── A operacao nunca herda de si mesma: operador purgado sem outro operador.
update public.operators set revoked_at = null
 where auth_user_id = '10000000-0000-4000-8000-000000000003';

select public.settle_account_possessions('10000000-0000-4000-8000-000000000003');

select is(
  (select c.owner_user_id::text || ' ' || m.role::text
     from public.communities c
     join public.community_memberships m
       on m.community_id = c.id and m.user_id = c.owner_user_id
    where c.id = '72000000-0000-4000-8000-0000000000b1'),
  '10000000-0000-4000-8000-000000000003 owner',
  'operador purgado sem outro operador nao herda de si mesmo nem se rebaixa'
);

select * from finish();
rollback;
