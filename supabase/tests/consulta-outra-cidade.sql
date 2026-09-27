-- Consulta a outra cidade (migration 20260925161111_consulta_outra_cidade).
--
-- Membro verificado de uma cidade LÊ o que é público de outra: catálogo,
-- Guia aprovado e artigo publicado, encontro de alcance cidade, anúncio ativo
-- de alcance cidade (linha, detalhe de imóvel e foto). E só lê: não confirma
-- presença, não vê quem vai, não vê rascunho nem anúncio de comunidade, não vê
-- encontro de comunidade. Quem não tem cidade (não verificado) não consulta.
--
-- Cidade A = 00000000-…-0001 (member-one, dono de tudo aqui).
-- Cidade B = 00000000-…-0002 (other-locality: o visitante).
-- non-member (…-0005) não tem cidade nenhuma.

begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Fixtures da cidade A, criadas como superusuário (RLS não se aplica a ele).
insert into public.arrival_guide_entries (id, locality_id, category, name, status)
values
  ('c1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'school', 'Escola aprovada', 'approved'),
  ('c1000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'school', 'Escola pendente', 'pending'),
  ('c1000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'hospital', 'Hospital aprovado', 'approved');

insert into public.guide_articles (id, entry_id, title, status)
values
  ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Como chegar', 'published'),
  ('c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000003', 'Rascunho do guia', 'draft');

insert into public.events (id, organizer_id, locality_id, community_id, title, starts_at)
values
  ('c3000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', null, 'Encontro da cidade', now() + interval '3 days'),
  ('c3000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'Encontro da vila', now() + interval '3 days');

insert into public.event_rsvps (event_id, user_id, status, occurrence_date)
values ('c3000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'going', (now() + interval '3 days')::date);

insert into public.listings (id, owner_user_id, kind, status, title, description, locality_id, community_id, neighborhood, category, price_cents, condition)
values
  ('c4000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'property', 'active', 'Apartamento da cidade A', null, '00000000-0000-4000-8000-000000000001', null, 'Centro', null, null, null),
  ('c4000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'property', 'draft', 'Rascunho da cidade A', null, '00000000-0000-4000-8000-000000000001', null, 'Centro', null, null, null),
  ('c4000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'item', 'active', 'Item da vila', 'Só da vila.', null, '70000000-0000-4000-8000-000000000001', 'Vila', 'outros', 1000, 'used'),
  ('c4000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'item', 'active', 'Berço da cidade A', 'Pouco uso.', '00000000-0000-4000-8000-000000000001', null, 'Centro', 'outros', 25000, 'used');

insert into public.property_details (listing_id, deal, property_type, rent_cents)
values ('c4000000-0000-4000-8000-000000000001', 'rent', 'apartment', 180000);

insert into public.listing_photos (id, listing_id, path, position)
values ('c5000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000001/capa.webp', 0);

insert into public.listing_photos (id, listing_id, path, position)
values ('c5000000-0000-4000-8000-000000000002', 'c4000000-0000-4000-8000-000000000003', 'c4000000-0000-4000-8000-000000000003/vila.webp', 0);

insert into storage.objects (bucket_id, name, owner)
values
  ('listing-photos', 'c4000000-0000-4000-8000-000000000001/capa.webp', '10000000-0000-4000-8000-000000000001'),
  ('listing-photos', 'c4000000-0000-4000-8000-000000000003/vila.webp', '10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ── O visitante: membro verificado da cidade B ─────────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select results_eq(
  $$ select city_name from public.localities where id = '00000000-0000-4000-8000-000000000002' $$,
  $$ values ('Fixture City'::text) $$,
  'o visitante continua lendo a própria cidade'
);
select isnt_empty(
  $$ select 1 from public.localities where id = '00000000-0000-4000-8000-000000000001' $$,
  'o visitante lê o nome de outra cidade do catálogo'
);
select results_eq(
  $$ select name from public.arrival_guide_entries where id::text like 'c1000000-%' order by name $$,
  $$ values ('Escola aprovada'::text), ('Hospital aprovado'::text) $$,
  'o visitante lê o Guia aprovado de outra cidade, e só o aprovado'
);
select results_eq(
  $$ select title from public.guide_articles where id in ('c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002') $$,
  $$ values ('Como chegar'::text) $$,
  'o visitante lê o artigo publicado, não o rascunho'
);
select results_eq(
  $$ select title from public.events where id::text like 'c3000000-%' $$,
  $$ values ('Encontro da cidade'::text) $$,
  'o visitante lê o encontro de alcance cidade, não o da vila'
);
select is_empty(
  $$ select 1 from public.event_rsvps where event_id = 'c3000000-0000-4000-8000-000000000001' $$,
  'o visitante não vê quem vai ao encontro'
);
select throws_ok(
  $$
    insert into public.event_rsvps (event_id, user_id, status, occurrence_date)
    values ('c3000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'going', (now() + interval '3 days')::date)
  $$,
  '42501',
  null,
  'o visitante não confirma presença em encontro de outra cidade'
);
select results_eq(
  $$ select title from public.listings where id::text like 'c4000000-%' order by title $$,
  $$ values ('Apartamento da cidade A'::text), ('Berço da cidade A'::text) $$,
  'o visitante lê anúncio ativo de alcance cidade, não o rascunho'
);
select is_empty(
  $$ select 1 from public.listings where id = 'c4000000-0000-4000-8000-000000000003' $$,
  'o visitante não lê anúncio de alcance comunidade'
);
select is_empty(
  $$
    select 1 from public.listing_photos where listing_id = 'c4000000-0000-4000-8000-000000000003'
    union all
    select 1 from storage.objects where name = 'c4000000-0000-4000-8000-000000000003/vila.webp'
  $$,
  'a foto de anúncio de comunidade continua fechada a quem consulta'
);
select is_empty(
  $$ select 1 from public.listings where status <> 'active' and owner_user_id <> (select auth.uid()) $$,
  'quem consulta nunca vê rascunho alheio'
);
select isnt_empty(
  $$ select 1 from public.property_details where listing_id = 'c4000000-0000-4000-8000-000000000001' $$,
  'o visitante lê o detalhe do imóvel consultado'
);
select isnt_empty(
  $$ select 1 from public.listing_photos where listing_id = 'c4000000-0000-4000-8000-000000000001' $$,
  'o visitante lê a linha da foto do imóvel consultado'
);
select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'listing-photos' and name = 'c4000000-0000-4000-8000-000000000001/capa.webp' $$,
  'o visitante alcança o objeto da foto no bucket privado'
);
select throws_ok(
  $$
    insert into public.events (organizer_id, locality_id, title, starts_at)
    values ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Invasão', now() + interval '1 day')
  $$,
  '42501',
  null,
  'o visitante não publica encontro em outra cidade'
);
select is_empty(
  $$ update public.listings set title = 'Alterado' where id = 'c4000000-0000-4000-8000-000000000004' returning id $$,
  'o visitante não altera anúncio de outra cidade'
);

-- ── Sem cidade (não verificado): não consulta nada ────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select is_empty(
  $$ select 1 from public.localities where id = '00000000-0000-4000-8000-000000000001' $$,
  'quem não tem cidade não lê o catálogo pela Data API'
);
select is_empty(
  $$
    select 1 from public.arrival_guide_entries where locality_id = '00000000-0000-4000-8000-000000000001'
    union all
    select 1 from public.events where locality_id = '00000000-0000-4000-8000-000000000001'
  $$,
  'quem não tem cidade não lê Guia nem encontro'
);
select is_empty(
  $$ select 1 from public.listings where locality_id = '00000000-0000-4000-8000-000000000001' $$,
  'quem não tem cidade não lê anúncio'
);

select * from finish();
rollback;
