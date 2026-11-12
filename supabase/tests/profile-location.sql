-- RUN-029 / ADR-20261022-localizacao §4: a localização do perfil é dado de
-- cálculo privado. O CEP fica em `profiles`, a coordenada é derivada no servidor
-- e nenhum dos dois volta ao cliente nem é legível por outro membro.
--
-- O que este arquivo prova, e é o motivo de ele existir:
--   * o dono lê o próprio CEP pela função, e a coluna crua continua 42501;
--   * outro membro não lê cep/lat/lng por coluna, `*` nem `to_jsonb`;
--   * update direto da coordenada e a execução de `set_member_location` por
--     `authenticated` são negados; `anon` não executa as leituras;
--   * `distance_to_neighborhood` usa a origem de quem chama (A e B, mesmo
--     bairro, distâncias diferentes) e devolve metros inteiros;
--   * o cache `public.cep_geocodes` é só do service_role;
--   * as constraints recusam CEP inválido, coordenada solta e fora de faixa;
--   * CEP conhecido sem coordenada é aceito e a origem sem posição não vira
--     distância zero (ADR-20261112);
--   * a purga da conta zera cep, latitude e longitude.

begin;

create extension if not exists pgtap with schema extensions;
select plan(52);

\ir fixtures/foundation.inc

-- Bairro sintético com centro conhecido; o catálogo real não entra em teste.
insert into public.neighborhoods (id, locality_id, name, center_lat, center_lng)
values (
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Bairro Sintético',
  -3.100000,
  -60.000000
);

-- A e B com CEPs e origens diferentes: a distância tem de sair da origem de
-- cada um, nunca de um parâmetro de usuário.
set local role service_role;
select public.set_member_location(
  '10000000-0000-4000-8000-000000000001',
  '69000-000',
  -3.119000,
  -60.021700
);
select public.set_member_location(
  '10000000-0000-4000-8000-000000000002',
  '69020000',
  -3.200000,
  -60.100000
);
reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Privilégios: a leitura é de authenticated, a escrita é só de service_role
-- ───────────────────────────────────────────────────────────────────────────

select is(
  has_function_privilege('authenticated', 'public.get_my_profile_location()', 'EXECUTE'),
  true,
  'authenticated lê a própria localização pela função'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.distance_to_neighborhood(uuid)',
    'EXECUTE'
  ),
  true,
  'authenticated calcula a distância pela função'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.set_member_location(uuid,text,numeric,numeric)',
    'EXECUTE'
  ),
  false,
  'authenticated não executa a escrita da coordenada'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. O dono lê o próprio CEP; a coluna crua não tem caminho de leitura
-- ───────────────────────────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select cep from public.get_my_profile_location()),
  '69000000',
  'o dono lê o próprio CEP normalizado'
);

select is(
  (select definida from public.get_my_profile_location()),
  true,
  'a função diz que a localização está definida'
);

select is(
  pg_get_function_result('public.get_my_profile_location()'::regprocedure),
  'TABLE(cep text, definida boolean, com_coordenada boolean)',
  'a função não devolve latitude nem longitude, só se há posição'
);

select throws_ok(
  $$
    select cep from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'a coluna crua não é legível nem pelo dono: a leitura é pela função'
);

select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'SELECT * não contorna a privacidade da localização'
);

select throws_ok(
  $$
    update public.profiles
       set latitude = -3.2
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'update direto da coordenada é negado nem para o dono'
);

select throws_ok(
  $$
    select public.set_member_location(
      '10000000-0000-4000-8000-000000000001',
      '69000000',
      -3.119,
      -60.0217
    )
  $$,
  '42501', null,
  'authenticated não escreve a coordenada nem para o próprio perfil'
);

reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Outro membro não alcança a localização de ninguém
-- ───────────────────────────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select cep from public.get_my_profile_location()),
  '69020000',
  'B lê o próprio CEP, não o de A'
);

select throws_ok(
  $$
    select cep, latitude, longitude from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'B não lê cep, latitude nem longitude de A'
);

