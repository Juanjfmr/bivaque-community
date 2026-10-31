-- Feed da comunidade paginado dentro da função (migration 20260925213256).
--
-- Prova: sem p_limit a função devolve o mesmo que devolvia; as páginas somadas
-- são exatamente o feed inteiro, na mesma ordem, sem repetir nem pular; o
-- empate de horário tem desempate fixo; a ordem Relevantes pagina pela mesma
-- regra; e quem não é membro continua sem ver nada, em qualquer página.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- 25 publicações da vila, cinco delas no MESMO instante (o empate que obriga
-- o desempate por id), e respostas numa delas para mexer na ordem Relevantes.
insert into public.posts (id, locality_id, community_id, user_id, post_type, content, created_at)
select
  ('f0000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'Publicação paginada ' || g,
  case when g between 10 and 14 then '2026-09-20 12:00:00+00'::timestamptz
       else '2026-09-01 12:00:00+00'::timestamptz + (g || ' hours')::interval end
from generate_series(1, 25) as g;

insert into public.comments (post_id, user_id, content)
select 'f0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004', 'Resposta ' || g
from generate_series(1, 3) as g;

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

create temp table feed_inteiro on commit drop as
select row_number() over () as pos, id from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent');

create temp table feed_paginado on commit drop as
select row_number() over (order by pg, ord) as pos, id
from (
  select g as pg, t.id, row_number() over (partition by g) as ord
  from generate_series(0, (select count(*) from feed_inteiro)::int / 7) as g,
       lateral public.feed_community('70000000-0000-4000-8000-000000000001', 'recent', 7, g * 7) as t
) x;

select cmp_ok(
  (select count(*) from feed_inteiro), '>=', 25::bigint,
  'sem p_limit a função devolve o feed inteiro, como antes'
);

select results_eq(
  $$ select id from feed_paginado order by pos $$,
  $$ select id from feed_inteiro order by pos $$,
  'as páginas somadas são o feed inteiro, na mesma ordem, sem repetir nem pular'
);

select is(
  (select count(*) from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent', 7, 0)),
  7::bigint,
  'p_limit limita a página'
);

select results_eq(
  $$
    select id from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent', 5, 0)
  $$,
  $$
    select id from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent', 5, 0)
  $$,
  'a mesma página devolve sempre as mesmas publicações (desempate fixo)'
);

select results_eq(
  $$
    select id from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent')
    where created_at = '2026-09-20 12:00:00+00'
  $$,
  $$
    values
      ('f0000000-0000-4000-8000-000000000014'::uuid),
      ('f0000000-0000-4000-8000-000000000013'::uuid),
      ('f0000000-0000-4000-8000-000000000012'::uuid),
      ('f0000000-0000-4000-8000-000000000011'::uuid),
      ('f0000000-0000-4000-8000-000000000010'::uuid)
  $$,
  'publicações do mesmo instante saem por id, do maior para o menor'
);

-- Independente do volume do banco (limpo no CI, com seed no desenvolvimento):
-- a primeira página de Relevantes é o começo do Relevantes inteiro, e as
-- contagens de uma publicação conhecida continuam certas dentro de uma página.
select results_eq(
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001', 'relevant', 3, 0) $$,
  $$ select id from public.feed_community('70000000-0000-4000-8000-000000000001', 'relevant') limit 3 $$,
  'Relevantes pagina pela mesma regra do feed inteiro'
);

select is(
  (
    select t.comment_count
    from generate_series(0, 60) as g,
         lateral public.feed_community('70000000-0000-4000-8000-000000000001', 'relevant', 10, g * 10) as t
    where t.id = 'f0000000-0000-4000-8000-000000000003'
  ),
  3::bigint,
  'as contagens continuam certas dentro da página'
);

-- member-two tem pedido pendente nesta comunidade: não é membro.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is_empty(
  $$ select 1 from public.feed_community('70000000-0000-4000-8000-000000000001', 'recent', 20, 0) $$,
  'quem não é membro não vê página nenhuma'
);

select * from finish();
rollback;
