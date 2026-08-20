-- Community RPCs: provisioning, membership flow, moderation, group creation.
-- All mutation against communities/community_memberships goes through here so
-- the policies stay read-only. Failing this file before 022 lands is the
-- expected baseline.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.create_community(
       'Vila Pirata',
       'Tentativa de captura',
       '00000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000005'
     ) $$,
  '42501',
  null,
  'D3: authenticated nao cria comunidade'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.request_community_membership('70000000-0000-4000-8000-000000000001') $$,
  null,
  null,
  'nao-membro da localidade nao pede entrada'
);

-- approve_community_member/remove_community_member are service_role-only
-- (the app never calls them as authenticated — see 20260821000025); the
-- caller is now an explicit parameter the RPC itself re-validates.
reset role;
set local role service_role;

select throws_ok(
  $$ select public.approve_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000002'
     ) $$,
  null,
  null,
  'membro pending nao aprova a si mesmo'
);

select lives_ok(
  $$ select public.approve_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000001'
     ) $$,
  'dono aprova membro pending'
);

select results_eq(
  $$ select status::text from public.community_memberships
     where community_id = '70000000-0000-4000-8000-000000000001'
       and user_id = '10000000-0000-4000-8000-000000000002' $$,
  $$ values ('approved'::text) $$,
  'aprovacao muda o status'
);

-- 20260821000026: is_community_member was referenced by
-- community-invite-actions.ts since onda E Task 6 but never actually
-- created — the "Gerar link de convite" button silently never appeared
-- for anyone. Called as service_role, the way the app calls it.
select is(
  public.is_community_member(
    '70000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid
  ),
  true,
  'E6+: is_community_member is true for the community owner'
);

select is(
  public.is_community_member(
    '70000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid
  ),
  false,
  'E6-: is_community_member is false for someone who never requested entry'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.create_group_in_community(
       'Obras da vila',
       'Acompanhamento de obras',
       'public',
       '70000000-0000-4000-8000-000000000001'
     ) $$,
  'membro aprovado cria grupo interno'
);

reset role;
set local role service_role;

select throws_ok(
  $$ select public.remove_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001'
     ) $$,
  null,
  null,
  'caso 18: remover o dono da comunidade e bloqueado'
);

select * from finish();
rollback;
