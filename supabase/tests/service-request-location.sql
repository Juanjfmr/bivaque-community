-- RUN-179 / LOC-IMPL L2 — CEP do pedido, bairro ao prestador e distância em metros.
--
-- O que esta suíte prova, contra o schema real:
--   * `service_requests` ganhou cep/latitude/longitude com os CHECKs de formato,
--     faixa e paridade; `region` (a coluna viva-órfã) é quem recebe o bairro;
--   * `authenticated` NÃO lê as três colunas cruas: `select *`, `to_jsonb(r)` e
--     a coluna direta respondem 42501 — e a mesma linha, pelas colunas
--     publicadas, continua legível (a recusa não é RLS disfarçada); nem o dono
--     lê o próprio CEP de volta;
--   * `create_service_request` grava CEP, coordenada e bairro na mesma
--     transação, mantém a idempotência e recusa CEP torto — e a coordenada e o
--     bairro NUNCA vêm do chamador: os parâmetros continuam na assinatura e são
--     IGNORADOS, porque os dois saem do `cep_geocodes` pelo CEP (SEC-013/F4);
--   * sem CEP, ou com CEP fora do cache, o pedido entra sem coordenada e sem
--     bairro (nunca com valor do corpo, nunca com zero); bairro que parece CEP
--     não entra na coluna `region`;
--   * `service_request_distance` responde METROS à centena só a participante, a
--     origem vem de `auth.uid()` (não é parâmetro: a função tem UM argumento),
--     e é NULL sem origem, sem coordenada ou para terceiro;
--   * a purga da conta zera a localização dos pedidos do titular.

begin;

create extension if not exists pgtap with schema extensions;
select plan(47);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- ---------------------------------------------------------------------------
-- Cenário: um prestador na vila A e a solicitante com origem no perfil.
-- ---------------------------------------------------------------------------

set local role postgres;

-- O cache de CEP é a ÚNICA fonte da coordenada e do bairro do pedido
-- (SEC-013/F4). "69000000" é o CEP que a solicitante informa; "69999998" tem
-- bairro com cara de CEP, para provar que ele não entra na coluna `region`.
insert into public.cep_geocodes (cep, latitude, longitude, source, neighborhood)
values
  ('69000000', -3.10194, -60.025, 'brasilapi', 'Centro'),
  ('69999998', -3.2, -60.1, 'brasilapi', '69000-000');

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000025', 'provider-request-location@example.invalid');

insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values (
  '10000000-0000-4000-8000-000000000025',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values (
  '30000000-0000-4000-8000-000000000025',
  '10000000-0000-4000-8000-000000000025',
  'Prestador Distante',
  'assistencia_tecnica'
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000025',
  'community',
  '70000000-0000-4000-8000-000000000001',
  'free'
);

-- O perfil do prestador nasce sem origem: é ele que prova o "sem origem é
-- NULL" antes de ganhar a coordenada abaixo.
insert into public.profiles (user_id, display_name, visibility)
values ('10000000-0000-4000-8000-000000000025', 'Prestador Distante', 'locality_members');

-- Origem privada da solicitante (001): o mesmo ponto do CEP do pedido, então a
-- distância dela até o próprio pedido é zero. O prestador (025) começa SEM
-- origem para provar o "sem origem é NULL" antes de ganhar a dele.
update public.profiles
   set cep = '69000000',
       latitude = -3.10194,
       longitude = -60.025
 where user_id = '10000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- 1. Colunas e CHECKs
-- ---------------------------------------------------------------------------

select has_column('public', 'service_requests', 'cep', 'service_requests guarda o CEP do pedido');
select has_column(
  'public', 'service_requests', 'latitude',
  'service_requests guarda a latitude derivada'
);
select has_column(
  'public', 'service_requests', 'longitude',
  'service_requests guarda a longitude derivada'
);
select has_column(
  'public', 'cep_geocodes', 'neighborhood',
  'o cache de CEP guarda o bairro junto da coordenada'
);

select throws_ok(
  $$ insert into public.service_requests (
       requester_user_id, provider_id, provider_user_id, category, description, cep
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000025',
       '10000000-0000-4000-8000-000000000025',
       'assistencia_tecnica',
       'CEP torto',
       '6900'
     ) $$,
  '23514',
  null,
  'CEP fora do formato de oito dígitos é recusado pelo banco'
);

select throws_ok(
  $$ insert into public.service_requests (
       requester_user_id, provider_id, provider_user_id, category, description, latitude
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000025',
       '10000000-0000-4000-8000-000000000025',
       'assistencia_tecnica',
       'Ponto pela metade',
       -3.1
     ) $$,
  '23514',
  null,
  'coordenada sem o par longitude é recusada'
);

select throws_ok(
  $$ insert into public.service_requests (
       requester_user_id, provider_id, provider_user_id, category, description, latitude, longitude
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000025',
       '10000000-0000-4000-8000-000000000025',
       'assistencia_tecnica',
       'Ponto fora da faixa',
       -91,
       -60
     ) $$,
  '23514',
  null,
  'coordenada fora da faixa é recusada'
);

-- ---------------------------------------------------------------------------
-- 2. Privilégio por coluna: ninguém lê cep/latitude/longitude
-- ---------------------------------------------------------------------------

select is(
  has_column_privilege('authenticated', 'public.service_requests', 'cep', 'SELECT'),
  false,
  'authenticated não tem SELECT em service_requests.cep'
);
select is(
  has_column_privilege('authenticated', 'public.service_requests', 'latitude', 'SELECT'),
  false,
  'authenticated não tem SELECT em service_requests.latitude'
);
select is(
  has_column_privilege('authenticated', 'public.service_requests', 'longitude', 'SELECT'),
  false,
  'authenticated não tem SELECT em service_requests.longitude'
);
select is(
  has_column_privilege('authenticated', 'public.service_requests', 'region', 'SELECT'),
  true,
  'o bairro (region) continua legível: é o que o prestador vê'
);

-- anon: N/A por construção — nenhum SELECT em `service_requests` (só a política
-- de `authenticated` existe), e o lote não devolve nada a anon.
select is(
  has_table_privilege('anon', 'public.service_requests', 'SELECT'),
  false,
  'anon não tem SELECT em service_requests (por isso não há teste de leitura)'
);

-- ---------------------------------------------------------------------------
-- 3. Criação grava a localização do CACHE, nunca a do chamador
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'Preciso de uma instalação elétrica',
      'A combinar',
      'k-local-1',
      '69000000'
    )
  $$,
  'a solicitante cria o pedido com o CEP'
);

-- A porta antiga está fechada sem quebrar a chamada: coordenada e bairro do
-- chamador continuam aceitos na assinatura e são IGNORADOS (SEC-013/F4). O que
-- fica gravado é o que o cache diz do CEP.
select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'Pedido com localização forjada',
      null,
      'k-forjado',
      '69000000',
      -23.55,
      -46.63,
      'Bairro Inventado'
    )
  $$,
  'coordenada e bairro do chamador não impedem o pedido'
);

reset role;

select is(
  (select region from public.service_requests where idempotency_key = 'k-forjado'),
  'Centro',
  'o bairro forjado não é gravado: vale o bairro do cache'
);
select results_eq(
  $$
    select latitude, longitude
      from public.service_requests
     where idempotency_key = 'k-forjado'
  $$,
  $$ values (-3.10194::double precision, -60.025::double precision) $$,
  'a coordenada forjada não é gravada: vale a do cache'
);

select is(
  (select cep from public.service_requests where idempotency_key = 'k-local-1'),
  '69000000',
  'o CEP do pedido ficou gravado'
);
select is(
  (select region from public.service_requests where idempotency_key = 'k-local-1'),
  'Centro',
  'o bairro vem do cache do CEP, não do chamador'
);
select is(
  (select latitude from public.service_requests where idempotency_key = 'k-local-1'),
  -3.10194::double precision,
  'a latitude vem do cache do CEP'
);
select is(
  (select longitude from public.service_requests where idempotency_key = 'k-local-1'),
  -60.025::double precision,
  'a longitude vem do cache do CEP'
);

