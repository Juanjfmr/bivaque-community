-- RUN-028 / DATA-IBGE-BAIRROS: carga nacional do catálogo a partir da malha
-- de bairros do IBGE (Censo 2022), gerada por scripts/data/ibge-bairros.
--
-- Prova, na camada onde a promessa pode falhar:
--   * a carga nacional chegou em volume plausível e em muitas cidades;
--   * bairros conhecidos de duas capitais têm centro dentro da caixa esperada;
--   * os 43 bairros do protótipo permanecem, inclusive com zona e centro
--     originais onde a malha nacional tem homônimo (do nothing, não sobrescreve);
--   * reaplicar a carga não duplica;
--   * município ausente de `localities` vira zero linhas, nunca erro.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc

-- ───────────────────────────────────────────────────────────────────────────
-- Volume nacional
-- ───────────────────────────────────────────────────────────────────────────

select ok(
  (select count(*) from public.neighborhoods) >= 15000,
  'a carga nacional traz ao menos 15 mil bairros (a malha tem 17,5 mil)'
);

select ok(
  (select count(distinct locality_id) from public.neighborhoods) >= 800,
  'a carga cobre ao menos 800 cidades (a malha cobre 895 municípios)'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Bairros conhecidos de duas capitais, centro dentro de uma caixa aproximada
-- ───────────────────────────────────────────────────────────────────────────

select ok(
  (
    select count(*) from public.neighborhoods n
    join public.localities l on l.id = n.locality_id
    where l.ibge_code = '3304557'
      and n.name = 'Guadalupe'
      and n.center_lat between -22.86 and -22.82
      and n.center_lng between -43.39 and -43.36
  ),
  'Guadalupe (Rio de Janeiro) existe com centro na caixa esperada'
);

select ok(
  (
    select count(*) from public.neighborhoods n
    join public.localities l on l.id = n.locality_id
    where l.ibge_code = '2304400'
      and n.name = 'Aldeota'
      and n.center_lat between -3.76 and -3.72
      and n.center_lng between -38.52 and -38.49
  ),
  'Aldeota (Fortaleza) existe com centro na caixa esperada'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Protótipo preservado (perfis podem apontar para essas linhas)
-- ───────────────────────────────────────────────────────────────────────────

select is(
  (
    select count(*)::integer
    from (values
      ('Manaus', 'AM', 'Ponta Negra'), ('Manaus', 'AM', 'Tarumã'),
      ('Manaus', 'AM', 'Compensa'), ('Manaus', 'AM', 'Planalto'),
      ('Manaus', 'AM', 'Dom Pedro'), ('Manaus', 'AM', 'Flores'),
      ('Manaus', 'AM', 'Parque 10'), ('Manaus', 'AM', 'Adrianópolis'),
      ('Manaus', 'AM', 'Aleixo'), ('Manaus', 'AM', 'Centro'),
      ('Manaus', 'AM', 'Cidade Nova'),
      ('Brasília', 'DF', 'Asa Sul'), ('Brasília', 'DF', 'Asa Norte'),
      ('Brasília', 'DF', 'Noroeste'), ('Brasília', 'DF', 'Sudoeste'),
      ('Brasília', 'DF', 'Cruzeiro'), ('Brasília', 'DF', 'Lago Sul'),
      ('Brasília', 'DF', 'Lago Norte'), ('Brasília', 'DF', 'Guará'),
      ('Brasília', 'DF', 'Águas Claras'),
      ('Natal', 'RN', 'Ponta Negra'), ('Natal', 'RN', 'Capim Macio'),
      ('Natal', 'RN', 'Lagoa Nova'), ('Natal', 'RN', 'Candelária'),
      ('Natal', 'RN', 'Neópolis'), ('Natal', 'RN', 'Tirol'),
      ('Natal', 'RN', 'Petrópolis'), ('Natal', 'RN', 'Lagoa Seca'),
      ('Natal', 'RN', 'Alecrim'), ('Natal', 'RN', 'Lagoa Azul'),
      ('Natal', 'RN', 'Potengi'),
      ('Rio de Janeiro', 'RJ', 'Copacabana'), ('Rio de Janeiro', 'RJ', 'Botafogo'),
      ('Rio de Janeiro', 'RJ', 'Flamengo'), ('Rio de Janeiro', 'RJ', 'Urca'),
      ('Rio de Janeiro', 'RJ', 'Centro'), ('Rio de Janeiro', 'RJ', 'Tijuca'),
      ('Rio de Janeiro', 'RJ', 'Méier'), ('Rio de Janeiro', 'RJ', 'Ilha do Governador'),
      ('Rio de Janeiro', 'RJ', 'Barra da Tijuca'), ('Rio de Janeiro', 'RJ', 'Jacarepaguá'),
      ('Rio de Janeiro', 'RJ', 'Campo Grande'), ('Rio de Janeiro', 'RJ', 'Vila Militar')
    ) as p (city_name, state_code, name)
    join public.localities l
      on l.city_name = p.city_name and l.state_code = p.state_code
    join public.neighborhoods n
      on n.locality_id = l.id and n.name = p.name
  ),
  43,
  'os 43 bairros do protótipo permanecem no catálogo'
);

-- Copacabana está na malha nacional do Rio: se a carga tivesse sobrescrito em
-- vez de pular por conflito, a zona sumiria e o centro mudaria ~2 casas.
select is(
  (
    select n.zone from public.neighborhoods n
    join public.localities l on l.id = n.locality_id
    where l.ibge_code = '3304557' and n.name = 'Copacabana'
  ),
  'Zona Sul'::text,
  'Copacabana mantém a zona do protótipo (a linha nacional pulou o conflito)'
);

select is(
  (
    select count(*)::integer from public.neighborhoods n
    join public.localities l on l.id = n.locality_id
    where l.ibge_code = '3304557'
      and n.name = 'Copacabana'
      and round(n.center_lat, 4) = -22.9710
      and round(n.center_lng, 4) = -43.1870
  ),
  1,
  'Copacabana mantém o centro do protótipo, não o da malha'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Reaplicar a carga não duplica
-- ───────────────────────────────────────────────────────────────────────────

create temp table _antes_da_reaplicacao as
  select count(*)::integer as c from public.neighborhoods;

\ir ../migrations/20261107140757_ibge_bairros_censo_2022.sql

select is(
  (select count(*)::integer from public.neighborhoods),
  (select c from _antes_da_reaplicacao),
  'reaplicar a carga não duplica bairro nenhum'
);

-- ───────────────────────────────────────────────────────────────────────────
-- Município ausente de localities vira zero linhas, nunca erro
-- ───────────────────────────────────────────────────────────────────────────

select lives_ok(
  $$
    insert into public.neighborhoods (locality_id, name, center_lat, center_lng)
    select l.id, c.name, c.center_lat, c.center_lng
    from (values
      ('9999996', 'Bairro de Município Ausente', -3.000000, -60.000000)
    ) as c (ibge_code, name, center_lat, center_lng)
    join public.localities l on l.ibge_code = c.ibge_code
    on conflict (locality_id, name_key) do nothing
  $$,
  'o mesmo insert com código IBGE inexistente roda sem erro'
);

select is(
  (select count(*)::integer from public.neighborhoods where name = 'Bairro de Município Ausente'),
  0,
  'e entra zero linha (join, não subconsulta escalar)'
);

select * from finish();
rollback;
