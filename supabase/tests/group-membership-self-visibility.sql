-- Self-visibility da linha de group_memberships (20260825143505).
--
-- A policy antiga só expunha linhas de grupo privado a membros APROVADOS
-- (`private.is_group_member` filtra status='approved'). O pedido pendente do
-- próprio solicitante era invisível para ele: a UI mostrava "Pedir entrada"
-- de novo em vez de "Cancelar pedido" (F8), e o ciclo do pedido nunca fechava
-- para quem aguardava aprovação em grupo privado.
--
-- Contrato pós-fix:
--   * cada um vê a PRÓPRIA linha, em qualquer status, público ou privado;
--   * entre membros, nada muda: quem vê o grupo público e tem linha nele
--     continua vendo; grupo privado só a aprovados;
--   * pendente NUNCA vê linha alheia nem as linhas de outro privado.
--
-- NOTA DE EXECUÇÃO: toda fixture nasce AQUI NO TOPO, como postgres. Depois do
-- primeiro `set local role authenticated`, nenhum insert de fixture pode
-- acontecer — a RLS de `groups` nega e aborta a transação inteira. A subquery
-- da policy herda a RLS de `groups`, então os chamadores das asserções de
-- "semântica preservada" precisam ser de quem vê o grupo (mesma vila).

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

\ir fixtures/foundation.inc

-- Grupo privado da vila 1, dono é member-one (001).
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id, created_at
) values (
  'b0000000-0000-4000-8000-000000000001',
  'Grupo Fechado Fixture',
  'Grupo privado da suíte de self-visibility.',
  'private',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  now() - interval '10 days'
);

-- Grupo público da mesma vila, para documentar a semântica que NÃO muda.
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id, created_at
) values (
  'b0000000-0000-4000-8000-000000000002',
  'Grupo Aberto Fixture',
  'Grupo público da suíte de self-visibility.',
  'public',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  now() - interval '10 days'
);

-- Segundo grupo privado, onde ninguém além do dono tem linha.
insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id, created_at
) values (
  'b0000000-0000-4000-8000-000000000003',
  'Outro Fechado Fixture',
  'Segundo grupo privado da suíte.',
  'private',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  now() - interval '5 days'
);

insert into public.group_memberships (group_id, user_id, role, status, joined_at) values
  (
    'b0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'owner',
    'approved',
    now() - interval '10 days'
  ),
  (
    'b0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'member',
    'pending',
    now() - interval '1 day'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'owner',
    'approved',
    now() - interval '10 days'
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'owner',
    'approved',
    now() - interval '5 days'
  );

-- ── POSITIVO: o pendente vê a PRÓPRIA linha em grupo privado ────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$
    select 1
    from public.group_memberships
    where group_id = 'b0000000-0000-4000-8000-000000000001'
      and user_id = '10000000-0000-4000-8000-000000000002'
      and status = 'pending'
  $$,
  'pendente ve a propria linha em grupo privado'
);

-- ... e vê SÓ a própria linha: a aprovada do dono continua invisível para ele.
select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where group_id = 'b0000000-0000-4000-8000-000000000001'
  $$,
  array[1::bigint],
  'pendente nao ve linha alheia do grupo privado'
);

-- ── NEGATIVO: pendente num privado não ganha visibilidade em OUTRO privado ──
select is_empty(
  $$
    select 1
    from public.group_memberships
    where group_id = 'b0000000-0000-4000-8000-000000000003'
  $$,
  'ser pendente num grupo nao da visibilidade nas linhas de outro privado'
);

-- ── NEGATIVO: o de fora não vê linha nenhuma do privado ─────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1
    from public.group_memberships
    where group_id = 'b0000000-0000-4000-8000-000000000001'
  $$,
  'fora do grupo privado nao ve linha nenhuma, pendente inclusive'
);

-- ── SEMÂNTICA PRESERVADA: linha de grupo público segue visível ──────────────
-- O chamador (004) é da mesma vila e vê o grupo; a policy antiga já expunha
-- as linhas de grupo público a ele e o fix não muda isso.
select isnt_empty(
  $$
    select 1
    from public.group_memberships
    where group_id = 'b0000000-0000-4000-8000-000000000002'
  $$,
  'linha de grupo publico segue visivel a quem ve o grupo'
);

-- ── POSITIVO: o aprovado continua vendo todas as linhas do seu grupo ────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select count(*)
    from public.group_memberships
    where group_id = 'b0000000-0000-4000-8000-000000000001'
  $$,
  array[2::bigint],
  'aprovado ve todas as linhas do proprio grupo privado'
);

-- ── GUARDA: a policy existe com o nome canônico ─────────────────────────────
set local role postgres;
select results_eq(
  $$
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_memberships'
      and policyname = 'group_memberships_select'
  $$,
  array[1::bigint],
  'policy group_memberships_select existe apos o re-create'
);

select * from finish();
rollback;