select throws_ok(
  $$
    select * from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'B não lê a linha de A por SELECT *'
);

select throws_ok(
  $$
    select to_jsonb(p) from public.profiles p
     where p.user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'linha inteira em JSON não contorna a privacidade da localização'
);

select throws_ok(
  $$
    update public.profiles
       set longitude = -60.5
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'B não muda a coordenada de A'
);

reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. anon não executa as leituras
-- ───────────────────────────────────────────────────────────────────────────

select is(
  has_function_privilege('anon', 'public.get_my_profile_location()', 'EXECUTE'),
  false,
  'anon não executa a leitura do próprio perfil'
);

select is(
  has_function_privilege('anon', 'public.distance_to_neighborhood(uuid)', 'EXECUTE'),
  false,
  'anon não executa o cálculo de distância'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
  $$ select * from public.get_my_profile_location() $$,
  '42501', null,
  'anon é recusado ao chamar a leitura da localização'
);

select throws_ok(
  $$ select public.distance_to_neighborhood('70000000-0000-4000-8000-000000000001') $$,
  '42501', null,
  'anon é recusado ao chamar a distância'
);

reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. O cache de CEP é do service_role
-- ───────────────────────────────────────────────────────────────────────────

select is(
  has_table_privilege('authenticated', 'public.cep_geocodes', 'SELECT'),
  false,
  'authenticated não lê o cache de CEP'
);

select is(
  has_table_privilege('service_role', 'public.cep_geocodes', 'SELECT'),
  true,
  'service_role lê o cache de CEP'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.cep_geocodes'::regclass),
  true,
  'o cache de CEP tem RLS ligada'
);

select is(
  (select relforcerowsecurity from pg_class where oid = 'public.cep_geocodes'::regclass),
  true,
  'o cache de CEP tem RLS forçada'
);

select is(
  (
    select count(*) from pg_policies
     where schemaname = 'public'
       and tablename = 'cep_geocodes'
       and policyname = 'cep_geocodes_service_role_all'
  ),
  1::bigint,
  'a policy do cache é a do service_role'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$ select * from public.cep_geocodes $$,
  '42501', null,
  'a policy não deixa authenticated ler o cache'
);

reset role;

set local role service_role;
select lives_ok(
  $$
    insert into public.cep_geocodes (cep, latitude, longitude, source)
    values ('69000000', -3.119, -60.0217, 'brasilapi')
  $$,
  'service_role grava o cache de CEP'
);
reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. distance_to_neighborhood: mesma origem de quem chama, metros inteiros
-- ───────────────────────────────────────────────────────────────────────────

create temporary table distancias (quem text primary key, metros integer) on commit drop;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into distancias
values ('a', public.distance_to_neighborhood('70000000-0000-4000-8000-000000000001'));

