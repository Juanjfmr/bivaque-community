-- Onda F Task 7 criou a trava "saúde começa em grupo"; a migration
-- 20260926004501 (ADR-20260925-memoria-de-indicacoes) a retirou por decisão do
-- dono. O arquivo agora prova o contrário: saúde vai para a cidade ou para o
-- grupo, à escolha de quem pede.

begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

reset role;

-- A locality-only health request is now ACCEPTED.
select lives_ok(
  $$
    insert into public.recommendation_requests (
      author_id, locality_id, group_id, title, body, category
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      null,
      'Procuro plano de saúde para dependente',
      'Alguém indica um plano de saúde que atenda bem?',
      'saude_bem_estar'
    )
  $$,
  'health request for the whole city (no group) is accepted'
);

-- A health request with group_id PASSES.
select lives_ok(
  $$
    insert into public.recommendation_requests (
      author_id, locality_id, group_id, title, body, category
    ) values (
      '10000000-0000-4000-8000-000000000001',
      null,
      '40000000-0000-4000-8000-000000000001',
      'Procuro plano de saúde para dependente',
      'Alguém indica um plano de saúde que atenda bem?',
      'saude_bem_estar'
    )
  $$,
  'health request inside a group is still accepted'
);

-- A non-health category (servicos_locais) with locality_id but no group_id
-- PASSES.
select lives_ok(
  $$
    insert into public.recommendation_requests (
      author_id, locality_id, group_id, title, body, category
    ) values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      null,
      'Procuro eletricista',
      'Indicam eletricista na vila?',
      'servicos_locais'
    )
  $$,
  'non-health locality request (without group) still passes'
);

select * from finish();
rollback;