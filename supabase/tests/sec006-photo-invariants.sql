-- SEC-006 (reconferência de 2026-10-19) — invariantes de foto e escritas atômicas.
--
-- Cobre o que a tela não consegue garantir sozinha:
--   * posição única e faixa (teto) em `listing_photos` e `service_request_photos`;
--   * renumeração de duplicadas antigas sem apagar linhas;
--   * criação de Moradia em uma transação (rollback provado);
--   * troca de foto do Mercado em uma transação, com posse reconferida;
--   * vínculo do anexo do pedido idempotente por posição e com troca de formato.

begin;
create extension if not exists pgtap with schema extensions;
select plan(31);
\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- ── Fixtures de anúncio ─────────────────────────────────────────────────────

insert into public.listings (id, owner_user_id, kind, status, title, locality_id)
values (
  'a0000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  'property',
  'active',
  'SEC-006 invariantes',
  '00000000-0000-4000-8000-000000000001'
);

-- ── 1. Renumeração de duplicadas antigas ────────────────────────────────────

select ok(
  exists (
    select 1 from pg_constraint
     where conname = 'listing_photos_listing_position_unique'
       and conrelid = 'public.listing_photos'::regclass
       and contype = 'u'
  ),
  'listing_photos tem unicidade (listing_id, position)'
);

select ok(
  exists (
    select 1 from pg_constraint
     where conname = 'listing_photos_position_range'
       and conrelid = 'public.listing_photos'::regclass
       and contype = 'c'
  ),
  'listing_photos tem faixa de posição'
);

select ok(
  exists (
    select 1 from pg_constraint
     where conname = 'service_request_photos_position_range'
       and conrelid = 'public.service_request_photos'::regclass
       and contype = 'c'
  ),
  'service_request_photos tem faixa de posição'
);

-- Simula o estado anterior à constraint: três fotos, duas na posição 0.
alter table public.listing_photos
  drop constraint listing_photos_listing_position_unique;

insert into public.listing_photos (listing_id, path, position)
values
  ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000010/antiga-1.jpg', 0),
  ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000010/antiga-2.jpg', 0),
  ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000010/antiga-3.jpg', 2);

select private.renumber_listing_photos();

select results_eq(
  $$
    select position
      from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000010'
     order by position
  $$,
  $$ values (0), (1), (2) $$,
  'duplicadas antigas são renumeradas em ordem, sem buracos'
);

select is(
  (
    select count(*)::integer
      from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000010'
  ),
  3,
  'renumeração não apaga nenhuma foto'
);

alter table public.listing_photos
  add constraint listing_photos_listing_position_unique unique (listing_id, position);

delete from public.listing_photos
 where listing_id = 'a0000000-0000-4000-8000-000000000010';

-- ── 2. Posição única, faixa e teto nas escritas novas ───────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('a0000000-0000-4000-8000-000000000010',
            'a0000000-0000-4000-8000-000000000010/foto-0.jpg', 0)
  $$,
  'dono grava a primeira foto na posição 0'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('a0000000-0000-4000-8000-000000000010',
            'a0000000-0000-4000-8000-000000000010/repetida.jpg', 0)
  $$,
  '23505',
  null,
  'posição 0 repetida é recusada pelo banco'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('a0000000-0000-4000-8000-000000000010',
            'a0000000-0000-4000-8000-000000000010/negativa.jpg', -1)
  $$,
  '23514',
  null,
  'posição negativa é recusada'
);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values ('a0000000-0000-4000-8000-000000000010',
            'a0000000-0000-4000-8000-000000000010/acima.jpg', 12)
  $$,
  '23514',
  null,
  'posição 12 é recusada pelo teto'
);

select lives_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    select 'a0000000-0000-4000-8000-000000000010',
           'a0000000-0000-4000-8000-000000000010/foto-' || g || '.jpg',
           g
      from generate_series(1, 11) as g
  $$,
  'as posições 1 a 11 completam o teto de 12'
);

select is(
  (
    select count(*)::integer
      from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000010'
  ),
  12,
  'o anúncio fica com exatamente 12 fotos'
);

-- ── 3. Criação de Moradia em uma transação ──────────────────────────────────

select lives_ok(
  $$
    select public.create_property_listing(
      '{"status":"active","title":"Casa atômica","locality_id":"00000000-0000-4000-8000-000000000001"}'::jsonb,
      '{"deal":"rent","property_type":"house","rent_cents":200000,"bedrooms":2}'::jsonb
    )
  $$,
  'RPC cria anúncio e detalhe'
);

select isnt_empty(
  $$ select 1 from public.listings where title = 'Casa atômica' and kind = 'property' $$,
  'o anúncio da RPC existe'
);

