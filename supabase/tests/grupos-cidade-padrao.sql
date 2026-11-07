-- RUN-025 (b) — grupos da cidade automáticos (ADR-20261107 item 4).
--
-- O que este arquivo prova:
--   * ao concluir a entrada, o membro entra nos grupos ABERTOS, VIVOS e MARCADOS
--     COMO PADRÃO da sua cidade — e em mais nenhum: fechado marcado padrão nunca
--     entra, não-padrão não entra, padrão de outra cidade não entra, padrão
--     removido não entra;
--   * participação que já existe é preservada (on conflict do nothing — a
--     entrada automática não regrava nem promove quem já tem linha);
--   * a marca de padrão é escrita só pelo operador: nem por UPDATE nem por
--     INSERT direto do membro, e a RPC recusar fora de `operators` é testada;
--   * o operador marca, e a RPC não inventa grupo;
--   * grupo LEGADO de comunidade (community_id) fica fora do automático — e o
--     operador não consegue marcá-lo padrão (desmarcar continua livre).

begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

\ir fixtures/foundation.inc

-- Quinta pessoa sem vínculo + uma que já tem participação antes de provisionar.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000008', 'entra-grupos@example.invalid'),
  ('10000000-0000-4000-8000-000000000009', 'ja-participa@example.invalid');

-- Comunidade legada da cidade 1, para o grupo 017 abaixo (FK composta
-- groups (community_id, locality_id) exige a mesma cidade).
insert into public.communities (id, name, locality_id, created_by, owner_user_id)
values (
  '71000000-0000-4000-8000-000000000017', 'Comunidade legada', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'
);

