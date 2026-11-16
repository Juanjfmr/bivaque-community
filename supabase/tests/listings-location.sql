-- RUN-175 / LOC-IMPL L1 — CEP e localização do anúncio.
--
-- O que esta suíte prova, contra o schema real:
--   * as quatro colunas existem, a escolha só existe com CEP e o aproximado é
--     GRADE (não só intenção): UPDATE bruto de coordenada crua é recusado;
--   * `authenticated` NÃO lê cep/latitude/longitude: `select *`, `to_jsonb(l)` e
--     a coluna direta respondem 42501 — e a mesma linha, pelas colunas
--     publicadas, é legível (a recusa não é RLS disfarçada);
--   * o dono lê a própria localização por `get_listing_location`, e nunca a de
--     terceiro; terceiro também não muda a localização alheia (RLS);
--   * o desapego aceita bairro vazio (ADR §2) e recusa local exato;
--   * `create_property_listing` obedece à mesma grade (o jsonb não é atalho);
--   * a purga de conta apaga CEP, coordenada e escolha do anúncio do titular.

begin;

create extension if not exists pgtap with schema extensions;
select plan(33);

\ir fixtures/foundation.inc

-- Imóvel do membro 002, completo como a rota grava: CEP, coordenada e escolha.
insert into public.listings (
  id, owner_user_id, kind, status, title, neighborhood, address,
  cep, latitude, longitude, localizacao_publica, locality_id, published_at
)
values (
  'a5000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'property',
  'active',
  'Apartamento no Centro',
  'Centro',
  'Rua A, 100',
  '69000000',
  -3.10194,
  -60.025,
  'exata',
  '00000000-0000-4000-8000-000000000001',
  now()
);

insert into public.property_details (listing_id, deal, property_type, rent_cents)
values ('a5000000-0000-4000-8000-000000000001', 'rent', 'apartment', 180000);

-- ---------------------------------------------------------------------------
-- 1. As colunas e os CHECKs
-- ---------------------------------------------------------------------------

select has_column('public', 'listings', 'cep', 'listings guarda o CEP do anúncio');
select has_column('public', 'listings', 'latitude', 'listings guarda a latitude derivada');
select has_column('public', 'listings', 'longitude', 'listings guarda a longitude derivada');
select has_column(
  'public', 'listings', 'localizacao_publica',
  'listings guarda a escolha exata/aproximada'
);

select throws_ok(
  $$ insert into public.listings (owner_user_id, kind, status, title, cep)
     values ('10000000-0000-4000-8000-000000000001', 'property', 'draft', 'CEP torto', '6900') $$,
  '23514',
  null,
  'CEP fora do formato de oito dígitos é recusado pelo banco'
);

select throws_ok(
  $$ insert into public.listings (owner_user_id, kind, status, title, latitude)
     values ('10000000-0000-4000-8000-000000000001', 'property', 'draft', 'Ponto pela metade', -3.1) $$,
  '23514',
  null,
  'coordenada sem o par longitude é recusada'
);

select throws_ok(
  $$ insert into public.listings (
       owner_user_id, kind, status, title, localizacao_publica
     )
     values ('10000000-0000-4000-8000-000000000001', 'property', 'draft', 'Escolha sem CEP', 'exata') $$,
  '23514',
  null,
  'escolha publicada sem CEP é recusada'
);

-- Desapego sem bairro: o relaxo do ADR §2 (com CEP a cidade/bairro vêm dele).
-- A coordenada é a que o servidor grava: grade de 0,001° deslocada de 0,003°.
insert into public.listings (
  id, owner_user_id, kind, status, title, description, price_cents, category,
  condition, cep, latitude, longitude, localizacao_publica, locality_id, published_at
)
values (
  'a5000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'item',
  'active',
  'Mesa de jantar',
  'Mesa em bom estado.',
  45000,
  'casa_moveis',
  'used',
  '69000000',
  -3.108,
  -60.031,
  'aproximada',
  '00000000-0000-4000-8000-000000000001',
  now()
);

select is(
  (select neighborhood from public.listings
    where id = 'a5000000-0000-4000-8000-000000000002'),
  null,
  'desapego sem bairro é válido agora que o bairro é opcional'
);

select throws_ok(
  $$ insert into public.listings (
       id, owner_user_id, kind, status, title, description, price_cents, category,
       condition, cep, latitude, longitude, localizacao_publica, locality_id
     )
     values (
       'a5000000-0000-4000-8000-000000000003',
       '10000000-0000-4000-8000-000000000002',
       'item',
       'active',
       'Item com local exato',
       'Não deveria existir.',
       1000,
       'outros',
       'used',
       '69000000',
       -3.1,
       -60.0,
       'exata',
       '00000000-0000-4000-8000-000000000001'
     ) $$,
  '23514',
  null,
  'desapego nunca publica local exato (coordenada é sempre aproximada)'
);

-- ---------------------------------------------------------------------------
-- 2. Privilégio por coluna: terceiro não lê CEP nem coordenada
-- ---------------------------------------------------------------------------

select is(
  has_column_privilege('authenticated', 'public.listings', 'cep', 'SELECT'),
  false,
  'authenticated não tem SELECT em listings.cep'
);
select is(
  has_column_privilege('authenticated', 'public.listings', 'latitude', 'SELECT'),
  false,
  'authenticated não tem SELECT em listings.latitude'
);
select is(
  has_column_privilege('authenticated', 'public.listings', 'longitude', 'SELECT'),
  false,
  'authenticated não tem SELECT em listings.longitude'
);
select is(
  has_column_privilege('authenticated', 'public.listings', 'localizacao_publica', 'SELECT'),
  true,
  'a escolha publicada continua legível: é o que a tela do anúncio mostra'
);

