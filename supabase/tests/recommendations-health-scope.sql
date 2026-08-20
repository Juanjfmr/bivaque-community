-- Onda F Task 7 — health requests must start inside a group.

begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

reset role;

-- A locality-only health request must be REJECTED.
select throws_ok(
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
  '23514',
  null,
  'F7-: health request without group_id is rejected by CHECK (23514)'
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
  'F7+: health request WITH group_id passes the CHECK'
);

-- A non-health category (servicos_locais) with locality_id but no group_id
-- PASSES — the new constraint is category-specific.
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
  'F7+: non-health locality request (without group) still passes'
);

select * from finish();
rollback;