-- SEC-006: only sanitized server uploads may write user image buckets.
--
-- Correções feitas ao rascunho deste teste (2026-10-19), todas de forma, nenhuma
-- de contrato:
--   * plan(42) não fechava com os 43 casos escritos;
--   * cada função de teste precisa de uma instrução própria. Combiná-la com
--     `set_config` no mesmo SELECT faz o valor do TAP sair como segunda coluna e
--     o pg_prove não o enxerga, o que produzia "tests out of sequence" e escondia
--     os 18 primeiros casos;
--   * o visitante de outra localidade lê `listing-photos` de anúncio ativo por
--     desenho (ADR de consulta a outra cidade). A leitura existente é preservada,
--     então o caso prova que ela continua valendo em vez de exigir negação.
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);
\ir fixtures/foundation.inc
\ir fixtures/communities.inc

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000025', 'image-provider@example.invalid');
insert into public.provider_accounts (auth_user_id, invited_by, locality_id)
values ('10000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001');
insert into public.provider_profiles (id, owner_user_id, display_name, category)
values ('30000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000025',
  'Image provider', 'assistencia_tecnica');
insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values ('30000000-0000-4000-8000-000000000025', 'locality',
  '00000000-0000-4000-8000-000000000001', 'free');
insert into public.listings (id, owner_user_id, kind, status, title, locality_id)
values ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  'property', 'active', 'Image fixture', '00000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.image_request', public.create_service_request(
  '30000000-0000-4000-8000-000000000025', 'Synthetic image request', null, 'image-test')::text, true);
reset role;

create temporary table image_cases (bucket text, path text, actor uuid);
insert into image_cases values
  ('avatars', '10000000-0000-4000-8000-000000000001/security.jpg', '10000000-0000-4000-8000-000000000001'),
  ('event-photos', 'security-event.jpg', '10000000-0000-4000-8000-000000000001'),
  ('listing-photos', 'a0000000-0000-4000-8000-000000000001/security.jpg', '10000000-0000-4000-8000-000000000001'),
  ('community-images', '70000000-0000-4000-8000-000000000001/banner', '10000000-0000-4000-8000-000000000001'),
  ('provider-photos', '30000000-0000-4000-8000-000000000025/portfolio/security.jpg', '10000000-0000-4000-8000-000000000025'),
  ('service-request-photos', current_setting('test.image_request') || '/security.jpg', '10000000-0000-4000-8000-000000000001');
grant select on image_cases to authenticated, anon, service_role;

insert into storage.objects (bucket_id, name, owner)
select bucket, path, actor from image_cases;
insert into public.posts (locality_id, user_id, post_type, content, photo_path)
values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  'photo', 'Synthetic image post', 'security-event.jpg');
update public.communities set banner_path = '70000000-0000-4000-8000-000000000001/banner'
where id = '70000000-0000-4000-8000-000000000001';

-- ── Objeto gravado pela service role: owner nulo ────────────────────────────
-- O upload das actions usa service_role, que não carrega o `sub` do usuário;
-- `storage.objects.owner` fica nulo. As leituras esperadas não podem depender
-- do owner para continuar funcionando.
set local role service_role;
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('avatars', '10000000-0000-4000-8000-000000000001/server-null.jpg', null) $$,
  'avatars: service_role stores with null owner');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('listing-photos', 'a0000000-0000-4000-8000-000000000001/server-null.jpg', null) $$,
  'listing-photos: service_role stores with null owner');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner) values
       ('service-request-photos', %L, null) $$,
    current_setting('test.image_request') || '/server-null.jpg'),
  'service-request-photos: service_role stores with null owner');
reset role;

-- ── INSERT: o cliente autenticado não escreve direto ────────────────────────
-- Owners, caminhos e escopos válidos: uma recusa por caminho malformado não
-- provaria a correção.
set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('avatars', '10000000-0000-4000-8000-000000000001/security.jpg.direct',
        '10000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'avatars: authenticated cannot INSERT directly');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('event-photos', 'security-event.jpg.direct',
        '10000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'event-photos: authenticated cannot INSERT directly');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('listing-photos', 'a0000000-0000-4000-8000-000000000001/security.jpg.direct',
        '10000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'listing-photos: authenticated cannot INSERT directly');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('community-images', '70000000-0000-4000-8000-000000000001/banner.direct',
        '10000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'community-images: authenticated cannot INSERT directly');
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name, owner) values
       ('service-request-photos', %L, '10000000-0000-4000-8000-000000000001') $$,
    current_setting('test.image_request') || '/security.jpg.direct'),
  '42501', null, 'service-request-photos: authenticated cannot INSERT directly');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000025', true);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('provider-photos', '30000000-0000-4000-8000-000000000025/portfolio/security.jpg.direct',
        '10000000-0000-4000-8000-000000000025') $$,
  '42501', null, 'provider-photos: authenticated cannot INSERT directly');

