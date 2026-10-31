-- Onda E Task 5 — batch approval, pagination and moderator delegation.
--
-- The batch path does NOT loosen authorization: every iteration calls
-- approve_community_member, which rechecks the caller's moderator status per
-- call. The same test set covers the single approval path; this file is about
-- asserting that the batch path inherits the per-item check rather than
-- trusting one gate for N items.
--
-- Rewritten (20260821000025): the RPCs used to read the caller's identity
-- from `(select auth.uid())` internally — correct only for `authenticated`
-- callers with their own JWT, which is not how the app calls them (it always
-- uses service_role, no JWT). Every one of these four RPCs silently denied
-- every caller as a result — none had ever worked. Fixed with an explicit
-- p_caller_user_id parameter; this file now calls them the way the app does,
-- as service_role, with the caller passed explicitly.

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Three extra pending members for the batch test. The fixture already has
-- member-two as pending; we add two more (members three and five).
insert into public.community_memberships (community_id, user_id, role, status)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'member', 'pending'),
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'member', 'pending');

-- Add a moderator role to member-two so we can exercise the moderator path.
update public.community_memberships
set role = 'moderator', status = 'approved'
where community_id = '70000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

-- ── POSITIVE: dono aprova três pendentes via approve_community_member, cada
-- chamada valida item a item. O batch é loop no servidor; cada iter herda a
-- checagem da RPC, não relaxa nada.

reset role;
set local role service_role;

do $$
begin
  perform public.approve_community_member(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001'
  );
  perform public.approve_community_member(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001'
  );
  perform public.approve_community_member(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001'
  );
end;
$$;

select results_eq(
  $$
    select status::text from public.community_memberships
    where community_id = '70000000-0000-4000-8000-000000000001'
    order by user_id
  $$,
  $$ values
      ('approved'::text),
      ('approved'::text),
      ('approved'::text),
      ('approved'::text),
      ('approved'::text)
  $$,
  'E5+: dono itera RPCs de aprovação e todos os pendentes ficam approved (sem afrouxar authz)'
);

-- ── NEGATIVE: membro comum chamando a mesma RPC em lote é negado item a item.
-- O RPC throws exception quando o chamador não é moderador; o batch é loop,
-- então a primeira chamada quebra a transação.

select throws_ok(
  $$
    select public.approve_community_member(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005',
      '10000000-0000-4000-8000-000000000003'
    )
  $$,
  'P0001',
  null,
  'E5-: membro comum negado item a item pelo gate de is_current_user_community_moderator'
);

-- ── POSITIVE: moderador pode aprovar.

-- Reset member-five to pending first (the throws_ok above left the test
-- transaction's prior state, but we re-set to be explicit).
update public.community_memberships
set status = 'pending'
where community_id = '70000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000005';

select lives_ok(
  $$
    select public.approve_community_member(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'E5+: moderador pode aprovar (gate permite owner e moderator)'
);

-- ── ACHADO: moderador NÃO pode promover outro. Antes do fix de migration
-- 023, add_community_moderator usava is_community_moderator, que aceita
-- moderador. Após o fix, só o owner promove.

-- Member-three is approved member of community -001; owner promotes to mod.
select lives_ok(
  $$
    select public.add_community_moderator(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'E5+: owner promove membro aprovado para moderator'
);

-- Now: moderator (member-two) tries to promote another member → deve falhar.

-- Reset member-three back to plain member so we have someone to try to
-- promote. (The previous lives_ok promoted them, but member-three is not
-- the subject of this test — we just need to attempt promotion of a member.)
update public.community_memberships
set role = 'member'
where community_id = '70000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000003';

select throws_ok(
  $$
    select public.add_community_moderator(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'P0001',
  null,
  'E5-: moderador nao promove outro (achado da E5, corrigido em migration 023)'
);

-- ── PAGINAÇÃO: a fila agora retorna mais do que o antigo limit(30) e conta
-- total. Não testamos aqui a UI; o escopo da migration é autorização.

select * from finish();
rollback;
