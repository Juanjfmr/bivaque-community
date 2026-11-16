-- RUN-175 / LOC-IMPL L1 â€” CEP e localizaÃ§Ã£o do anÃºncio.
--
-- O que esta suÃ­te prova, contra o schema real:
--   * as quatro colunas existem e a escolha sÃ³ existe com CEP;
--   * `authenticated` NÃƒO lÃª cep/latitude/longitude: `select *`, `to_jsonb(l)` e
--     a coluna direta respondem 42501 â€” e a mesma linha, pelas colunas
--     publicadas, Ã© legÃ­vel (a recusa nÃ£o Ã© RLS disfarÃ§ada);
--   * o dono lÃª a prÃ³pria localizaÃ§Ã£o por `get_listing_location`, e nunca a de
--     terceiro;
--   * o desapego aceita bairro vazio (ADR Â§2) e recusa local exato;
--   * a purga de conta apaga CEP e coordenada do anÃºncio do titular.

begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

\ir fixtures/foundation.inc

-- ImÃ³vel do membro 002, completo como a rota grava: CEP, coordenada e escolha.
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

select has_column('public', 'listings', 'cep', 'listings guarda o CEP do anÃºncio');
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
  'CEP fora do formato de oito dÃ­gitos Ã© recusado pelo banco'
);

select throws_ok(
  $$ insert into public.listings (owner_user_id, kind, status, title, latitude)
     values ('10000000-0000-4000-8000-000000000001', 'property', 'draft', 'Ponto pela metade', -3.1) $$,
  '23514',
  null,
  'coordenada sem o par longitude Ã© recusada'
);

select throws_ok(
  $$ insert into public.listings (
       owner_user_id, kind, status, title, localizacao_publica
     )
     values ('10000000-0000-4000-8000-000000000001', 'property', 'draft', 'Escolha sem CEP', 'exata') $$,
  '23514',
  null,
  'escolha publicada sem CEP Ã© recusada'
);

-- Desapego sem bairro: o relaxo do ADR Â§2 (com CEP a cidade/bairro vÃªm dele).
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
  -3.10494,
  -60.028,
  'aproximada',
  '00000000-0000-4000-8000-000000000001',
  now()
);

select is(
  (select neighborhood from public.listings
    where id = 'a5000000-0000-4000-8000-000000000002'),
  null,
  'desapego sem bairro Ã© vÃ¡lido agora que o bairro Ã© opcional'
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
       'NÃ£o deveria existir.',
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
  'desapego nunca publica local exato (coordenada Ã© sempre aproximada)'
);

-- ---------------------------------------------------------------------------
-- 2. PrivilÃ©gio por coluna: terceiro nÃ£o lÃª CEP nem coordenada
-- ---------------------------------------------------------------------------

select is(
  has_column_privilege('authenticated', 'public.listings', 'cep', 'SELECT'),
  false,
  'authenticated nÃ£o tem SELECT em listings.cep'
);
select is(
  has_column_privilege('authenticated', 'public.listings', 'latitude', 'SELECT'),
  false,
  'authenticated nÃ£o tem SELECT em listings.latitude'
);
select is(
  has_column_privilege('authenticated', 'public.listings', 'longitude', 'SELECT'),
  false,
  'authenticated nÃ£o tem SELECT em listings.longitude'
);
select is(
  has_column_privilege('authenticated', 'public.listings', 'localizacao_publica', 'SELECT'),
  true,
  'a escolha publicada continua legÃ­vel: Ã© o que a tela do anÃºncio mostra'
);

-- Membro um Ã© da mesma cidade do anÃºncio do membro dois: a linha Ã© visÃ­vel.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::int from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  1,
  'o anÃºncio do vizinho Ã© visÃ­vel pelas colunas publicadas'
);

select throws_ok(
  $$ select cep from public.listings $$,
  '42501',
  null,
  'select explÃ­cito de cep responde 42501 para authenticated'
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

-- ---------------------------------------------------------------------------
-- 3. Leitura do dono: get_listing_location
-- ---------------------------------------------------------------------------

select is_empty(
  $$ select * from public.get_listing_location('a5000000-0000-4000-8000-000000000001') $$,
  'quem nÃ£o Ã© o dono nÃ£o lÃª a localizaÃ§Ã£o do anÃºncio'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select results_eq(
  $$ select listing_id, cep, localizacao_publica
       from public.get_listing_location('a5000000-0000-4000-8000-000000000001') $$,
  $$ values ('a5000000-0000-4000-8000-000000000001'::uuid, '69000000'::text, 'exata'::text) $$,
  'o dono lÃª o CEP e a escolha do prÃ³prio anÃºncio'
);

select is(
  (select count(*)::int from public.get_listing_location()),
  2,
  'sem id, a funÃ§Ã£o devolve sÃ³ os anÃºncios do prÃ³prio chamador'
);

-- ---------------------------------------------------------------------------
-- 4. A purga de conta conhece as colunas do anÃºncio
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
  'a purga apaga o CEP do anÃºncio do titular'
);

select is(
  (select latitude from public.listings
    where id = 'a5000000-0000-4000-8000-000000000001'),
  null,
  'a purga apaga a coordenada do anÃºncio do titular'
);

select * from finish();
rollback;