-- ── UPDATE: o cliente autenticado não sobrescreve bytes/metadados ───────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is_empty(
  $$ update storage.objects set metadata = '{"direct":true}'::jsonb
      where bucket_id = 'avatars'
        and name = '10000000-0000-4000-8000-000000000001/security.jpg'
      returning name $$,
  'avatars: authenticated cannot UPDATE directly');
select is_empty(
  $$ update storage.objects set metadata = '{"direct":true}'::jsonb
      where bucket_id = 'event-photos' and name = 'security-event.jpg'
      returning name $$,
  'event-photos: authenticated cannot UPDATE directly');
select is_empty(
  $$ update storage.objects set metadata = '{"direct":true}'::jsonb
      where bucket_id = 'listing-photos'
        and name = 'a0000000-0000-4000-8000-000000000001/security.jpg'
      returning name $$,
  'listing-photos: authenticated cannot UPDATE directly');
select is_empty(
  $$ update storage.objects set metadata = '{"direct":true}'::jsonb
      where bucket_id = 'community-images'
        and name = '70000000-0000-4000-8000-000000000001/banner'
      returning name $$,
  'community-images: authenticated cannot UPDATE directly');
select is_empty(
  $$ update storage.objects set metadata = '{"direct":true}'::jsonb
      where bucket_id = 'provider-photos'
        and name = '30000000-0000-4000-8000-000000000025/portfolio/security.jpg'
      returning name $$,
  'provider-photos: authenticated cannot UPDATE directly');
select is_empty(
  format($$ update storage.objects set metadata = '{"direct":true}'::jsonb
      where bucket_id = 'service-request-photos' and name = %L
      returning name $$, current_setting('test.image_request') || '/security.jpg'),
  'service-request-photos: authenticated cannot UPDATE directly');

-- ── Leitura existente: o dono continua vendo ────────────────────────────────
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'avatars'
        and name = '10000000-0000-4000-8000-000000000001/security.jpg' $$,
  'avatars: owner retains existing SELECT');
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'event-photos' and name = 'security-event.jpg' $$,
  'event-photos: owner retains existing SELECT');
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'listing-photos'
        and name = 'a0000000-0000-4000-8000-000000000001/security.jpg' $$,
  'listing-photos: owner retains existing SELECT');
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'community-images'
        and name = '70000000-0000-4000-8000-000000000001/banner' $$,
  'community-images: owner retains existing SELECT');
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'provider-photos'
        and name = '30000000-0000-4000-8000-000000000025/portfolio/security.jpg' $$,
  'provider-photos: owner retains existing SELECT');
select isnt_empty(
  format($$ select 1 from storage.objects
      where bucket_id = 'service-request-photos' and name = %L $$,
    current_setting('test.image_request') || '/security.jpg'),
  'service-request-photos: requester retains existing SELECT');
-- Objetos sem owner (upload da service role) continuam legíveis para quem a
-- policy de leitura autoriza; nenhuma delas depende de `owner`.
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'avatars'
        and name = '10000000-0000-4000-8000-000000000001/server-null.jpg' $$,
  'avatars: null-owner server upload retains existing SELECT');
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'listing-photos'
        and name = 'a0000000-0000-4000-8000-000000000001/server-null.jpg' $$,
  'listing-photos: null-owner server upload retains existing SELECT');
select isnt_empty(
  format($$ select 1 from storage.objects
      where bucket_id = 'service-request-photos' and name = %L $$,
    current_setting('test.image_request') || '/server-null.jpg'),
  'service-request-photos: null-owner server upload retains existing SELECT');

-- ── Leitura existente: quem não participa continua sem ver ──────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'event-photos' and name = 'security-event.jpg' $$,
  'event-photos: outsider still cannot SELECT');
select is_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'community-images'
        and name = '70000000-0000-4000-8000-000000000001/banner' $$,
  'community-images: outsider still cannot SELECT');
select is_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'provider-photos'
        and name = '30000000-0000-4000-8000-000000000025/portfolio/security.jpg' $$,
  'provider-photos: outsider still cannot SELECT');
select is_empty(
  format($$ select 1 from storage.objects
      where bucket_id = 'service-request-photos' and name = %L $$,
    current_setting('test.image_request') || '/security.jpg'),
  'service-request-photos: outsider still cannot SELECT');
