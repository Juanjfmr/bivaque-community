-- Community RPCs: provisioning, membership flow, moderation, group creation.
-- All mutation against communities/community_memberships goes through here so
-- the policies stay read-only. Failing this file before 022 lands is the
-- expected baseline.

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

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

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.approve_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002'
     ) $$,
  null,
  null,
  'membro pending nao aprova a si mesmo'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.approve_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002'
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

select lives_ok(
  $$ select public.create_group_in_community(
       'Obras da vila',
       'Acompanhamento de obras',
       'public',
       '70000000-0000-4000-8000-000000000001'
     ) $$,
  'membro aprovado cria grupo interno'
);

select throws_ok(
  $$ select public.remove_community_member(
       '70000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001'
     ) $$,
  null,
  null,
  'caso 18: remover o dono da comunidade e bloqueado'
);

select * from finish();
rollback;