-- Cenário de grupos (superusuário, antes das trocas de papel):
--   010  público, padrão, cidade 1              → entra
--   011  público, padrão, cidade 1              → entra
--   012  FECHADO, padrão, cidade 1              → nunca entra
--   013  público, não padrão, cidade 1          → não entra
--   014  público, padrão, OUTRA cidade          → não entra
--   015  público, padrão, cidade 1, REMOVIDO    → não entra
--   016  público, cidade 1, sem marca (default) → nasce não-padrao
--   017  público, padrão, cidade 1, LEGADO de comunidade (community_id) → não entra
insert into public.groups (
  id, name, visibility, locality_id, created_by, owner_user_id, is_default, is_deleted
)
values
  ('40000000-0000-4000-8000-000000000010', 'Padrao um', 'public', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', true, false),
  ('40000000-0000-4000-8000-000000000011', 'Padrao dois', 'public', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', true, false),
  ('40000000-0000-4000-8000-000000000012', 'Fechado padrao', 'private', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', true, false),
  ('40000000-0000-4000-8000-000000000013', 'Sem marca', 'public', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', false, false),
  ('40000000-0000-4000-8000-000000000014', 'Padrao de outra cidade', 'public', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', true, false),
  ('40000000-0000-4000-8000-000000000015', 'Padrao removido', 'public', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', true, true),
  ('40000000-0000-4000-8000-000000000016', 'Nasce sem marca', 'public', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', false, false);

-- 017 já nasce marcado padrão COM community_id (dado legado: só o fixture
-- escreve a marca assim — a RPC passou a recusar exatamente isso).
insert into public.groups (
  id, name, visibility, locality_id, created_by, owner_user_id, is_default, is_deleted, community_id
)
values (
  '40000000-0000-4000-8000-000000000017', 'Legado comunidade', 'public', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', true, false,
  '71000000-0000-4000-8000-000000000017'
);

-- Quem já tem participação ANTES da entrada: 009 é 'member' no grupo 010 sem
-- vínculo de cidade. O provisionamento não pode regravar nem duplicar a linha.
insert into public.group_memberships (group_id, user_id, role, status)
values (
  '40000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000009',
  'member',
  'approved'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 1. A marca e o padrão da coluna
-- ───────────────────────────────────────────────────────────────────────────

select has_column('public', 'groups', 'is_default', 'a marca de grupo padrão existe');

select is(
  (select is_default from public.groups where id = '40000000-0000-4000-8000-000000000016'),
  false,
  'grupo criado sem a marca nasce não-padrão'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. O provisionamento entra nos padrões abertos da cidade — e só neles
-- ───────────────────────────────────────────────────────────────────────────

set local role service_role;

select public.provision_member_entry(
  p_user_id := '10000000-0000-4000-8000-000000000008',
  p_locality_id := '00000000-0000-4000-8000-000000000001',
  p_display_name := 'Entrante com Grupos',
  p_consent_version := 2
);

select ok(
  exists (
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
      and group_id = '40000000-0000-4000-8000-000000000010'
      and role = 'member' and status = 'approved'
  ),
  'entra no grupo padrão aberto da cidade como membro aprovado'
);

select ok(
  exists (
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
      and group_id = '40000000-0000-4000-8000-000000000011'
  ),
  'entra em todos os padrões abertos da cidade, não só no primeiro'
);

select ok(
  not exists (
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
      and group_id = '40000000-0000-4000-8000-000000000012'
  ),
  'grupo FECHADO marcado padrão nunca entra no automático'
);

select ok(
  not exists (
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
      and group_id = '40000000-0000-4000-8000-000000000013'
  ),
  'grupo aberto sem a marca de padrão não entra (continua sugestão)'
);

select ok(
  not exists (
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
      and group_id = '40000000-0000-4000-8000-000000000014'
  ),
  'padrão de OUTRA cidade não entra'
);

select ok(
  not exists (
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
      and group_id = '40000000-0000-4000-8000-000000000015'
  ),
  'padrão REMOVIDO não entra'
);

select ok(
  not exists (
    select 1 from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
      and group_id = '40000000-0000-4000-8000-000000000017'
  ),
  'grupo LEGADO de comunidade marcado padrão não entra no automático (e o provisionamento não falha por causa dele)'
);

select is(
  (
    select count(*) from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000008'
  ),
  2::bigint,
  'a entrada automática não escreve participação além dos dois padrões'
);

-- Quem já tinha participação: a linha sobrevive como era.
select public.provision_member_entry(
  p_user_id := '10000000-0000-4000-8000-000000000009',
  p_locality_id := '00000000-0000-4000-8000-000000000001',
  p_display_name := 'Ja Participa',
  p_consent_version := 2
);

select is(
  (
    select role::text from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000009'
      and group_id = '40000000-0000-4000-8000-000000000010'
  ),
  'member',
  'participação que já existia não é regravada pelo automático'
);

select is(
  (
    select count(*) from public.group_memberships
    where user_id = '10000000-0000-4000-8000-000000000009'
  ),
  2::bigint,
  'com a linha existente preservada, entra só o padrão que faltava'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. A marca é só do operador: fechada para o membro nas duas portas
-- ───────────────────────────────────────────────────────────────────────────

select ok(
  not has_column_privilege('authenticated', 'public.groups', 'is_default', 'UPDATE'),
  'membro nem por update direto alcança a marca de padrão'
);

select ok(
  not has_column_privilege('authenticated', 'public.groups', 'is_default', 'INSERT'),
  'nem criando grupo o membro nasce com a marca'
);

select ok(
  has_column_privilege('authenticated', 'public.groups', 'name', 'UPDATE'),
  'as colunas que o dono escreve continuam granteadas'
);

-- A RPC: recusar quem não é operador, marcar quem é, não inventar grupo.
-- member-one (001) NÃO está em operators ainda.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.set_group_default(
      p_group_id := '40000000-0000-4000-8000-000000000013',
      p_is_default := true
    )
  $$,
  'P0001',
  'only an operator can mark the default group',
  'membro que não é operador não marca grupo padrão'
);

-- vira operador (service_role), e a marca passa a ser dele.
set local role service_role;
insert into public.operators (auth_user_id)
values ('10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.set_group_default(
      p_group_id := '40000000-0000-4000-8000-000000000013',
      p_is_default := true
    )
  $$,
  'operador marca pelo RPC'
);

select is(
  (select is_default from public.groups where id = '40000000-0000-4000-8000-000000000013'),
  true,
  'a marca ficou no banco'
);

select throws_ok(
  $$
    select public.set_group_default(
      p_group_id := '40000000-0000-4000-8000-000000000099',
      p_is_default := true
    )
  $$,
  'P0001',
  'group not found',
  'o operador não marca grupo que não existe'
);

-- Grupo legado de comunidade: marcar é recusado, desmarcar continua livre.
select throws_ok(
  $$
    select public.set_group_default(
      p_group_id := '40000000-0000-4000-8000-000000000017',
      p_is_default := true
    )
  $$,
  'P0001',
  'legacy community group cannot be marked as default',
  'operador não marca grupo legado de comunidade como padrão'
);

select lives_ok(
  $$
    select public.set_group_default(
      p_group_id := '40000000-0000-4000-8000-000000000017',
      p_is_default := false
    )
  $$,
  'operador consegue desmarcar a marca legado que já existe'
);

select is(
  (select is_default from public.groups where id = '40000000-0000-4000-8000-000000000017'),
  false,
  'a desmarcação do legado ficou no banco'
);

select * from finish();
rollback;
