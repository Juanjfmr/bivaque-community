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
select plan(21);

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

-- Manaus recebeu os bairros da malha do IBGE (RUN-028): o total já não é 11.
-- O que o protótipo garante é que os 11 nomes continuam lá, com a grafia dele.
select ok(
  (select count(*) from public.neighborhoods
    where locality_id = '00000000-0000-4000-8000-000000000001') >= 11,
  'Manaus tem ao menos os 11 bairros do protótipo'
);

select is(
  (select count(*)::integer from public.neighborhoods
    where locality_id = '00000000-0000-4000-8000-000000000001'
      and name in (
        'Ponta Negra', 'Tarumã', 'Compensa', 'Planalto', 'Dom Pedro', 'Flores',
        'Parque 10', 'Adrianópolis', 'Aleixo', 'Centro', 'Cidade Nova'
      )),
  11,
  'os 11 nomes do protótipo de Manaus existem com a grafia dele'
);

-- Desde a carga nacional do IBGE (RUN-028, neighborhoods-ibge-nacional.sql) o
-- total e a cobertura de cidades são maior: aqui vale o piso do protótipo.
select ok(
  (select count(*) from public.neighborhoods) >= 43,
  'as quatro cidades carregam ao menos os 43 bairros do protótipo'
);

select ok(
  (select count(distinct locality_id) from public.neighborhoods) >= 4,
  'os bairros se distribuem por ao menos as quatro cidades'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Leitura e busca, como membro autenticado
-- ───────────────────────────────────────────────────────────────────────────

-- Total visto como postgres, para o membro comparar depois: a promessa é que a
-- RLS deixa ler o catálogo INTEIRO, inclusive a carga nacional.
create temp table _leitura_total as
  select count(*)::integer as c from public.neighborhoods;
grant select on table _leitura_total to public;

-- Brasília (5300108) não tem linha na carga nacional: suas buscas esperam só a
-- lista do protótipo, que é estável. O id é resolvido aqui, como postgres, porque
-- não é UUID fixo e o membro pode não ler `localities` fora da sua cidade.
create temp table _cidade_brasilia as
  select id as c from public.localities where ibge_code = '5300108';
grant select on table _cidade_brasilia to public;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.neighborhoods),
  (select c from _leitura_total),
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

-- "no" em Brasília: Noroeste começa pelo texto; Asa Norte e Lago Norte só o
-- contêm. Em ordem puramente alfabética viriam Asa Norte, Lago Norte, Noroeste;
-- a regra de prefixo é o que põe Noroeste primeiro.
select results_eq(
  $$
    select name from public.search_neighborhoods(
      (select c from _cidade_brasilia), 'no'
    )
  $$,
  $$ values
    ('Noroeste'::text),
    ('Asa Norte'::text),
    ('Lago Norte'::text)
  $$,
  'prefixo primeiro, depois os que contêm o texto, cada grupo em ordem'
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

-- Texto vazio: Brasília tem 9 bairros e a busca devolve 6. Aqui o limite é o que
-- corta, e a ordem é a do nome sem acento.
select results_eq(
  $$
    select name from public.search_neighborhoods(
      (select c from _cidade_brasilia), ''
    )
  $$,
  $$ values
    ('Águas Claras'::text),
    ('Asa Norte'::text),
    ('Asa Sul'::text),
    ('Cruzeiro'::text),
    ('Guará'::text),
    ('Lago Norte'::text)
  $$,
  'texto vazio devolve os 6 primeiros da cidade, em ordem (de 9)'
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
