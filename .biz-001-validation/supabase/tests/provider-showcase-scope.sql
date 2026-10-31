begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000006', 'city-only@example.invalid'),
  ('10000000-0000-4000-8000-000000000020', 'provider-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'provider-b@example.invalid');

insert into public.locality_memberships (user_id, locality_id)
values (
  '10000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000001'
);

update public.communities
   set owner_user_id = '10000000-0000-4000-8000-000000000002'
 where id = '70000000-0000-4000-8000-000000000002';

insert into public.provider_accounts (
  auth_user_id,
  invited_by,
  community_id,
  locality_id
)
values
  (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
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
  );

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values
  (
    '30000000-0000-4000-8000-000000000020',
    'community',
    '70000000-0000-4000-8000-000000000001',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    'community',
    '70000000-0000-4000-8000-000000000002',
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
  'approved member of community A sees its provider profile'
);
select isnt_empty(
  $$ select 1 from public.provider_catalog_items where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'approved member of community A sees its provider catalog'
);
select isnt_empty(
  $$ select 1 from public.provider_portfolio_photos where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'approved member of community A sees its provider portfolio'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'member of community B does not see community A provider profile'
);
select is_empty(
  $$ select 1 from public.provider_catalog_items where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'member of community B does not see community A provider catalog'
);
select is_empty(
  $$ select 1 from public.provider_portfolio_photos where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  'member of community B does not see community A provider portfolio'
);
select is_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'pending membership in community A does not grant provider visibility'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select is_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'locality member without a community does not see free community reach'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
update public.provider_reach
   set active = false
 where provider_id = '30000000-0000-4000-8000-000000000020';

select isnt_empty(
  $$ select 1 from public.provider_profiles where id = '30000000-0000-4000-8000-000000000020' $$,
  'provider sees the own profile without active reach'
);

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
      '00000000-0000-4000-8000-000000000001',
      'paid'
    )
  $$,
  '42501',
  null,
  'provider cannot grant paid locality reach to itself'
);

update public.provider_reach
   set active = true
 where provider_id = '30000000-0000-4000-8000-000000000020';

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner)
    values (
      'provider-photos',
      '30000000-0000-4000-8000-000000000020/portfolio/antes-depois.webp',
      '10000000-0000-4000-8000-000000000020'
    )
  $$,
  'active provider uploads into the own profile folder'
);

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
  'member in scope reads provider photo'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is_empty(
  $$
    select 1 from storage.objects
     where bucket_id = 'provider-photos'
       and name = '30000000-0000-4000-8000-000000000020/portfolio/antes-depois.webp'
  $$,
  'member outside scope cannot read provider photo'
);

reset role;
select * from finish();
rollback;
