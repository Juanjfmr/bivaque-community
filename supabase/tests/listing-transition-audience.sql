-- Revisao da confirmacao de 2026-10-21 (alta) - transicao nao publica nem
-- reativa anuncio num publico do qual o dono nao participa.
--
-- `transition_listing` so conferia o dono. Um anuncio pausado ou em rascunho com
-- `locality_id`/`community_id` de um publico sem vinculo voltava a ficar visivel
-- por `publish`/`reactivate`, mesmo com a policy de escrita ja recusando o
-- INSERT/UPDATE direto. As acoes que tiram o anuncio do ar (pause, close)
-- continuam livres, para o dono sempre conseguir despublicar.
--
-- Fixtures: 001 tem vinculo com a cidade 0001 e participacao aprovada na
-- comunidade A; nao tem vinculo com a cidade 0002 nem com a comunidade B.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role postgres;

insert into public.listings (
  id, owner_user_id, kind, status, locality_id, community_id,
  category, title, description, price_cents, condition, neighborhood
)
values
  -- publico sem vinculo: cidade 0002
  (
    'b1000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'item', 'active', '00000000-0000-4000-8000-000000000002', null,
    'casa_moveis', 'Mesa em cidade sem vinculo', 'Anuncio pausado fora.', 10000, 'used', 'Centro'
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'item', 'draft', '00000000-0000-4000-8000-000000000002', null,
    'eletronicos', 'Rascunho em cidade sem vinculo', 'Rascunho fora.', 20000, 'used', 'Centro'
  ),
  -- publico sem vinculo: comunidade B (001 nao participa)
  (
    'b1000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'item', 'paused', null,
    'casa_moveis', 'Pausado em comunidade sem vinculo', 'Anuncio legado.', 30000, 'used', 'Centro'
  ),
  -- publico com vinculo: cidade 0001 e comunidade A
  (
    'b1000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'item', 'active', '00000000-0000-4000-8000-000000000001', null,
    'casa_moveis', 'Mesa na propria cidade', 'Anuncio com vinculo.', 40000, 'used', 'Centro'
  ),
  (
    'b1000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    'item', 'paused', null,
    'casa_moveis', 'Pausado na comunidade A', 'Anuncio legado com vinculo.', 50000, 'used', 'Centro'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ── cidade sem vinculo: publicar/reativar e recusado, tirar do ar nao ───────

select lives_ok(
  $$ select public.transition_listing('b1000000-0000-4000-8000-000000000001', 'pause') $$,
  'dono pausa o anuncio ativo mesmo sem vinculo com a cidade'
);

select throws_ok(
  $$ select public.transition_listing('b1000000-0000-4000-8000-000000000001', 'reactivate') $$,
  '42501',
  null,
  'sem vinculo com a cidade, reativar e recusado'
);

select is(
  (select status from public.listings where id = 'b1000000-0000-4000-8000-000000000001'),
  'paused'::public.listing_status,
  'o anuncio recusado continua pausado'
);

select throws_ok(
  $$ select public.transition_listing('b1000000-0000-4000-8000-000000000002', 'publish') $$,
  '42501',
  null,
  'sem vinculo com a cidade, publicar o rascunho e recusado'
);

select is(
  (select status from public.listings where id = 'b1000000-0000-4000-8000-000000000002'),
  'draft'::public.listing_status,
  'o rascunho recusado continua em rascunho'
);

select lives_ok(
  $$ select public.transition_listing('b1000000-0000-4000-8000-000000000001', 'close') $$,
  'dono encerra o anuncio mesmo sem vinculo com a cidade'
);

-- ── comunidade sem vinculo (legado) ─────────────────────────────────────────

select throws_ok(
  $$ select public.transition_listing('b1000000-0000-4000-8000-000000000003', 'reactivate') $$,
  '42501',
  null,
  'sem participacao na comunidade, reativar e recusado'
);

-- ── publico com vinculo: transicao normal ───────────────────────────────────

select is(
  public.transition_listing('b1000000-0000-4000-8000-000000000004', 'pause'),
  'paused'::public.listing_status,
  'dono pausa o anuncio na propria cidade'
);

select is(
  public.transition_listing('b1000000-0000-4000-8000-000000000004', 'reactivate'),
  'active'::public.listing_status,
  'dono com vinculo reativa o anuncio da propria cidade'
);

select is(
  public.transition_listing('b1000000-0000-4000-8000-000000000005', 'reactivate'),
  'active'::public.listing_status,
  'dono com participacao aprovada reativa o anuncio da comunidade'
);

select * from finish();
rollback;
