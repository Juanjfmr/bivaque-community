-- RECON-028 — entrega do alerta de Moradia: caso positivo e negativo.
--
-- Prova, na camada onde a promessa pode falhar:
--   * o job grava UMA entrega por par (alerta, anúncio) e repetir não duplica;
--   * só anúncio de Moradia ATIVO, publicado depois da assinatura e alcançável
--     pelo dono gera entrega — item, pausado, antigo e fora do público ficam de fora;
--   * desligar `is_active` interrompe as entregas seguintes;
--   * excluir a assinatura remove as entregas e o que estava pendente no outbox;
--   * a preferência de canal é honrada pelo despachante do outbox (opt-out ⇒ skipped);
--   * a leitura das entregas é do dono do alerta, e o job não é executável pelo cliente.
--
-- pgTAP roda sem o seed de desenvolvimento; as fixtures abaixo são transacionais.

begin;

create extension if not exists pgtap with schema extensions;
select plan(38);

\ir fixtures/foundation.inc

-- Localidade 001 é a Manaus do baseline; member-one (001) tem membership nela.
insert into public.listings (
  id, owner_user_id, kind, status, title, description, locality_id, community_id,
  neighborhood, published_at
)
values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   'property', 'active', 'Apartamento novo em Águas Claras', null,
   '00000000-0000-4000-8000-000000000001', null, 'Águas Claras',
   '2026-09-02 12:00:00+00'),
  ('a0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
   'property', 'active', 'Imóvel de outra cidade', null,
   '00000000-0000-4000-8000-000000000002', null, 'Centro',
   '2026-09-02 12:00:00+00'),
  ('a0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002',
   'property', 'active', 'Imóvel antigo', null,
   '00000000-0000-4000-8000-000000000001', null, 'Águas Claras',
   '2026-08-01 12:00:00+00'),
  ('a0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002',
   'property', 'active', 'Venda em cidade alheia', null,
   '00000000-0000-4000-8000-000000000002', null, 'Centro',
   '2026-09-02 12:00:00+00'),
  ('a0000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002',
   'property', 'active', 'Venda na mesma cidade', null,
   '00000000-0000-4000-8000-000000000001', null, 'Águas Claras',
   '2026-09-02 12:00:00+00'),
  ('a0000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002',
   'item', 'active', 'Produto qualquer', null,
   '00000000-0000-4000-8000-000000000001', null, 'Águas Claras',
   '2026-09-02 12:00:00+00'),
  ('a0000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002',
   'property', 'paused', 'Anúncio pausado', null,
   '00000000-0000-4000-8000-000000000001', null, 'Águas Claras',
   '2026-09-02 12:00:00+00');

insert into public.property_details (
  listing_id, deal, property_type, rent_cents, condo_fee_cents, sale_price_cents, bedrooms
)
values
  ('a0000000-0000-4000-8000-000000000001', 'rent', 'apartment', 220000, 52000, null, 2),
  ('a0000000-0000-4000-8000-000000000002', 'rent', 'apartment', 200000, null, null, 2),
  ('a0000000-0000-4000-8000-000000000003', 'rent', 'apartment', 220000, null, null, 2),
  ('a0000000-0000-4000-8000-000000000004', 'sale', 'apartment', null, null, 300000, 2),
  ('a0000000-0000-4000-8000-000000000005', 'sale', 'apartment', null, null, 300000, 2),
  ('a0000000-0000-4000-8000-000000000008', 'rent', 'apartment', 220000, null, null, 2);

insert into public.listing_alerts (
  id, owner_user_id, name, kind, locality_id, neighborhood, deal, max_value_cents,
  min_bedrooms, is_active, created_at
)
values
  ('c0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Apartamentos em Águas Claras', 'property',
   '00000000-0000-4000-8000-000000000001', null, 'rent', 250000, 2, true,
   '2026-09-01 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   'Vendas sem cidade fixa', 'property',
   null, null, 'sale', null, null, true,
   '2026-09-01 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   'Assinatura desligada', 'property',
   '00000000-0000-4000-8000-000000000001', null, 'rent', null, null, false,
   '2026-09-01 00:00:00+00'),
  -- Alerta de outro dono (member-two) com teto impossível: existe para a prova
  -- negativa de leitura e não casa anúncio nenhum.
  ('c0000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002',
   'Alerta de outro dono', 'property',
   '00000000-0000-4000-8000-000000000001', null, 'rent', 100, null, true,
   '2026-09-01 00:00:00+00');

