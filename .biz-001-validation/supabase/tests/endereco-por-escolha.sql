-- Endereço por escolha de quem publica (migration 20260925174442).
--
-- Anúncio: `address` é opcional; quem anuncia grava, quem lê o anúncio lê o
-- endereço pela mesma porta (`private.can_read_listing`) — e quem não alcança
-- o anúncio não lê nada dele. Encontro: o local aceita endereço e instalação
-- militar; só o tamanho é limitado.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.listings (id, owner_user_id, kind, status, title, description, locality_id, neighborhood, category, price_cents, condition, address)
    values ('d1000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'item', 'active', 'Cadeira de balanço', 'Madeira maciça.', '00000000-0000-4000-8000-000000000001', 'Centro', 'outros', 15000, 'used', 'Rua das Flores, 123, apto 45')
  $$,
  'quem anuncia grava o endereço que quis publicar'
);

-- Migration 20260925175801: as telas publicam com INSERT … RETURNING id, e o
-- RETURNING passa pela policy de leitura. Antes da correção isto falhava.
select isnt_empty(
  $$
    insert into public.listings (owner_user_id, kind, status, title, description, locality_id, neighborhood, category, price_cents, condition, address)
    values ('10000000-0000-4000-8000-000000000001', 'item', 'draft', 'Rascunho novo', 'Descrição.', '00000000-0000-4000-8000-000000000001', 'Centro', 'outros', 100, 'used', 'Rua A, 1')
    returning id
  $$,
  'quem anuncia recebe o id do que acabou de criar (INSERT … RETURNING)'
);

select throws_ok(
  $$
    insert into public.listings (owner_user_id, kind, status, title, description, locality_id, neighborhood, category, price_cents, condition, address)
    values ('10000000-0000-4000-8000-000000000001', 'item', 'active', 'Mesa', 'Mesa.', '00000000-0000-4000-8000-000000000001', 'Centro', 'outros', 100, 'used', 'ab')
  $$,
  '23514',
  null,
  'endereço curto demais é recusado pelo banco'
);

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Churrasco', now() + interval '2 days', 'Rua das Flores, 123 — Condomínio Bela Vista')
  $$,
  'o local do encontro aceita endereço'
);

select lives_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at, venue)
    values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Formatura', now() + interval '2 days', 'Quartel General do Exército')
  $$,
  'o local do encontro aceita instalação militar'
);

-- Outro membro da mesma cidade lê o endereço junto com o anúncio.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select results_eq(
  $$ select address from public.listings where id = 'd1000000-0000-4000-8000-000000000001' $$,
  $$ values ('Rua das Flores, 123, apto 45'::text) $$,
  'quem lê o anúncio lê o endereço publicado'
);

-- Anúncio de comunidade: quem não é da comunidade não lê nem o endereço.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
insert into public.listings (id, owner_user_id, kind, status, title, description, community_id, neighborhood, category, price_cents, condition, address)
values ('d1000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'item', 'active', 'Berço da vila', 'Só da vila.', '70000000-0000-4000-8000-000000000001', 'Vila', 'outros', 100, 'used', 'Travessa da Vila, 7');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is_empty(
  $$ select address from public.listings where id = 'd1000000-0000-4000-8000-000000000002' $$,
  'quem não alcança o anúncio de comunidade não lê o endereço'
);

-- Quem não tem cidade não lê anúncio nenhum, com ou sem endereço.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select is_empty(
  $$ select address from public.listings where id = 'd1000000-0000-4000-8000-000000000001' $$,
  'quem não tem cidade não lê o endereço'
);

select * from finish();
rollback;