-- ADR de consulta a outra cidade: anúncio ativo é legível por qualquer membro
-- autenticado com localidade corrente. A remoção de INSERT/UPDATE não muda isso.
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'listing-photos'
        and name = 'a0000000-0000-4000-8000-000000000001/security.jpg' $$,
  'listing-photos: outsider retains existing cross-city SELECT');
select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'avatars' $$,
  'avatars: authenticated outsiders retain existing SELECT');

-- ── anon continua sem ler ───────────────────────────────────────────────────
set local role anon;
select is_empty($$ select 1 from storage.objects where bucket_id = 'avatars' $$,
  'avatars: anon still cannot SELECT');
select is_empty($$ select 1 from storage.objects where bucket_id = 'event-photos' $$,
  'event-photos: anon still cannot SELECT');
select is_empty($$ select 1 from storage.objects where bucket_id = 'listing-photos' $$,
  'listing-photos: anon still cannot SELECT');
select is_empty($$ select 1 from storage.objects where bucket_id = 'community-images' $$,
  'community-images: anon still cannot SELECT');
select is_empty($$ select 1 from storage.objects where bucket_id = 'provider-photos' $$,
  'provider-photos: anon still cannot SELECT');
select is_empty($$ select 1 from storage.objects where bucket_id = 'service-request-photos' $$,
  'service-request-photos: anon still cannot SELECT');

-- ── Ações privilegiadas mantêm INSERT (arquivo novo) e UPDATE (upsert) ──────
set local role service_role;
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('avatars', '10000000-0000-4000-8000-000000000001/security.jpg.server',
        '10000000-0000-4000-8000-000000000001') $$,
  'avatars: service_role can INSERT');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('event-photos', 'security-event.jpg.server',
        '10000000-0000-4000-8000-000000000001') $$,
  'event-photos: service_role can INSERT');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('listing-photos', 'a0000000-0000-4000-8000-000000000001/security.jpg.server',
        '10000000-0000-4000-8000-000000000001') $$,
  'listing-photos: service_role can INSERT');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('community-images', '70000000-0000-4000-8000-000000000001/banner.server',
        '10000000-0000-4000-8000-000000000001') $$,
  'community-images: service_role can INSERT');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values
       ('provider-photos', '30000000-0000-4000-8000-000000000025/portfolio/security.jpg.server',
        '10000000-0000-4000-8000-000000000025') $$,
  'provider-photos: service_role can INSERT');
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name, owner) values
       ('service-request-photos', %L, '10000000-0000-4000-8000-000000000001') $$,
    current_setting('test.image_request') || '/security.jpg.server'),
  'service-request-photos: service_role can INSERT');

select isnt_empty(
  $$ update storage.objects set metadata = '{"sanitized":true}'::jsonb
      where bucket_id = 'avatars'
        and name = '10000000-0000-4000-8000-000000000001/security.jpg'
      returning name $$,
  'avatars: service_role can UPDATE');
select isnt_empty(
  $$ update storage.objects set metadata = '{"sanitized":true}'::jsonb
      where bucket_id = 'event-photos' and name = 'security-event.jpg'
      returning name $$,
  'event-photos: service_role can UPDATE');
select isnt_empty(
  $$ update storage.objects set metadata = '{"sanitized":true}'::jsonb
      where bucket_id = 'listing-photos'
        and name = 'a0000000-0000-4000-8000-000000000001/security.jpg'
      returning name $$,
  'listing-photos: service_role can UPDATE');
select isnt_empty(
  $$ update storage.objects set metadata = '{"sanitized":true}'::jsonb
      where bucket_id = 'community-images'
        and name = '70000000-0000-4000-8000-000000000001/banner'
      returning name $$,
  'community-images: service_role can UPDATE');
select isnt_empty(
  $$ update storage.objects set metadata = '{"sanitized":true}'::jsonb
      where bucket_id = 'provider-photos'
        and name = '30000000-0000-4000-8000-000000000025/portfolio/security.jpg'
      returning name $$,
  'provider-photos: service_role can UPDATE');
select isnt_empty(
  format($$ update storage.objects set metadata = '{"sanitized":true}'::jsonb
      where bucket_id = 'service-request-photos' and name = %L
      returning name $$, current_setting('test.image_request') || '/security.jpg'),
  'service-request-photos: service_role can UPDATE');

reset role;
select is_empty($$ select policyname from pg_policies where schemaname = 'storage'
  and tablename = 'objects' and cmd in ('INSERT', 'UPDATE', 'ALL')
  and roles && array['authenticated', 'public']::name[] $$,
  'no client write policy can bypass server sanitization');
select * from finish();
rollback;
