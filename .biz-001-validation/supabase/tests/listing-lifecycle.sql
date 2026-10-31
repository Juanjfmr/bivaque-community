begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- RECON-026 — ciclo de vida do anúncio. A transição é autorizada (só o dono),
-- idempotente (repetir não duplica evento) e auditável (cada mudança deixa uma
-- linha). Um UPDATE direto da coluna é negado. Casos positivos e negativos.

set local role postgres;

-- 001 = dono, membro da cidade 1 e da comunidade A (aprovado)
-- 002 = cidade 1, comunidade A pendente, comunidade B aprovado (não é dono)
insert into public.listings (
  id, owner_user_id, kind, status, locality_id, community_id,
  category, title, description, price_cents, condition, neighborhood
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'item', 'active', '00000000-0000-4000-8000-000000000001', null,
    'casa_moveis', 'Mesa de jantar', 'Mesa usada, sem detalhes.', 65000, 'used', 'Centro'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'item', 'draft', '00000000-0000-4000-8000-000000000001', null,
    'eletronicos', 'Rascunho de TV', 'Ainda não publicada.', 90000, 'used', 'Centro'
  );

-- ── grants: só a sessão autenticada executa a transição ──────────────────────

select ok(
  not has_function_privilege('anon', 'public.transition_listing(uuid, text)', 'execute'),
  'anon não executa transition_listing'
);

select ok(
  has_function_privilege('authenticated', 'public.transition_listing(uuid, text)', 'execute'),
  'authenticated executa transition_listing'
);

select ok(
  not has_table_privilege('authenticated', 'public.listing_status_events', 'insert'),
  'a trilha de auditoria não é escrevível direto pela sessão'
);

-- ── o dono transita ──────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.transition_listing('a1000000-0000-4000-8000-000000000001', 'pause'),
  'paused'::public.listing_status,
  'dono pausa o próprio anúncio ativo'
);

select is(
  (select count(*) from public.listing_status_events
    where listing_id = 'a1000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a pausa deixa exatamente um evento de auditoria'
);

-- idempotência: repetir a mesma transição não muda nada nem audita de novo
select is(
  public.transition_listing('a1000000-0000-4000-8000-000000000001', 'pause'),
  'paused'::public.listing_status,
  'pausar de novo é idempotente'
);

select is(
  (select count(*) from public.listing_status_events
    where listing_id = 'a1000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a repetição idempotente não duplica o evento'
);

-- ── não-dono é negado, inclusive sem interface ───────────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$ select public.transition_listing('a1000000-0000-4000-8000-000000000001', 'reactivate') $$,
  '42501',
  'only the listing owner can change its status',
  'não-dono não transita o anúncio alheio'
);

-- UPDATE direto da coluna status não passa pela guarda
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$ update public.listings set status = 'active'
      where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '42501',
  'listing status changes only through transition_listing',
  'UPDATE direto do status é negado para o próprio dono'
);

-- ── ação desconhecida é recusada ─────────────────────────────────────────────

select throws_ok(
  $$ select public.transition_listing('a1000000-0000-4000-8000-000000000001', 'explode') $$,
  '22023',
  null,
  'ação desconhecida é recusada'
);

-- ── pausado some da busca de terceiro, mas o dono continua enxergando ────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select is_empty(
  $$ select 1 from public.listings where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'membro da cidade não vê o anúncio pausado'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'o dono continua vendo o próprio anúncio pausado'
);

-- ── reativar devolve o anúncio à busca ───────────────────────────────────────

select is(
  public.transition_listing('a1000000-0000-4000-8000-000000000001', 'reactivate'),
  'active'::public.listing_status,
  'dono reativa o anúncio pausado'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select isnt_empty(
  $$ select 1 from public.listings where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'reativado, o anúncio volta à busca do membro da cidade'
);

-- ── reservar, vender e encerrar ──────────────────────────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  public.transition_listing('a1000000-0000-4000-8000-000000000001', 'reserve'),
  'reserved'::public.listing_status,
  'dono marca o anúncio como reservado'
);

select is(
  public.transition_listing('a1000000-0000-4000-8000-000000000001', 'sell'),
  'sold'::public.listing_status,
  'dono marca o anúncio reservado como vendido'
);

select is(
  public.transition_listing('a1000000-0000-4000-8000-000000000001', 'close'),
  'closed'::public.listing_status,
  'dono encerra o anúncio vendido'
);

select throws_ok(
  $$ select public.transition_listing('a1000000-0000-4000-8000-000000000001', 'reactivate') $$,
  '22023',
  null,
  'encerrado é terminal: reativar é recusado'
);

-- ── rascunho publica; venda exige item ───────────────────────────────────────

select is(
  public.transition_listing('a1000000-0000-4000-8000-000000000002', 'publish'),
  'active'::public.listing_status,
  'dono publica o próprio rascunho'
);

-- ── auditoria: histórico do dono; nenhum evento para terceiro ────────────────

select is(
  (select count(*) from public.listing_status_events
    where listing_id = 'a1000000-0000-4000-8000-000000000001'),
  5::bigint,
  'a trilha tem um evento por transição real (pause, reactivate, reserve, sell, close)'
);

select is(
  (select from_status from public.listing_status_events
    where listing_id = 'a1000000-0000-4000-8000-000000000001'
    order by id asc limit 1),
  'active'::public.listing_status,
  'o primeiro evento registra o estado de origem'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select is_empty(
  $$ select 1 from public.listing_status_events
      where listing_id = 'a1000000-0000-4000-8000-000000000001' $$,
  'terceiro não lê a trilha de auditoria alheia'
);

-- ── UPDATE direto de não-dono não altera nada ────────────────────────────────

update public.listings
   set status = 'active'
 where id = 'a1000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  (select status from public.listings where id = 'a1000000-0000-4000-8000-000000000001'),
  'closed'::public.listing_status,
  'o UPDATE direto do não-dono não mudou a situação'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select is(
  (select count(*) from public.listing_status_events
    where listing_id = 'a1000000-0000-4000-8000-000000000002'),
  1::bigint,
  'publicar o rascunho também deixa uma linha de auditoria'
);

select * from finish();
rollback;
