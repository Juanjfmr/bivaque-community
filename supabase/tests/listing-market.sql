begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- RECON-025 / RECON-039 — Mercado sobre o domínio canônico de `listings`
-- (migration 20260911043053). O anúncio só aparece para quem alcança o público,
-- o dono vê o próprio, a foto herda o acesso do anúncio e o interesse reusa a
-- conversa contextual de forma idempotente. Casos positivos e negativos.
--
-- Diferenças do schema: a coluna de dono é `owner_user_id`; o público é derivado
-- de qual FK está preenchida (`locality_id` exclusivo de `community_id`), sem
-- `audience_type`; a foto guarda `path`; `condition` tem dois valores; e o
-- `item` exige categoria, descrição, preço, bairro e condição no banco.

set local role postgres;

-- Público do cenário:
--   001 = dono, membro da cidade 1 e da comunidade A (aprovado)
--   002 = cidade 1, comunidade A pendente, comunidade B aprovado
--   003 = outra cidade (locality 2)
--   004 = cidade 1, comunidade A aprovado (não é de B)
--   005 = sem cidade e sem comunidade
insert into public.listings (
  id, owner_user_id, kind, status, locality_id, community_id,
  category, title, description, price_cents, condition, neighborhood
)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'item', 'active', '00000000-0000-4000-8000-000000000001', null,
    'casa_moveis', 'Mesa de jantar', 'Mesa usada, sem detalhes.', 65000, 'used', 'Centro'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'item', 'draft', '00000000-0000-4000-8000-000000000001', null,
    'eletronicos', 'Rascunho de TV', 'Ainda não publicada.', 90000, 'used', 'Centro'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'item', 'active', null, '70000000-0000-4000-8000-000000000001',
    'esporte', 'Bicicleta aro 29', 'Bicicleta da vila.', 120000, 'new', 'Vila'
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000003',
    'item', 'active', '00000000-0000-4000-8000-000000000002', null,
    'infantil', 'Carrinho de bebê', 'Item da outra cidade.', 40000, 'used', 'Bairro X'
  ),
  (
    'a0000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'item', 'active', null, '70000000-0000-4000-8000-000000000002',
    'outros', 'Furadeira', 'Item da comunidade B.', 20000, 'used', 'Vila Viz'
  );

-- ── alcance de leitura: quem alcança o público vê, quem não alcança não vê ────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '002 vê o anúncio ativo da própria cidade'
);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000002' $$,
  '002 não vê o rascunho alheio'
);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '002 não vê o anúncio da comunidade A, onde o pedido está pendente'
);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000005' $$,
  '002 vê o anúncio da comunidade B, onde é aprovado'
);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000004' $$,
  '002 não vê o anúncio de outra cidade'
);

-- 004 = aprovado na comunidade A, não em B, e morador da cidade 1
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '004 vê o anúncio da comunidade A, onde é aprovado'
);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000005' $$,
  '004 não vê o anúncio da comunidade B'
);

-- 003 = outra cidade
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000004' $$,
  '003 vê o anúncio da própria cidade'
);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '003 não vê o anúncio de cidade alheia'
);

-- 005 = sem cidade nem comunidade
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '005 (sem vínculo) não vê anúncio de cidade'
);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000003' $$,
  '005 (sem vínculo) não vê anúncio de comunidade'
);

-- dono vê o próprio rascunho
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000002' $$,
  'o dono vê o próprio rascunho'
);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000004' $$,
  'o dono não vê o anúncio de terceiro fora do alcance'
);

-- ── escrita: dono conferido no servidor, item exige campos no banco ──────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.listings (
      owner_user_id, kind, status, locality_id, category, title, description,
      price_cents, condition, neighborhood
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      'item', 'active', '00000000-0000-4000-8000-000000000001',
      'outros', 'Anúncio forjado', 'Tentativa de postar em nome de outro.', 1000,
      'used', 'Centro'
    )
  $$,
  42501,
  null,
  'ninguém cria anúncio com owner_user_id de terceiro'
);

select throws_ok(
  $$
    insert into public.listings (
      owner_user_id, kind, status, locality_id, category, title, description,
      price_cents, condition, neighborhood
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      'item', 'active', '00000000-0000-4000-8000-000000000001',
      null, 'Item sem categoria', 'A obrigatoriedade não pode sumir.', 1000,
      'used', 'Centro'
    )
  $$,
  23514,
  null,
  'item sem categoria é recusado pelo banco, não só pela tela'
);

select lives_ok(
  $$
    insert into public.listings (
      owner_user_id, kind, status, locality_id, category, title, description,
      price_cents, condition, neighborhood
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      'item', 'active', '00000000-0000-4000-8000-000000000001',
      'outros', 'Item do morador', 'Publicado para a própria cidade.', 1000,
      'used', 'Centro'
    )
  $$,
  'morador publica item para a própria cidade'
);

