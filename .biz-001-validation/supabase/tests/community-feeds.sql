-- Community feeds: set-based feed RPCs.
-- feed_community aggregates vila, public-group and private-group posts in one
-- query; feed_group filters to a single group; feed_posts stays at the city
-- level (community_id excluded). Failing this file before 021 lands is the
-- expected baseline.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000001' $$,
  'caso 8: feed da cidade nao devolve post do nivel da vila'
);

select is_empty(
  $$ select id from public.feed_posts('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000002' $$,
  'caso 8b: feed da cidade nao devolve post de grupo interno'
);

select isnt_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000001' $$,
  'feed da comunidade devolve post do nivel da vila'
);

select isnt_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000002' $$,
  'D6: feed da comunidade agrega post de grupo publico interno'
);

select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000003' $$,
  'feed agregado exclui grupo privado onde o leitor nao esta'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001') $$,
  'caso 9: feed_community vazio para nao-membro'
);

select is_empty(
  $$ select id from public.feed_group('80000000-0000-4000-8000-000000000001') $$,
  'caso 10: feed_group vazio para nao-membro da vila'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001') $$,
  'caso 14: autenticado sem vinculo nao obtem nada de feed_community'
);

select * from finish();
rollback;