-- ---------------------------------------------------------------------------
-- Estrutura
-- ---------------------------------------------------------------------------

select ok(
  exists (
    select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'notification_type'
       and e.enumlabel = 'listing_alert'
  ),
  'o tipo de notificação do alerta existe'
);

select has_table('public', 'listing_alert_deliveries', 'a tabela de entrega existe');

select ok(
  exists (
    select 1
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'listing_alert_deliveries'
       and con.contype = 'u'
  ),
  'a entrega é única por par (alerta, anúncio)'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.listing_alert_deliveries'::regclass),
  true,
  'RLS habilitada nas entregas'
);

select is(
  (select relforcerowsecurity from pg_class where oid = 'public.listing_alert_deliveries'::regclass),
  true,
  'RLS forçada nas entregas'
);

select ok(
  not has_table_privilege('anon', 'public.listing_alert_deliveries', 'select'),
  'anon não lê entregas'
);

select ok(
  not has_function_privilege('authenticated', 'private.dispatch_listing_alerts(integer)', 'execute'),
  'o cliente não executa o job de entrega'
);

-- ---------------------------------------------------------------------------
-- Primeira execução: uma entrega por par, só do que casa e é autorizado
-- ---------------------------------------------------------------------------

select is(
  private.dispatch_listing_alerts(),
  2,
  'primeira execução cria exatamente duas entregas (P1 para A, P5 para C)'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where alert_id = 'c0000000-0000-4000-8000-000000000001'),
  1::bigint,
  'alerta A entrega o imóvel novo e autorizado'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where alert_id = 'c0000000-0000-4000-8000-000000000001'
      and listing_id = 'a0000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a entrega de A é o imóvel que casa o critério'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where listing_id = 'a0000000-0000-4000-8000-000000000002'),
  0::bigint,
  'imóvel de outra cidade não gera entrega'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where listing_id = 'a0000000-0000-4000-8000-000000000003'),
  0::bigint,
  'imóvel publicado antes da assinatura não é novo e não gera entrega'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where listing_id = 'a0000000-0000-4000-8000-000000000004'),
  0::bigint,
  'imóvel fora do público do dono não gera entrega'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where listing_id = 'a0000000-0000-4000-8000-000000000005'),
  1::bigint,
  'imóvel autorizado que casa o critério gera entrega'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where listing_id = 'a0000000-0000-4000-8000-000000000007'),
  0::bigint,
  'anúncio de item não gera alerta de moradia'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where listing_id = 'a0000000-0000-4000-8000-000000000008'),
  0::bigint,
  'anúncio pausado não gera entrega'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where alert_id = 'c0000000-0000-4000-8000-000000000003'),
  0::bigint,
  'assinatura desligada não gera entrega'
);

select is(
  (select count(*) from public.notifications where type = 'listing_alert'),
  2::bigint,
  'cada entrega enfileira um aviso in-app'
);

select is(
  (select count(*) from public.outbox
    where type = 'listing_alert' and status = 'pending'),
  2::bigint,
  'cada entrega enfileira um aviso no outbox'
);

-- ---------------------------------------------------------------------------
-- Idempotência
-- ---------------------------------------------------------------------------

select is(
  private.dispatch_listing_alerts(),
  0,
  'repetir a execução não cria segunda entrega'
);

select is(
  (select count(*) from public.listing_alert_deliveries),
  2::bigint,
  'o total de entregas continua o mesmo após repetir'
);

select throws_ok(
  $$
    insert into public.listing_alert_deliveries (alert_id, listing_id)
    values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001')
  $$,
  '23505',
  null,
  'a chave única recusa um segundo par igual'
);

-- ---------------------------------------------------------------------------
-- Imóvel novo depois: uma entrega; desligar interrompe a seguinte
-- ---------------------------------------------------------------------------

insert into public.listings (
  id, owner_user_id, kind, status, title, locality_id, neighborhood, published_at
)
values (
  'a0000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002',
  'property', 'active', 'Segundo imóvel novo', '00000000-0000-4000-8000-000000000001',
  'Águas Claras', '2026-09-03 12:00:00+00'
);

insert into public.property_details (
  listing_id, deal, property_type, rent_cents, bedrooms
)
values (
  'a0000000-0000-4000-8000-000000000006', 'rent', 'apartment', 230000, 3
);

select is(
  private.dispatch_listing_alerts(),
  1,
  'um imóvel novo posterior gera exatamente uma entrega'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where alert_id = 'c0000000-0000-4000-8000-000000000001'),
  2::bigint,
  'a assinatura A acumula duas entregas, uma por imóvel'
);

