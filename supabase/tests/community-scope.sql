-- Community entity: scope, ownership and accessor matrix for the entity
-- added in 019 (communities_foundation) and the scope surface added in
-- 020 (community_scope). The feeds (community_feeds) and RPCs
-- (community_rpcs) suites cover the rest. Failing this file before 020
-- lands is the expected baseline.

begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.communities where id = '70000000-0000-4000-8000-000000000001' $$,
  'membro da localidade descobre a comunidade (metadado publico)'
);

select isnt_empty(
  $$ select 1 from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000001' $$,
  'membro aprovado ve a lista completa de membros'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000004' $$,
  'membro pending nao ve a lista de membros'
);

select isnt_empty(
  $$ select 1 from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000002' $$,
  'membro pending ve a propria linha'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- DECISÃO DO DONO (15/09/2026): nome e estado da comunidade não são sigilosos.
-- A linha da comunidade passa a ser legível por qualquer pessoa autenticada — é
-- isso que permite a tela de acesso negado da prancha 60. O que continua
-- fechado é o CONTEÚDO: a asserção seguinte (membership) e as de grupos, feed e
-- pedido de entrada. O contrato completo mora em
-- supabase/tests/community-presentation-access.sql.
select isnt_empty(
  $$ select 1 from public.communities
     where id = '70000000-0000-4000-8000-000000000001' $$,
  'nao-membro da localidade le a APRESENTACAO da comunidade'
);

select is_empty(
  'select 1 from public.community_memberships',
  'nao-membro nao ve membership alguma'
);

-- ── Task 2 scope cases ──────────────────────────────────────────────────────
-- Posts, group-policy checks, hidden-profile cases and scope-invariant
-- exceptions. Order matters: cases 19 and 20 must run before the cascade
-- block because removing 004 from the community tears down the
-- co-membership that case 19 asserts.

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000001' $$,
  'caso 13: membro da vila le post do nivel da vila'
);

select isnt_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000003' $$,
  'caso 5b: membro do grupo privado interno le seu post'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000002' $$,
  'caso 5: membro da vila le post de grupo publico interno'
);

select is_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000003' $$,
  'caso 4: membro da vila nao le grupo privado interno onde nao esta'
);

select throws_ok(
  $$
    insert into public.group_memberships (group_id, user_id, role, status)
    values (
      '80000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000004',
      'member',
      'approved'
    )
  $$,
  null,
  null,
  'caso 7b: membro da vila nao entra sozinho em grupo privado interno'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000001' $$,
  'caso 3: membro pending nao le conteudo da vila'
);

select is_empty(
  $$ select 1 from public.posts where id = '90000000-0000-4000-8000-000000000002' $$,
  'casos 2 e 15: membro da localidade fora da vila A nao le grupo publico interno dela'
);

select throws_ok(
  $$
    insert into public.group_memberships (group_id, user_id, role, status)
    values (
      '80000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'member',
      'approved'
    )
  $$,
  null,
  null,
  'caso 7: entrar em grupo da vila sem membership aprovada na vila e negado'
);

-- Cases 19 and 20 — hidden profile via additive profiles policy.
-- MUST run before the cascade block below.

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$
    select 1 from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'caso 19: co-membro aprovado ve o perfil de outro membro da vila'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$
    select 1 from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'caso 20: membro da cidade ve o perfil agora visivel (sem estado oculto)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.posts where community_id is not null $$,
  'caso 1: nao-membro nao le post do nivel da vila'
);

set local role postgres;

select throws_ok(
  $$
    insert into public.posts (locality_id, user_id, community_id, group_id, post_type, content)
    values (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001',
      'text',
      'Escopo duplo'
    )
  $$,
  '23514',
  null,
  'caso 11: post com group_id e community_id e rejeitado pelo CHECK'
);

select throws_ok(
  $$
    insert into public.groups (name, visibility, locality_id, community_id, created_by, owner_user_id)
    values (
      'Grupo cruzado',
      'public',
      '00000000-0000-4000-8000-000000000002',
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23503',
  null,
  'caso 12: grupo de comunidade em outra localidade e rejeitado pela FK composta'
);

select throws_ok(
  $$
    update public.groups
    set community_id = '70000000-0000-4000-8000-000000000002'
    where id = '80000000-0000-4000-8000-000000000001'
  $$,
  null,
  null,
  'caso 17: mover grupo entre comunidades e bloqueado mesmo como postgres'
);

select lives_ok(
  $$
    delete from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'remocao de membro da comunidade executa'
);

select is_empty(
  $$
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000004'
      and group_id in ('80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002')
  $$,
  'caso 6: cascata remove das memberships dos grupos internos'
);

select results_eq(
  $$
    select owner_user_id from public.groups
    where id = '80000000-0000-4000-8000-000000000003'
  $$,
  $$ values ('10000000-0000-4000-8000-000000000001'::uuid) $$,
  'caso 16: grupo do removido transfere para o dono da comunidade, nao fica orfao'
);

select isnt_empty(
  $$
    select 1 from public.group_memberships
    where group_id = '80000000-0000-4000-8000-000000000003'
      and user_id = '10000000-0000-4000-8000-000000000001'
      and role = 'owner'
      and status = 'approved'
  $$,
  'caso 16b: o novo dono ganha membership de owner no grupo transferido'
);

select * from finish();
rollback;
