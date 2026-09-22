-- RECON-027 — anúncio de Moradia: leitura por público e escrita do dono.
--
-- Prova positiva e negativa da única porta de leitura (`private.can_read_listing`),
-- nas três superfícies: a linha do anúncio, o satélite property_details e as fotos
-- (linha e objeto do bucket privado listing-photos). Um anúncio fora do público
-- não é legível nem por chamada direta sem UI.

begin;

create extension if not exists pgtap with schema extensions;
select plan(32);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- 1. O bucket de fotos de anúncio é privado e segue o contrato de mídia (10MB).
select results_eq(
  $$
    select public, file_size_limit, allowed_mime_types
      from storage.buckets
     where id = 'listing-photos'
  $$,
  $$ values (
       false,
       10485760::bigint,
       array['image/jpeg', 'image/png', 'image/webp']::text[]
     ) $$,
  'listing-photos é privado e limitado ao contrato de imagem aprovado'
);

-- Fixtures de anúncio criadas como superusuário (RLS não se aplica a ele).
insert into public.listings (id, owner_user_id, kind, status, title, description, locality_id, community_id, neighborhood, category, price_cents, condition)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'property', 'draft', 'Rascunho do dono', null,
    '00000000-0000-4000-8000-000000000001', null, 'Águas Claras', null, null, null
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'property', 'active', 'Apartamento de 2 quartos', 'Sala integrada à varanda.',
    '00000000-0000-4000-8000-000000000001', null, 'Águas Claras', null, null, null
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'property', 'active', 'Casa na vila', 'Quintal amplo.',
    null, '70000000-0000-4000-8000-000000000001', 'Vila Ajuricaba', null, null, null
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'item', 'active', 'Item sem imóvel', 'Descrição do item.',
    '00000000-0000-4000-8000-000000000001', null, 'Águas Claras', 'outros', 1000, 'used'
  );

-- D6: IPTU ausente é NULL — nunca 0, nunca somado.
insert into public.property_details (
  listing_id, deal, property_type, rent_cents, condo_fee_cents, iptu_cents,
  bedrooms, suites, parking_spots, area_m2, amenities, available_from
)
values (
  'a0000000-0000-4000-8000-000000000002',
  'rent', 'apartment', 220000, 35000, null,
  2, 1, 1, 62.00, array['Piscina', 'Academia'], '2026-10-01'
);

insert into public.listing_photos (id, listing_id, path, position)
values (
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000002/foto-1.webp',
  0
);

insert into storage.objects (bucket_id, name, owner)
values (
  'listing-photos',
  'a0000000-0000-4000-8000-000000000002/foto-1.webp',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.listing_alerts (id, owner_user_id, name, locality_id, deal, max_value_cents, min_bedrooms)
values (
  'c0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Apartamentos em Águas Claras',
  '00000000-0000-4000-8000-000000000001',
  'rent', 250000, 2
);

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Dono (member-one)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.listings (
      owner_user_id, kind, status, title, locality_id
    ) values (
      '10000000-0000-4000-8000-000000000001',
      'property', 'active', 'Anúncio novo do dono',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  'dono cria anúncio com a própria autoria'
);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'dono vê o próprio rascunho'
);
select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000002' $$,
  'dono vê o próprio anúncio ativo'
);
select isnt_empty(
  $$ select 1 from public.listing_alerts where id = 'c0000000-0000-4000-8000-000000000001' $$,
  'dono vê o próprio alerta'
);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'listing-photos',
      'a0000000-0000-4000-8000-000000000002/foto-2.webp',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'dono envia foto para a própria pasta do anúncio'
);

