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
--     transação, mantém a idempotência e recusa CEP torto e coordenada ímpar;
--   * CEP conhecido sem coordenada é sucesso parcial (cep + bairro, sem ponto);
--   * `service_request_distance` responde METROS à centena só a participante, a
--     origem vem de `auth.uid()` (não é parâmetro: a função tem UM argumento),
--     e é NULL sem origem, sem coordenada ou para terceiro;
--   * a purga da conta zera a localização dos pedidos do titular.

begin;

create extension if not exists pgtap with schema extensions;
select plan(43);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- ---------------------------------------------------------------------------
-- Cenário: um prestador na vila A e a solicitante com origem no perfil.
-- ---------------------------------------------------------------------------

set local role postgres;

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
-- 3. Criação grava a localização na mesma transação
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
      '69000000',
      -3.10194,
      -60.025,
      'Centro'
    )
  $$,
  'a solicitante cria o pedido com CEP, coordenada e bairro'
);

reset role;

select is(
  (select cep from public.service_requests where idempotency_key = 'k-local-1'),
  '69000000',
  'o CEP do pedido ficou gravado'
);
select is(
  (select region from public.service_requests where idempotency_key = 'k-local-1'),
  'Centro',
  'o bairro derivado foi gravado na coluna region'
);
select is(
  (select latitude from public.service_requests where idempotency_key = 'k-local-1'),
  -3.10194::double precision,
  'a latitude derivada ficou gravada'
);
select is(
  (select longitude from public.service_requests where idempotency_key = 'k-local-1'),
  -60.025::double precision,
  'a longitude derivada ficou gravada'
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
             '69999999',
             -3.2,
             -60.1,
             'Outro bairro'
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
  'select count(*) from public.service_requests',
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
-- 6. CEP conhecido sem coordenada: sucesso parcial
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
      '69000-000',
      null,
      null,
      'Flores'
    )
  $$,
  'CEP sem coordenada não impede o pedido (sucesso parcial)'
);

reset role;

select is(
  (select cep from public.service_requests where idempotency_key = 'k-local-2'),
  '69000000',
  'o CEP do pedido parcial é normalizado para oito dígitos'
);
select is(
  (select region from public.service_requests where idempotency_key = 'k-local-2'),
  'Flores',
  'o bairro do pedido parcial fica gravado'
);

select results_eq(
  $$
    select latitude, longitude
      from public.service_requests
     where idempotency_key = 'k-local-2'
  $$,
  $$ values (null::double precision, null::double precision) $$,
  'o pedido parcial fica sem coordenada, nunca com zero'
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

select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'Coordenada sem par',
      null,
      'k-local-4',
      '69000000',
      -3.1
    )
  $$,
  '22023',
  null,
  'coordenada sem o par é recusada pelo RPC'
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