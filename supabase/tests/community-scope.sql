-- Community entity: base membership and discoverability tests.
-- Covers the policies and helpers added in 019 (communities_foundation).
-- The remaining matrix cases (scope, posts, feeds, RPCs) live in their own
-- later files. Failing this file before 019 lands is the expected baseline.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

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

select is_empty(
  'select 1 from public.communities',
  'nao-membro da localidade nao descobre comunidade alguma'
);

select is_empty(
  'select 1 from public.community_memberships',
  'nao-membro nao ve membership alguma'
);

select * from finish();
rollback;
