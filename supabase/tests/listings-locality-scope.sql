-- SEC-006 H1, parte 2 - anuncio de cidade exige vinculo com a cidade (current ou leaving).
-- Fixtures: 001 tem vinculo so com a cidade 0001; a cidade 0002 existe, mas 001 nao tem vinculo com ela.

begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

\ir fixtures/foundation.inc

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, locality_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      'property', 'active', 'Publicado em cidade so consultada',
      '00000000-0000-4000-8000-000000000002'
    )
  $$,
  42501,
  null,
  'sem vinculo com a cidade, nao publica anuncio nela'
);

select lives_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, locality_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      'property', 'active', 'Publicado na propria cidade',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  'com vinculo com a cidade, publica normalmente'
);

select is(
  (select count(*)::integer from public.listings
    where owner_user_id = '10000000-0000-4000-8000-000000000001'
      and locality_id = '00000000-0000-4000-8000-000000000002'),
  0,
  'nenhum anuncio ficou na cidade sem vinculo'
);

select * from finish();
rollback;
