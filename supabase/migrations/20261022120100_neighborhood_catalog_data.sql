-- DATA-001 / ADR-20261022-fundacao-dados-bairros-ocultar-chamados, seção 1.
--
-- Carga inicial do catálogo: os bairros que o protótipo já tem
-- (prototypes/bivaque-html/src/data/demo/bairros.js, rodada 66), com os mesmos
-- nomes, zonas e pontos centrais. O protótipo guarda o ponto como
-- [longitude, latitude]; aqui as colunas são separadas e nomeadas.
--
-- IDEMPOTENTE: `on conflict (locality_id, name_key) do nothing`. Rodar de novo
-- (ou depois de a moderação juntar uma variação de nome) não duplica nem
-- sobrescreve o que a operação já corrigiu.
--
-- A cidade é encontrada pelo nome + UF no catálogo IBGE (`localities`), nunca
-- por UUID fixo: Manaus tem UUID durável, as outras três não. `join` (e não
-- subconsulta escalar) é o que faz uma cidade ausente do `localities` virar
-- zero linhas em vez de erro — a migration não pode falhar num banco limpo em
-- que o catálogo IBGE esteja reduzido.

insert into public.neighborhoods (locality_id, name, zone, center_lat, center_lng)
select l.id, c.name, c.zone, c.center_lat, c.center_lng
from (values
  -- Manaus / AM
  ('Manaus', 'AM', 'Ponta Negra', 'Zona Oeste', -3.0509, -60.0962),
  ('Manaus', 'AM', 'Tarumã', 'Zona Oeste', -3.0247, -60.0513),
  ('Manaus', 'AM', 'Compensa', 'Zona Oeste', -3.1050, -60.0560),
  ('Manaus', 'AM', 'Planalto', 'Zona Centro-Oeste', -3.0653, -60.0572),
  ('Manaus', 'AM', 'Dom Pedro', 'Zona Centro-Oeste', -3.0877, -60.0431),
  ('Manaus', 'AM', 'Flores', 'Zona Centro-Sul', -3.0728, -60.0212),
  ('Manaus', 'AM', 'Parque 10', 'Zona Centro-Sul', -3.0794, -60.0213),
  ('Manaus', 'AM', 'Adrianópolis', 'Zona Centro-Sul', -3.1017, -60.0090),
  ('Manaus', 'AM', 'Aleixo', 'Zona Centro-Sul', -3.0930, -59.9935),
  ('Manaus', 'AM', 'Centro', 'Zona Sul', -3.1321, -60.0216),
  ('Manaus', 'AM', 'Cidade Nova', 'Zona Norte', -3.0400, -59.9930),
  -- Brasília / DF
  ('Brasília', 'DF', 'Asa Sul', 'Plano Piloto', -15.8170, -47.8930),
  ('Brasília', 'DF', 'Asa Norte', 'Plano Piloto', -15.7630, -47.8830),
  ('Brasília', 'DF', 'Noroeste', 'Plano Piloto', -15.7510, -47.9120),
  ('Brasília', 'DF', 'Sudoeste', 'Sudoeste/Octogonal', -15.7970, -47.9270),
  ('Brasília', 'DF', 'Cruzeiro', 'Cruzeiro', -15.7890, -47.9330),
  ('Brasília', 'DF', 'Lago Sul', 'Lago Sul', -15.8400, -47.8600),
  ('Brasília', 'DF', 'Lago Norte', 'Lago Norte', -15.7300, -47.8500),
  ('Brasília', 'DF', 'Guará', 'Guará', -15.8200, -47.9800),
  ('Brasília', 'DF', 'Águas Claras', 'Águas Claras', -15.8400, -48.0300),
  -- Natal / RN
  ('Natal', 'RN', 'Ponta Negra', 'Zona Sul', -5.8800, -35.1800),
  ('Natal', 'RN', 'Capim Macio', 'Zona Sul', -5.8600, -35.1950),
  ('Natal', 'RN', 'Lagoa Nova', 'Zona Sul', -5.8300, -35.2100),
  ('Natal', 'RN', 'Candelária', 'Zona Sul', -5.8400, -35.2200),
  ('Natal', 'RN', 'Neópolis', 'Zona Sul', -5.8700, -35.2100),
  ('Natal', 'RN', 'Tirol', 'Zona Leste', -5.8000, -35.2000),
  ('Natal', 'RN', 'Petrópolis', 'Zona Leste', -5.7900, -35.1980),
  ('Natal', 'RN', 'Lagoa Seca', 'Zona Leste', -5.8100, -35.2100),
  ('Natal', 'RN', 'Alecrim', 'Zona Leste', -5.8000, -35.2200),
  ('Natal', 'RN', 'Lagoa Azul', 'Zona Norte', -5.7200, -35.2500),
  ('Natal', 'RN', 'Potengi', 'Zona Norte', -5.7500, -35.2500),
  -- Rio de Janeiro / RJ
  ('Rio de Janeiro', 'RJ', 'Copacabana', 'Zona Sul', -22.9710, -43.1870),
  ('Rio de Janeiro', 'RJ', 'Botafogo', 'Zona Sul', -22.9510, -43.1820),
  ('Rio de Janeiro', 'RJ', 'Flamengo', 'Zona Sul', -22.9320, -43.1760),
  ('Rio de Janeiro', 'RJ', 'Urca', 'Zona Sul', -22.9500, -43.1650),
  ('Rio de Janeiro', 'RJ', 'Centro', 'Centro', -22.9050, -43.1800),
  ('Rio de Janeiro', 'RJ', 'Tijuca', 'Zona Norte', -22.9250, -43.2330),
  ('Rio de Janeiro', 'RJ', 'Méier', 'Zona Norte', -22.9000, -43.2800),
  ('Rio de Janeiro', 'RJ', 'Ilha do Governador', 'Zona Norte', -22.8000, -43.2000),
  ('Rio de Janeiro', 'RJ', 'Barra da Tijuca', 'Zona Oeste', -23.0000, -43.3660),
  ('Rio de Janeiro', 'RJ', 'Jacarepaguá', 'Zona Oeste', -22.9600, -43.3500),
  ('Rio de Janeiro', 'RJ', 'Campo Grande', 'Zona Oeste', -22.9000, -43.5600),
  ('Rio de Janeiro', 'RJ', 'Vila Militar', 'Zona Oeste', -22.8600, -43.4000)
) as c (city_name, state_code, name, zone, center_lat, center_lng)
join public.localities l
  on l.city_name = c.city_name
 and l.state_code = c.state_code
on conflict (locality_id, name_key) do nothing;