-- Idempotência preservada: a mesma chave devolve o mesmo pedido, com os dados
-- da PRIMEIRA criação (o reenvio não reescreve a localização).
select results_eq(
  $$
    select public.create_service_request(
             '30000000-0000-4000-8000-000000000025',
             'Texto reenviado',
             'A combinar',
             'k-local-1',
             '69999998'
           )
         = (select id from public.service_requests where idempotency_key = 'k-local-1')
  $$,
  array[true],
  'reenviar com a mesma chave devolve o pedido existente'
);
select is(
  (select region from public.service_requests where idempotency_key = 'k-local-1'),
  'Centro',
  'o reenvio idempotente não reescreve o bairro gravado'
);
select results_eq(
  'select count(*) from public.service_requests where idempotency_key = ''k-local-1''',
  array[1::bigint],
  'reenviar não duplica o pedido'
);

-- ---------------------------------------------------------------------------
-- 4. Leitura: participante pelas colunas publicadas, terceiro sem nada
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select count(*)
      from public.service_requests
     where idempotency_key = 'k-local-1'
  $$,
  array[1::bigint],
  'a solicitante lê a própria linha pelas colunas publicadas (sem o CEP)'
);

select throws_ok(
  $$ select cep from public.service_requests $$,
  '42501',
  null,
  'select explícito de cep responde 42501 para authenticated'
);

select throws_ok(
  $$ select * from public.service_requests $$,
  '42501',
  null,
  'select * de service_requests responde 42501, mesmo na própria linha'
);

select throws_ok(
  $$ select to_jsonb(r) from public.service_requests r $$,
  '42501',
  null,
  'to_jsonb(service_requests) responde 42501 para authenticated'
);

-- Terceiro (002) tem origem no perfil, então o NULL da distância dele abaixo é
-- negação por participação, não falta de origem.
reset role;
update public.profiles
   set cep = '69000000',
       latitude = -3.11111,
       longitude = -60.03333
 where user_id = '10000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select id, description, region, status
      from public.service_requests
  $$,
  'terceiro não lê o pedido nem pelas colunas publicadas'
);

select is_empty(
  $$ select 1 from public.service_requests where region is not null $$,
  'terceiro não lê o bairro do pedido alheio'
);

-- ---------------------------------------------------------------------------
-- 5. Distância: metros à centena, origem do chamador, só participante
-- ---------------------------------------------------------------------------

-- O prestador ainda não tem origem: participante sem origem é NULL, não erro.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000025', true);
select is(
  (select public.service_request_distance(id)
     from public.service_requests
    where idempotency_key = 'k-local-1'),
  null,
  'participante sem origem no perfil recebe NULL, não erro'
);

-- Origem do prestador: ~3,14 km do ponto do pedido (Manaus, ambos sintéticos).
reset role;
update public.profiles
   set cep = '69000000',
       latitude = -3.12194,
       longitude = -60.045
 where user_id = '10000000-0000-4000-8000-000000000025';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000025', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select public.service_request_distance(id)
     from public.service_requests
    where idempotency_key = 'k-local-1'),
  3100,
  'o prestador recebe a distância da SUA origem em metros, arredondada à centena'
);

-- A solicitante tem origem no próprio ponto do pedido: a MESMA função responde
-- outro valor para ela. É a prova de que a origem vem de auth.uid().
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  (select public.service_request_distance(id)
     from public.service_requests
    where idempotency_key = 'k-local-1'),
  0,
  'a solicitante recebe a distância da origem DELA, não a do prestador'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  (select public.service_request_distance(id)
     from public.service_requests
    where idempotency_key = 'k-local-1'),
  null,
  'terceiro com origem no perfil não recebe distância: não participa do pedido'
);