-- ---------------------------------------------------------------------------
-- member-two: membro da cidade, membership PENDENTE na comunidade A.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'rascunho alheio não é visível para outro membro'
);
select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000002' $$,
  'membro da cidade vê anúncio ativo de público cidade'
);
select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'membership pendente na comunidade não vê anúncio de público comunidade'
);
select isnt_empty(
  $$ select 1 from public.property_details where listing_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'membro no público vê os detalhes do imóvel'
);
select isnt_empty(
  $$ select 1 from public.listing_photos where listing_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'membro no público vê a linha de foto'
);
select isnt_empty(
  $$
    select 1 from storage.objects
     where bucket_id = 'listing-photos'
       and name = 'a0000000-0000-4000-8000-000000000002/foto-1.webp'
  $$,
  'membro no público lê o objeto da foto'
);
select is_empty(
  $$ select 1 from public.listing_alerts where id = 'c0000000-0000-4000-8000-000000000001' $$,
  'alerta alheio não é visível'
);
select throws_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, locality_id)
    values (
      '10000000-0000-4000-8000-000000000001',
      'property', 'active', 'Anúncio em nome alheio',
      '00000000-0000-4000-8000-000000000001'
    )
  $$,
  '42501',
  null,
  'não é possível publicar anúncio em nome de outra conta'
);
-- A policy de UPDATE/DELETE é `using`: para quem não é dono nenhuma linha é
-- alcançada. A negação se prova por zero linhas afetadas, não por exceção.
select is_empty(
  $$
    update public.listings
       set title = 'Editado por terceiro'
     where id = 'a0000000-0000-4000-8000-000000000002'
    returning id
  $$,
  'terceiro não edita anúncio alheio'
);
select is_empty(
  $$ delete from public.listings where id = 'a0000000-0000-4000-8000-000000000002' returning id $$,
  'terceiro não apaga anúncio alheio'
);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'listing-photos',
      'a0000000-0000-4000-8000-000000000002/invasao.webp',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  null,
  'terceiro não envia foto para a pasta de outro anúncio'
);

-- ---------------------------------------------------------------------------
-- other-locality: fora da cidade e fora da comunidade.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000002' $$,
  'membro de outra cidade não vê anúncio de público cidade'
);
select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'não membro não vê anúncio de público comunidade'
);
select is_empty(
  $$ select 1 from public.property_details where listing_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'detalhes do imóvel não vazam para fora do público'
);
select is_empty(
  $$ select 1 from public.listing_photos where listing_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'linha de foto não vaza para fora do público'
);
select is_empty(
  $$
    select 1 from storage.objects
     where bucket_id = 'listing-photos'
       and name = 'a0000000-0000-4000-8000-000000000002/foto-1.webp'
  $$,
  'objeto da foto não vaza para fora do público'
);

-- ---------------------------------------------------------------------------
-- Membro aprovado na comunidade A vê o anúncio de público comunidade.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'membro aprovado vê anúncio de público comunidade'
);

-- ---------------------------------------------------------------------------
-- Sem membership: não vê nada.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000002' $$,
  'conta sem membership não vê anúncio de público cidade'
);
select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'conta sem membership não vê anúncio de público comunidade'
);

-- ---------------------------------------------------------------------------
-- Regras estruturais com o dono autenticado.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$
    update public.listings
       set locality_id = null,
           community_id = '70000000-0000-4000-8000-000000000001'
     where id = 'a0000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'público do anúncio é imutável depois de criado'
);

select results_eq(
  $$
    select iptu_cents from public.property_details
     where listing_id = 'a0000000-0000-4000-8000-000000000002'
  $$,
  $$ values (null::integer) $$,
  'custo não informado permanece NULL, nunca vira zero'
);

select throws_ok(
  $$
    insert into public.property_details (listing_id, deal, property_type, rent_cents)
    values ('a0000000-0000-4000-8000-000000000004', 'rent', 'apartment', 100000)
  $$,
  '23514',
  null,
  'detalhe de imóvel só existe para anúncio de tipo property'
);

-- ---------------------------------------------------------------------------
-- Salvar anúncio: só o próprio, e só o que se alcança.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$
    insert into public.listing_saves (listing_id, user_id)
    values (
      'a0000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000002'
    )
  $$,
  'membro no público salva o anúncio que consegue ler'
);
select isnt_empty(
  $$ select 1 from public.listing_saves where listing_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'membro vê o próprio salvamento'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$
    insert into public.listing_saves (listing_id, user_id)
    values (
      'a0000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
  $$,
  '42501',
  null,
  'conta fora do público não salva anúncio que não alcança'
);
select is_empty(
  $$ select 1 from public.listing_saves where listing_id = 'a0000000-0000-4000-8000-000000000002' $$,
  'salvamento alheio não é visível'
);

reset role;
select * from finish();
rollback;