insert into public.listings (
  id, owner_user_id, kind, status, title, locality_id, neighborhood, published_at
)
values (
  'a0000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002',
  'property', 'active', 'Terceiro imóvel novo', '00000000-0000-4000-8000-000000000001',
  'Águas Claras', '2026-09-04 12:00:00+00'
);

insert into public.property_details (listing_id, deal, property_type, rent_cents, bedrooms)
values ('a0000000-0000-4000-8000-000000000009', 'rent', 'apartment', 230000, 3);

update public.listing_alerts
   set is_active = false
 where id = 'c0000000-0000-4000-8000-000000000001';

select is(
  private.dispatch_listing_alerts(),
  0,
  'desligar a assinatura interrompe a entrega seguinte'
);

select is(
  (select count(*) from public.listing_alert_deliveries
    where alert_id = 'c0000000-0000-4000-8000-000000000001'
      and listing_id = 'a0000000-0000-4000-8000-000000000009'),
  0::bigint,
  'o imóvel que chegou depois do desligamento não entra'
);

-- ---------------------------------------------------------------------------
-- Excluir remove assinatura, entregas e avisos pendentes
-- ---------------------------------------------------------------------------

select is(
  (select count(*) from public.outbox
    where type = 'listing_alert' and status = 'pending'),
  3::bigint,
  'há três avisos pendentes antes de excluir'
);

delete from public.listing_alerts where id = 'c0000000-0000-4000-8000-000000000002';

select is(
  (select count(*) from public.listing_alert_deliveries
    where alert_id = 'c0000000-0000-4000-8000-000000000002'),
  0::bigint,
  'excluir a assinatura remove as entregas dela'
);

select is(
  (select count(*) from public.outbox
    where type = 'listing_alert' and status = 'pending'),
  2::bigint,
  'excluir a assinatura remove o aviso pendente dela'
);

-- ---------------------------------------------------------------------------
-- Preferência de canal: o despachante do outbox é quem decide
-- ---------------------------------------------------------------------------

select ok(
  private.outbox_delivery_allowed(
    'email', 'member-one@example.invalid', 'listing_alert',
    '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb
  ),
  'sem opt-out a entrega por e-mail é permitida'
);

insert into public.notification_opt_outs (channel, recipient)
values ('email', 'member-one@example.invalid');

select ok(
  not private.outbox_delivery_allowed(
    'email', 'member-one@example.invalid', 'listing_alert',
    '{"user_id":"10000000-0000-4000-8000-000000000001"}'::jsonb
  ),
  'com opt-out a entrega por e-mail é barrada'
);

-- O outbox só considera a linha devida depois do intervalo de retry; recua o
-- relógio para observar o despachante decidindo.
update public.outbox
   set updated_at = now() - interval '10 minutes'
 where type = 'listing_alert' and status = 'pending';

select count(*) from private.outbox_prepare_due() as id;

select is(
  (select count(*) from public.outbox
    where type = 'listing_alert' and status = 'pending'),
  0::bigint,
  'nenhum aviso do alerta continua pendente após o despacho'
);

select is(
  (select count(*) from public.outbox
    where type = 'listing_alert' and status = 'skipped'),
  2::bigint,
  'os avisos barrados são marcados como skipped'
);

-- ---------------------------------------------------------------------------
-- Autorização: a leitura do alerta e da entrega é do dono
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.listing_alerts where id = 'c0000000-0000-4000-8000-000000000001' $$,
  'o dono lê a própria assinatura'
);

select isnt_empty(
  $$ select 1 from public.listing_alert_deliveries
      where alert_id = 'c0000000-0000-4000-8000-000000000001' $$,
  'o dono lê as entregas da própria assinatura'
);

select is_empty(
  $$ select 1 from public.listing_alerts where id = 'c0000000-0000-4000-8000-000000000004' $$,
  'assinatura de outro dono não aparece para quem não é dono'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$ select 1 from public.listing_alert_deliveries $$,
  'outro membro não lê entregas alheias'
);

update public.listing_alerts
   set is_active = true
 where id = 'c0000000-0000-4000-8000-000000000001';

reset role;

select is(
  (select is_active from public.listing_alerts
    where id = 'c0000000-0000-4000-8000-000000000001'),
  false,
  'outro membro não altera assinatura alheia'
);

select * from finish();

rollback;