-- A origem não é parametrizável: a função tem UM argumento. Com dois, o
-- Postgres não encontra função (42883) — não existe caminho para "ver de outro
-- lugar".
select has_function(
  'public',
  'service_request_distance',
  array['uuid'],
  'service_request_distance recebe só o id do pedido'
);
select throws_ok(
  $$
    select public.service_request_distance(
      (select id from public.service_requests where idempotency_key = 'k-local-1'),
      '10000000-0000-4000-8000-000000000025'::uuid
    )
  $$,
  '42883',
  null,
  'não existe sobrecarga que aceite a origem: a coordenada do chamador não vem do cliente'
);

reset role;
select is(
  has_function_privilege('anon', 'public.service_request_distance(uuid)', 'EXECUTE'),
  false,
  'anon não executa a RPC de distância'
);

-- ---------------------------------------------------------------------------
-- 6. CEP fora do cache: pedido sem coordenada e sem bairro
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'Pedido do interior, sem posição',
      null,
      'k-local-2',
      '69000-000'
    )
  $$,
  'CEP fora do cache não impede o pedido'
);

reset role;

select is(
  (select cep from public.service_requests where idempotency_key = 'k-local-2'),
  '69000000',
  'o CEP do pedido é normalizado para oito dígitos'
);
-- O cache é a única fonte do bairro: fora dele não há bairro a publicar — e o
-- bairro do corpo da chamada não existe mais (SEC-013/F4).
select is(
  (select region from public.service_requests where idempotency_key = 'k-local-2'),
  null,
  'CEP fora do cache deixa o pedido sem bairro'
);

select results_eq(
  $$
    select latitude, longitude
      from public.service_requests
     where idempotency_key = 'k-local-2'
  $$,
  $$ values (null::double precision, null::double precision) $$,
  'fora do cache o pedido fica sem coordenada, nunca com zero'
);

-- Bairro com cara de CEP não entra na coluna `region` (CHECK de 20261022120200):
-- o texto vem da fonte do CEP, então vira ausência de bairro — não erro na
-- criação do pedido.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  perform public.create_service_request(
    '30000000-0000-4000-8000-000000000025',
    'Pedido com bairro que parece CEP',
    null,
    'k-local-5',
    '69999998'
  );
end $$;

reset role;

select is(
  (select region from public.service_requests where idempotency_key = 'k-local-5'),
  null,
  'bairro com cara de CEP vira ausência de bairro'
);

-- Sem CEP não há de onde derivar: nada de coordenada, nada de bairro — e a
-- coordenada que o chamador mandar continua ignorada.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  perform public.create_service_request(
    '30000000-0000-4000-8000-000000000025',
    'Pedido sem CEP nenhum',
    null,
    'k-sem-cep',
    null,
    -23.55,
    -46.63,
    'Bairro Inventado'
  );
end $$;

reset role;

select results_eq(
  $$
    select latitude, longitude, region
      from public.service_requests
     where idempotency_key = 'k-sem-cep'
  $$,
  $$ values (null::double precision, null::double precision, null::text) $$,
  'sem CEP o pedido fica sem coordenada e sem bairro'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000025', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select public.service_request_distance(id)
     from public.service_requests
    where idempotency_key = 'k-local-2'),
  null,
  'sem coordenada no pedido, a distância é NULL'
);

-- ---------------------------------------------------------------------------
-- 7. O RPC recusa o que não é localização válida
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'CEP inválido',
      null,
      'k-local-3',
      '6900'
    )
  $$,
  '22023',
  null,
  'CEP torto é recusado pelo RPC'
);

-- ---------------------------------------------------------------------------
-- 8. A purga da conta zera a localização dos pedidos do titular
-- ---------------------------------------------------------------------------

reset role;

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000001',
  now() - interval '16 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000001'),
  'purged',
  'a purga da conta da solicitante roda depois do vencimento'
);

select results_eq(
  $$
    select cep, latitude, longitude, region
      from public.service_requests
     where idempotency_key = 'k-local-1'
  $$,
  $$ values (null::text, null::double precision, null::double precision, null::text) $$,
  'a purga apaga CEP, coordenada e bairro dos pedidos do titular'
);

select is(
  (select count(*)::int from public.service_requests where idempotency_key = 'k-local-1'),
  1,
  'o pedido continua existindo depois da purga: só a localização sai'
);

select * from finish();
rollback;