-- anon: N/A por construção — `anon` não tem SELECT nenhum em `listings`
-- (`revoke all on table public.listings from anon, authenticated` em
-- 20260911043053:272, e o lote não devolve nada a anon). A prova é o privilégio
-- ausente, não um teste de leitura que nunca chegaria à tabela.
select is(
  has_table_privilege('anon', 'public.listings', 'SELECT'),
  false,
  'anon não tem SELECT em listings (por isso não há teste de leitura de localizacao_publica)'
);
select is(
  has_column_privilege('anon', 'public.listings', 'localizacao_publica', 'SELECT'),
  false,
  'anon não tem privilégio de coluna em localizacao_publica'
);

-- Membro um é da mesma cidade do anúncio do membro dois: a linha é visível.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  1,
  'o anúncio do vizinho é visível pelas colunas publicadas'
);

select throws_ok(
  $$ select cep from public.listings $$,
  '42501',
  null,
  'select explícito de cep responde 42501 para authenticated'
);

select throws_ok(
  $$ select * from public.listings $$,
  '42501',
  null,
  'select * de listings responde 42501 para authenticated'
);

select throws_ok(
  $$ select to_jsonb(l) from public.listings l $$,
  '42501',
  null,
  'to_jsonb(listings) responde 42501 para authenticated'
);

-- Terceiro não muda a localização alheia: a policy filtra a linha, o UPDATE
-- afeta zero linhas (RLS silenciosa, sem erro) e o valor gravado não muda.
select lives_ok(
  $$ update public.listings set longitude = -60.1
      where id = 'a5000000-0000-4000-8000-000000000001' $$,
  'update de terceiro na localização não estoura: a RLS filtra a linha'
);

reset role;
select is(
  (select longitude from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  -60.025::double precision,
  'a localização do anúncio de terceiro ficou intacta depois do update alheio'
);

-- ---------------------------------------------------------------------------
-- 3. Leitura do dono: get_listing_location
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is_empty(
  $$ select * from public.get_listing_location('a5000000-0000-4000-8000-000000000001') $$,
  'quem não é o dono não lê a localização do anúncio'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$ select listing_id, cep, localizacao_publica
       from public.get_listing_location('a5000000-0000-4000-8000-000000000001') $$,
  $$ values ('a5000000-0000-4000-8000-000000000001'::uuid, '69000000'::text, 'exata'::text) $$,
  'o dono lê o CEP e a escolha do próprio anúncio'
);

select is(
  (select count(*)::int from public.get_listing_location()),
  2,
  'sem id, a função devolve só os anúncios do próprio chamador'
);

-- ---------------------------------------------------------------------------
-- 4. Granularidade do aproximado (RUN-175 / revisão R3)
--
-- O grant por coluna protege a LEITURA. A ESCRITA é do dono, pelo cliente da
-- sessão (o PATCH atualiza `listings` e o POST usa `create_property_listing`
-- invoker), então o invariante vive no CHECK: quando a escolha é aproximada, a
-- coordenada tem que cair na grade de 0,001° deslocada de 0,003° — exatamente o
-- que `apps/web/lib/geo/anuncio.ts` grava.
-- ---------------------------------------------------------------------------

-- Negativo: coordenada crua do provedor (6 casas) declarada "aproximada".
select throws_ok(
  $$ update public.listings
        set localizacao_publica = 'aproximada', latitude = -3.10194, longitude = -60.025
      where id = 'a5000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'coordenada crua com escolha aproximada é recusada (fora da grade do servidor)'
);

-- Positivo: o que o servidor grava (grade de 0,001° deslocada de 0,003°) passa.
select lives_ok(
  $$ update public.listings
        set localizacao_publica = 'aproximada', latitude = -3.105, longitude = -60.028
      where id = 'a5000000-0000-4000-8000-000000000001' $$,
  'a coordenada que o servidor grava passa pelo CHECK de granularidade'
);

-- O caminho do imóvel novo (RPC com jsonb) obedece à mesma regra.
select throws_ok(
  $$ select public.create_property_listing(
       '{"status":"active","title":"Imóvel com coordenada crua","locality_id":"00000000-0000-4000-8000-000000000001","cep":"69000000","latitude":-3.10194,"longitude":-60.025,"localizacao_publica":"aproximada"}'::jsonb,
       '{"deal":"rent","property_type":"apartment"}'::jsonb
     ) $$,
  '23514',
  null,
  'create_property_listing com coordenada crua e escolha aproximada é recusado'
);

select ok(
  public.create_property_listing(
    '{"status":"active","title":"Imóvel na grade","locality_id":"00000000-0000-4000-8000-000000000001","cep":"69000000","latitude":-3.105,"longitude":-60.028,"localizacao_publica":"aproximada"}'::jsonb,
    '{"deal":"rent","property_type":"apartment"}'::jsonb
  ) is not null,
  'create_property_listing grava quando a coordenada está na grade'
);

-- ---------------------------------------------------------------------------
-- 5. A purga de conta conhece as colunas do anúncio
-- ---------------------------------------------------------------------------

reset role;

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000002',
  now() - interval '16 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000002'),
  'purged',
  'a purga da conta do anunciante roda depois do vencimento'
);

select is(
  (select cep from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  null,
  'a purga apaga o CEP do anúncio do titular'
);

select is(
  (select latitude from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  null,
  'a purga apaga a latitude do anúncio do titular'
);

select is(
  (select longitude from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  null,
  'a purga apaga a longitude do anúncio do titular'
);

select is(
  (select localizacao_publica from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  null,
  'a purga apaga a escolha de localização do anúncio do titular'
);

select * from finish();
rollback;