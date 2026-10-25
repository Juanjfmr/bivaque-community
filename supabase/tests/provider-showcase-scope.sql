begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

-- RED-005 — alcance da vitrine de prestador no esquema aprovado.
--
-- A vila saiu (ADR-20261024 §1 e §4): `provider_reach` só tem escopo de
-- LOCALIDADE (`R1-209` mudada) e `provider_accounts` já não carrega
-- `community_id`. Quem lê a ficha é morador verificado da cidade do alcance;
-- quem não é dessa cidade não lê. O que nega leitura dentro da cidade é o
-- alcance inativo e a ficha removida, não o vínculo de vila — que deixou de
-- existir como fronteira de audiência.

\ir fixtures/foundation.inc

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'provider-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'provider-b@example.invalid'),
  ('10000000-0000-4000-8000-000000000022', 'provider-removed@example.invalid');

insert into public.provider_accounts (
  auth_user_id,
  invited_by,
  locality_id
)
values
  (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000022',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  );

insert into public.provider_profiles (id, owner_user_id, display_name, category, bio)
values
  (
    '30000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000020',
    'Climatiza Ajuricaba',
    'assistencia_tecnica',
    'Manutenção de ar-condicionado'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000021',
    'Marmitas da Vizinha',
    'alimentacao',
    'Almoço sob encomenda'
  ),
  (
    '30000000-0000-4000-8000-000000000022',
    '10000000-0000-4000-8000-000000000022',
    'Ficha removida',
    'alimentacao',
    'Perfil que saiu do ar por moderação'
  );

update public.provider_profiles
   set is_deleted = true
 where id = '30000000-0000-4000-8000-000000000022';

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values
  (
    '30000000-0000-4000-8000-000000000020',
    'locality',
    '00000000-0000-4000-8000-000000000001',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    'locality',
    '00000000-0000-4000-8000-000000000001',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000022',
    'locality',
    '00000000-0000-4000-8000-000000000001',
    'free'
  );

insert into public.provider_catalog_items (id, provider_id, title, description, price_cents)
values (
  '31000000-0000-4000-8000-000000000020',
  '30000000-0000-4000-8000-000000000020',
  'Limpeza completa',
  'Higienização da evaporadora',
  18000
);

insert into public.provider_portfolio_photos (id, provider_id, photo_path, caption)
values (
  '32000000-0000-4000-8000-000000000020',
  '30000000-0000-4000-8000-000000000020',
  '30000000-0000-4000-8000-000000000020/portfolio/antes-depois.webp',
  'Antes e depois da limpeza'
);

select results_eq(
  $$
    select public, file_size_limit, allowed_mime_types
      from storage.buckets
     where id = 'provider-photos'
  $$,
  $$ values (false, 5242880::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[]) $$,
  'provider photos bucket is private and constrained to the approved image contract'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'verified member of the reach locality sees its provider profile'
);
select isnt_empty(
  $$ select 1 from public.provider_catalog_items where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'verified member of the reach locality sees its provider catalog'
);
select isnt_empty(
  $$ select 1 from public.provider_portfolio_photos where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'verified member of the reach locality sees its provider portfolio'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'member of another locality does not see the provider profile'
);
select is_empty(
  $$ select 1 from public.provider_catalog_items where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'member of another locality does not see the provider catalog'
);
select is_empty(
  $$ select 1 from public.provider_portfolio_photos where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'member of another locality does not see the provider portfolio'
);

-- Alcance de outra cidade com a ficha fora do ar: o alcance inativo é a
-- fronteira que sobrou dentro da cidade (a antiga negação por vínculo de vila
-- foi extinta com a vila).
reset role;
update public.provider_reach
   set active = false
 where provider_id = '30000000-0000-4000-8000-000000000021';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000022' $$,
  'member of the city does not see a removed provider profile'
);
select is_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000021' $$,
  'member of the city does not see a provider with inactive reach'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
update public.provider_reach
   set active = false
 where provider_id = '30000000-0000-4000-8000-000000000020';

select isnt_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'provider sees the own profile without active reach'
);

reset role;
update public.provider_reach
   set active = true
 where provider_id = '30000000-0000-4000-8000-000000000020';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000021', true);
select is_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'provider does not see another provider profile'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select lives_ok(
  $$
    update public.provider_profiles
       set bio = 'Manutenção e instalação'
     where id = '30000000-0000-4000-8000-000000000020'
  $$,
  'provider edits the own profile'
);

select throws_ok(
  $$
    update public.provider_profiles
       set owner_user_id = '10000000-0000-4000-8000-000000000021'
     where id = '30000000-0000-4000-8000-000000000020'
  $$,
  '42501',
  null,
  'provider cannot move the own profile into another provider account'
);

select throws_ok(
  $$
    insert into public.provider_reach (provider_id, scope_type, scope_id, source)
    values (
      '30000000-0000-4000-8000-000000000020',
      'locality',
      '00000000-0000-4000-8000-000000000002',
      'paid'
    )
  $$,
  '42501',
  null,
  'provider cannot grant paid reach to itself'
);

update public.provider_reach
   set active = true
 where provider_id = '30000000-0000-4000-8000-000000000020';

-- SEC-006: o prestador não grava direto; a ação do servidor reconfere a ficha
-- e grava com service_role.
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'provider-photos',
      '30000000-0000-4000-8000-000000000020/portfolio/antes-depois.webp',
      '10000000-0000-4000-8000-000000000020'
    )
  $$,
  '42501',
  null,
  'active provider cannot upload into the own profile folder directly'
);

set local role service_role;
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'provider-photos',
      '30000000-0000-4000-8000-000000000020/portfolio/antes-depois.webp',
      '10000000-0000-4000-8000-000000000020'
    )
  $$,
  'service_role uploads the provider photo for the action'
);
set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000021', true);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'provider-photos',
      '30000000-0000-4000-8000-000000000020/portfolio/invasao.webp',
      '10000000-0000-4000-8000-000000000021'
    )
  $$,
  '42501',
  null,
  'provider cannot upload into another profile folder'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select isnt_empty(
  $$
    select 1 from storage.objects
     where bucket_id = 'provider-photos'
       and name = '30000000-0000-4000-8000-000000000020/portfolio/antes-depois.webp'
  $$,
  'member in the reach locality reads the provider photo'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is_empty(
  $$
    select 1 from storage.objects
     where bucket_id = 'provider-photos'
       and name = '30000000-0000-4000-8000-000000000020/portfolio/antes-depois.webp'
  $$,
  'member outside the reach locality cannot read the provider photo'
);

reset role;
select * from finish();
rollback;