select isnt_empty(
  $$
    select 1
      from public.property_details pd
      join public.listings l on l.id = pd.listing_id
     where l.title = 'Casa atômica'
       and pd.deal = 'rent'
       and pd.property_type = 'house'
  $$,
  'o detalhe da RPC existe na mesma transação'
);

select throws_ok(
  $$
    select public.create_property_listing(
      '{"status":"active","title":"Rollback SEC-006","locality_id":"00000000-0000-4000-8000-000000000001"}'::jsonb,
      '{"deal":"rent","property_type":"tipo_inexistente"}'::jsonb
    )
  $$,
  '22P02',
  null,
  'detalhe inválido aborta a RPC'
);

select is_empty(
  $$ select 1 from public.listings where title = 'Rollback SEC-006' $$,
  'o rollback não deixa anúncio sem detalhe'
);

-- ── 4. Troca transacional da foto do Mercado ────────────────────────────────

select is(
  cardinality(
    public.replace_listing_photo(
      'a0000000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-000000000010/trocada.jpg',
      0
    )
  ),
  12,
  'a troca devolve os 12 caminhos anteriores'
);

select is(
  (
    select count(*)::integer
      from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000010'
  ),
  1,
  'a troca deixa exatamente uma linha'
);

select is(
  (
    select path
      from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000010'
  ),
  'a0000000-0000-4000-8000-000000000010/trocada.jpg',
  'a linha restante aponta para a foto nova'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.replace_listing_photo(
      'a0000000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-000000000010/invasao.jpg',
      0
    )
  $$,
  '42501',
  null,
  'outro membro não troca a foto de anúncio alheio'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    select public.replace_listing_photo(
      'a0000000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-000000000099/fora.jpg',
      0
    )
  $$,
  '22023',
  null,
  'caminho fora da pasta do anúncio é recusado'
);

select throws_ok(
  $$
    select public.replace_listing_photo(
      'a0000000-0000-4000-8000-000000000010',
      'a0000000-0000-4000-8000-000000000010/fora-da-faixa.jpg',
      12
    )
  $$,
  '22023',
  null,
  'posição fora da faixa é recusada antes de apagar a linha'
);

select is(
  (
    select path
      from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000010'
  ),
  'a0000000-0000-4000-8000-000000000010/trocada.jpg',
  'a recusa conserva a foto anterior'
);

-- ── 5. Vínculo do anexo do pedido ───────────────────────────────────────────

-- Fixtures do prestador e do pedido são criadas como superusuário; a RPC roda
-- depois com o papel e a sessão do solicitante.
reset role;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000025', 'sec006-provider@example.invalid');
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
  'SEC-006 provider',
  'assistencia_tecnica'
);
insert into public.service_requests (
  id, requester_user_id, provider_id, provider_user_id, category, description
) values (
  'd0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000025',
  '10000000-0000-4000-8000-000000000025',
  'assistencia_tecnica',
  'Pedido sintético SEC-006'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.register_service_request_photo(
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001/0-primeira.jpg',
    0
  ),
  null::text,
  'a primeira foto não tem caminho anterior'
);

select is(
  (
    select photo_path
      from public.service_request_photos
     where request_id = 'd0000000-0000-4000-8000-000000000001'
       and position = 0
  ),
  'd0000000-0000-4000-8000-000000000001/0-primeira.jpg',
  'a linha do anexo aponta para o objeto enviado'
);

select is(
  public.register_service_request_photo(
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000001/0-segunda.png',
    0
  ),
  'd0000000-0000-4000-8000-000000000001/0-primeira.jpg',
  'o retry na mesma posição devolve o caminho anterior'
);

select is(
  (
    select photo_path
      from public.service_request_photos
     where request_id = 'd0000000-0000-4000-8000-000000000001'
       and position = 0
  ),
  'd0000000-0000-4000-8000-000000000001/0-segunda.png',
  'o retry JPEG para PNG atualiza a linha para o objeto novo'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  $$
    select public.register_service_request_photo(
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000001/0-invasao.jpg',
      0
    )
  $$,
  '42501',
  null,
  'outro membro não registra anexo no pedido alheio'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    select public.register_service_request_photo(
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000001/6-fora.jpg',
      6
    )
  $$,
  '22023',
  null,
  'posição 6 é recusada no pedido'
);

select throws_ok(
  $$
    select public.register_service_request_photo(
      'd0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000099/0-fora.jpg',
      0
    )
  $$,
  '22023',
  null,
  'caminho fora da pasta do pedido é recusado'
);

select is(
  (
    select count(*)::integer
      from public.service_request_photos
     where request_id = 'd0000000-0000-4000-8000-000000000001'
  ),
  1,
  'o pedido mantém uma linha por posição'
);

reset role;
select * from finish();
rollback;
