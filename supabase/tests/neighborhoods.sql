-- DATA-001 / ADR-20261022, seção 1: catálogo de bairros e busca.
--
-- Prova, na camada onde a promessa pode falhar:
--   * a tabela tem a chave única por cidade, a zona e o ponto central;
--   * a carga traz os bairros das quatro cidades do protótipo;
--   * a busca acha sem acento, devolve no máximo 6, põe os que começam pelo
--     texto antes dos que apenas o contêm e ordena por nome;
--   * membro autenticado lê e NÃO escreve; anônimo não lê;
--   * nome repetido na mesma cidade é recusado.

begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

\ir fixtures/foundation.inc

-- ───────────────────────────────────────────────────────────────────────────
-- Estrutura
-- ───────────────────────────────────────────────────────────────────────────

select has_table('public', 'neighborhoods', 'existe o catálogo de bairros');

select has_column(
  'public', 'neighborhoods', 'name_key',
  'name_key existe: é a chave sem acento, única por cidade'
);

select col_is_unique(
  'public', 'neighborhoods', array['locality_id', 'name_key'],
  'o mesmo nome normalizado não entra duas vezes na mesma cidade'
);

select has_function(
  'public', 'search_neighborhoods', array['uuid', 'text'],
  'existe a busca por nome'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Carga das quatro cidades (prototypes/.../data/demo/bairros.js)
-- ───────────────────────────────────────────────────────────────────────────

select is(
  (select count(*)::integer from public.neighborhoods
    where locality_id = '00000000-0000-4000-8000-000000000001'),
  11,
  'Manaus tem os 11 bairros do protótipo'
);

select is(
  (select count(*)::integer from public.neighborhoods),
  43,
  'as quatro cidades carregam 43 bairros no total'
);

select is(
  (
    select count(distinct locality_id)::integer
    from public.neighborhoods
  ),
  4,
  'os bairros se distribuem pelas quatro cidades'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Leitura e busca, como membro autenticado
-- ───────────────────────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.neighborhoods),
  43,
  'membro autenticado lê o catálogo inteiro'
);

select results_eq(
  $$
    select name from public.search_neighborhoods(
      '00000000-0000-4000-8000-000000000001', 'adrianopolis'
    )
  $$,
  $$ values ('Adrianópolis'::text) $$,
  'busca sem acento acha AdriANÓpolis'
);

select results_eq(
  $$
    select name from public.search_neighborhoods(
      '00000000-0000-4000-8000-000000000001', ' PONTA   NEGRA '
    )
  $$,
  $$ values ('Ponta Negra'::text) $$,
  'busca ignora caixa, acento e espaço sobrando'
);

-- "a": começam com "a" (Adrianópolis, Aleixo) e depois os que contêm, em
-- ordem alfabética. O limite corta em 6 e é ele que separa as duas listas.
-- "Dom Pedro" e "Flores" não entram: não têm a letra "a".
select results_eq(
  $$
    select name from public.search_neighborhoods(
      '00000000-0000-4000-8000-000000000001', 'a'
    )
  $$,
  $$ values
    ('Adrianópolis'::text),
    ('Aleixo'::text),
    ('Cidade Nova'::text),
    ('Compensa'::text),
    ('Parque 10'::text),
    ('Planalto'::text)
  $$,
  'prefixo primeiro, ordem pelo nome e limite de 6'
);

select results_eq(
  $$
    select name, zone from public.search_neighborhoods(
      '00000000-0000-4000-8000-000000000001', 'centro'
    )
  $$,
  $$ values ('Centro'::text, 'Zona Sul'::text) $$,
  'a busca fica na cidade pedida: o Centro do Rio não aparece em Manaus'
);

select results_eq(
  $$
    select name from public.search_neighborhoods(
      '00000000-0000-4000-8000-000000000001', ''
    )
  $$,
  $$ values
    ('Adrianópolis'::text),
    ('Aleixo'::text),
    ('Centro'::text),
    ('Cidade Nova'::text),
    ('Compensa'::text),
    ('Dom Pedro'::text)
  $$,
  'texto vazio devolve os 6 primeiros da cidade, em ordem'
);

select is(
  (
    select count(*)::integer from public.search_neighborhoods(
      '00000000-0000-4000-8000-000000000001', null
    )
  ),
  6,
  'texto nulo se comporta como vazio'
);

select is_empty(
  $$
    select name from public.search_neighborhoods(
      '00000000-0000-4000-8000-000000000002', 'centro'
    )
  $$,
  'cidade sem catálogo devolve vazio, sem erro'
);

select throws_ok(
  $$
    insert into public.neighborhoods (locality_id, name, center_lat, center_lng)
    values ('00000000-0000-4000-8000-000000000001', 'Novo', -3, -60)
  $$,
  '42501', null,
  'cliente autenticado NÃO escreve o catálogo (insert)'
);

select throws_ok(
  $$
    update public.neighborhoods set name = 'Outro'
    where locality_id = '00000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'cliente autenticado NÃO escreve o catálogo (update)'
);

select throws_ok(
  $$
    delete from public.neighborhoods
    where locality_id = '00000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'cliente autenticado NÃO escreve o catálogo (delete)'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Anônimo
-- ───────────────────────────────────────────────────────────────────────────

reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from public.neighborhoods $$,
  '42501', null,
  'anônimo não lê o catálogo'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Unicidade por cidade (a operação, aqui representada por postgres, escreve)
-- ───────────────────────────────────────────────────────────────────────────

reset role;

select throws_ok(
  $$
    insert into public.neighborhoods (locality_id, name, center_lat, center_lng)
    values ('00000000-0000-4000-8000-000000000001', 'adrianopolis', -3, -60)
  $$,
  '23505', null,
  'nome repetido (sem acento) na mesma cidade é recusado'
);

select * from finish();
rollback;