select is(
  pg_typeof(public.distance_to_neighborhood('70000000-0000-4000-8000-000000000001'))::text,
  'integer',
  'a distância é devolvida em metros inteiros'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
insert into distancias
values ('b', public.distance_to_neighborhood('70000000-0000-4000-8000-000000000001'));

select ok(
  (select metros from distancias where quem = 'a') > 0,
  'a distância de A é positiva'
);

select ok(
  (select metros from distancias where quem = 'b') > 0,
  'a distância de B é positiva'
);

select isnt(
  (select metros from distancias where quem = 'a'),
  (select metros from distancias where quem = 'b'),
  'A e B chegam ao mesmo bairro por origens diferentes'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 7. As constraints recusam o que a função também recusaria
-- ───────────────────────────────────────────────────────────────────────────

select throws_ok(
  $$
    update public.profiles
       set cep = 'abc', latitude = null, longitude = null
     where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  '23514', null,
  'CEP que não tem oito dígitos é recusado pela constraint'
);

select throws_ok(
  $$
    update public.profiles
       set latitude = 1
     where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  '23514', null,
  'coordenada sem CEP é recusada pela constraint'
);

select throws_ok(
  $$
    update public.profiles
       set cep = '69000000', latitude = 120, longitude = -60
     where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  '23514', null,
  'latitude fora da faixa é recusada pela constraint'
);

select throws_ok(
  $$
    update public.profiles
       set cep = '69000000', latitude = -3.1, longitude = null
     where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  '23514', null,
  'CEP sem as duas coordenadas é recusado pela constraint'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 8. set_member_location: normaliza, limpa e recusa com o código certo
-- ───────────────────────────────────────────────────────────────────────────

set local role service_role;

select throws_ok(
  $$ select public.set_member_location('10000000-0000-4000-8000-000000000002', '123', null, null) $$,
  '22023', null,
  'CEP inválido é recusado com 22023'
);

select throws_ok(
  $$ select public.set_member_location('10000000-0000-4000-8000-000000000005', '69000000', -3.1, -60) $$,
  'P0002', null,
  'perfil ausente é recusado com P0002'
);

select throws_ok(
  $$
    select public.set_member_location(
      '10000000-0000-4000-8000-000000000002',
      null,
      -3.1,
      -60
    )
  $$,
  '22023', null,
  'coordenada sem CEP é recusada pela função com 22023'
);

select lives_ok(
  $$ select public.set_member_location('10000000-0000-4000-8000-000000000002', null, null, null) $$,
  'a função limpa a localização quando o CEP é nulo'
);

reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select is(
  (select cep from public.get_my_profile_location()),
  null,
  'depois de limpar, o CEP do dono é nulo'
);

select is(
  (select definida from public.get_my_profile_location()),
  false,
  'depois de limpar, a localização não está definida'
);

reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. A purga da conta apaga CEP e coordenada
-- ───────────────────────────────────────────────────────────────────────────

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000001',
  now() - interval '16 days',
  now() - interval '1 day'
);

set local role service_role;

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000001'),
  'purged',
  'a purga da conta conclui'
);

reset role;

select is(
  (
    select cep from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  null,
  'a purga zera o CEP'
);

select is(
  (
    select latitude from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  null,
  'a purga zera a latitude'
);

select is(
  (
    select longitude from public.profiles
     where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  null,
  'a purga zera a longitude'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 10. CEP conhecido sem coordenada (ADR-20261112)
-- ───────────────────────────────────────────────────────────────────────────

-- A constraint aceita CEP sozinho, que é o que a rota grava quando nenhuma
-- fonte localiza o CEP.
select lives_ok(
  $$
    update public.profiles
       set cep = '69000001', latitude = null, longitude = null
     where user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'CEP sem coordenada é aceito pela constraint'
);

set local role service_role;

select lives_ok(
  $$ select public.set_member_location('10000000-0000-4000-8000-000000000004', '69000001', null, null) $$,
  'a função grava CEP sem coordenada'
);

select throws_ok(
  $$
    select public.set_member_location(
      '10000000-0000-4000-8000-000000000004',
      '69000001',
      -3.1,
      null
    )
  $$,
  '22023', null,
  'latitude sem longitude é recusada pela função'
);

select throws_ok(
  $$
    select public.set_member_location(
      '10000000-0000-4000-8000-000000000004',
      '69000001',
      null,
      -60
    )
  $$,
  '22023', null,
  'longitude sem latitude é recusada pela função'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select cep from public.get_my_profile_location()),
  '69000001',
  'o dono vê o CEP guardado sem posição'
);

select is(
  (select com_coordenada from public.get_my_profile_location()),
  false,
  'a leitura do dono marca a localização como sem posição'
);

select is(
  (select definida from public.get_my_profile_location()),
  true,
  'CEP sem posição continua sendo localização definida'
);

-- Distância com origem sem posição é ausente, nunca zero: um zero seria uma
-- distância inventada, que o ADR proíbe.
select is(
  public.distance_to_neighborhood('70000000-0000-4000-8000-000000000001'),
  null,
  'origem sem coordenada devolve NULL, nunca zero'
);

reset role;

select * from finish();

rollback;