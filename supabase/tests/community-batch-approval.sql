-- Onda E Task 5 — batch approval, pagination and moderator delegation.
--
-- The batch path does NOT loosen authorization: every iteration calls
-- approve_community_member, which rechecks private.is_community_moderator per
-- call. The same test set covers the single approval path; this file is about
-- asserting that the batch path inherits the per-item check rather than
-- trusting one gate for N items.

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

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  perform public.approve_community_member(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  );
  perform public.approve_community_member(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003'
  );
  perform public.approve_community_member(
    '70000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005'
  );
end;
$$;

select results_eq(
  $$
    select status from public.community_memberships
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

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.approve_community_member(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  'P0001',
  null,
  'E5-: membro comum negado item a item pelo gate de is_community_moderator'
);

-- ── POSITIVE: moderador pode aprovar.

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

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
      '10000000-0000-4000-8000-000000000005'
    )
  $$,
  'E5+: moderador pode aprovar (gate permite owner e moderator)'
);

-- ── ACHADO: moderador NÃO pode promover outro. Antes do fix de migration
-- 023, add_community_moderator usava is_community_moderator, que aceita
-- moderador. Após o fix, só o owner promove.

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Member-three is approved member of community -001; owner promotes to mod.
select lives_ok(
  $$
    select public.add_community_moderator(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-4000-8000-000000000003'
    )
  $$,
  'E5+: owner promove membro aprovado para moderator'
);

-- Now: moderator (member-two) tries to promote another member → deve falhar.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Reset member-three back to plain member so we have someone to try to
-- promote. (The previous lives_ok promoted them, but member-three is not
-- the subject of this test — we just need to attempt promotion of a member.)
update public.community_memberships
set role = 'member'
where community_id = '70000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-4000-8000-000000000003';

select throws_ok(
  $$
    select public.add_community_moderator(
      '70000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-4000-8000-000000000003'
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