select lives_ok(
  $$
    insert into public.listings (
      owner_user_id, kind, status, community_id, category, title, description,
      price_cents, condition, neighborhood
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      'item', 'active', '70000000-0000-4000-8000-000000000002',
      'outros', 'Item da comunidade B', 'Aprovado na comunidade B.', 1000,
      'used', 'Vila Viz'
    )
  $$,
  'membro aprovado publica item na comunidade'
);

-- ── edição: público imutável, dono imutável ──────────────────────────────────

select is_empty(
  $$
    update public.listings
       set title = 'Invadido'
     where id = 'a0000000-0000-4000-8000-000000000001'
    returning id
  $$,
  'não-dono não altera anúncio alheio'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    update public.listings
       set community_id = '70000000-0000-4000-8000-000000000001',
           locality_id = null
     where id = 'a0000000-0000-4000-8000-000000000001'
  $$,
  42501,
  null,
  'público do anúncio é imutável depois de criado'
);

select lives_ok(
  $$
    update public.listings
       set title = 'Mesa de jantar restaurada'
     where id = 'a0000000-0000-4000-8000-000000000001'
  $$,
  'dono edita o próprio anúncio'
);

select results_eq(
  $$
    select title from public.listings where id = 'a0000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Mesa de jantar restaurada'::text) $$,
  'a edição do dono persiste'
);

-- ── fotos: o acesso herda o do anúncio ───────────────────────────────────────

select lives_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values (
      'a0000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001/foto-0.jpg',
      0
    )
  $$,
  'dono adiciona foto ao próprio anúncio'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.listing_photos (listing_id, path, position)
    values (
      'a0000000-0000-4000-8000-000000000001',
      'a0000000-0000-4000-8000-000000000001/foto-1.jpg',
      1
    )
  $$,
  42501,
  null,
  'não-dono não adiciona foto ao anúncio alheio'
);

select isnt_empty(
  $$
    select 1 from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000001'
  $$,
  'morador que alcança o anúncio vê a foto'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$
    select 1 from public.listing_photos
     where listing_id = 'a0000000-0000-4000-8000-000000000001'
  $$,
  'quem não alcança o anúncio não vê a foto'
);

-- ── storage: leitura derivada do anúncio, escrita só do dono ─────────────────

set local role postgres;
insert into storage.objects (id, bucket_id, name, owner, metadata)
values (
  'b0000000-0000-4000-8000-000000000001',
  'listing-photos',
  'a0000000-0000-4000-8000-000000000001/foto-0.jpg',
  '10000000-0000-4000-8000-000000000001',
  '{"mimetype":"image/jpeg","size":100}'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from storage.objects where id = 'b0000000-0000-4000-8000-000000000001' $$,
  'morador que alcança o anúncio lê o objeto privado'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'listing-photos',
      'a0000000-0000-4000-8000-000000000001/intruso.jpg',
      '10000000-0000-4000-8000-000000000002',
      '{"mimetype":"image/jpeg","size":100}'
    )
  $$,
  42501,
  null,
  'não-dono não escreve no objeto do anúncio alheio'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from storage.objects where id = 'b0000000-0000-4000-8000-000000000001' $$,
  'quem não alcança o anúncio não lê o objeto'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'listing-photos',
      'a0000000-0000-4000-8000-000000000001/clone.jpg',
      '10000000-0000-4000-8000-000000000003',
      '{"mimetype":"image/jpeg","size":100}'
    )
  $$,
  42501,
  null,
  'estranho não escreve em objeto de anúncio que não alcança'
);

-- ── interesse: conversa contextual idempotente ───────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.open_conversation(
      '10000000-0000-4000-8000-000000000001',
      'listing',
      'a0000000-0000-4000-8000-000000000001'
    )
  $$,
  'interessado abre a conversa do anúncio'
);

select lives_ok(
  $$
    select public.open_conversation(
      '10000000-0000-4000-8000-000000000001',
      'listing',
      'a0000000-0000-4000-8000-000000000001'
    )
  $$,
  'segundo clique reencontra a conversa sem erro'
);

select results_eq(
  $$
    select count(*)
      from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000002'
  $$,
  array[1::bigint],
  'nunca existem duas conversas para o mesmo interesse'
);

-- dono não conversa consigo mesmo
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.open_conversation(
      '10000000-0000-4000-8000-000000000002',
      'listing',
      'a0000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'dono não demonstra interesse no próprio anúncio'
);

-- quem não alcança não abre conversa
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.open_conversation(
      '10000000-0000-4000-8000-000000000001',
      'listing',
      'a0000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'quem não alcança o público não abre conversa'
);

-- rascunho não recebe interesse
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.open_conversation(
      '10000000-0000-4000-8000-000000000001',
      'listing',
      'a0000000-0000-4000-8000-000000000002'
    )
  $$,
  42501,
  null,
  'rascunho não aceita interesse'
);

-- ── pausar: sai da busca de terceiros (transição é via servidor) ─────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.transition_listing('a0000000-0000-4000-8000-000000000001', 'pause')
  $$,
  'dono pausa o próprio anúncio'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.listings where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'anúncio pausado some da busca de terceiros'
);

select * from finish();
rollback;
