begin;

create extension if not exists pgtap with schema extensions;
select plan(41);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000020', 'civil-provider@example.invalid');
insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  '10000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

-- A transferred member keeps read-only access to the old locality for a time.
-- That access must not expose member-owned businesses after the transfer.
insert into public.locality_memberships (
  user_id, locality_id, kind, access, leaving_at
)
values (
  '10000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  'leaving',
  'read_only',
  current_date + 30
);

create function public.test_fail_member_business_reach()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('test.fail_business_reach', true) = 'on' then
    raise exception 'injected reach failure' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger test_fail_member_business_reach
before insert on public.provider_reach
for each row execute function public.test_fail_member_business_reach();

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'test.provider_id',
  public.create_member_business_page(
    'Marmitas da Ju', 'alimentacao', 'Comida caseira'
  )::text,
  true
);

select is(
  (select count(*)::integer from public.provider_profiles
    where owner_user_id = '10000000-0000-4000-8000-000000000001'),
  1,
  'admitted member creates exactly one business page'
);
select is(
  (select count(*)::integer from public.provider_reach
    where provider_id = current_setting('test.provider_id')::uuid
      and scope_type = 'locality'
      and scope_id = '00000000-0000-4000-8000-000000000001'
      and source = 'free' and active),
  1,
  'page is atomically given free reach in the current locality'
);
select is(public.my_account_kind(), 'member', 'business page does not change account kind');
select is(
  (select count(*)::integer from public.provider_accounts
    where auth_user_id = '10000000-0000-4000-8000-000000000001'),
  0,
  'business page does not create a civil provider account'
);
select is(
  public.create_member_business_page('Ignored retry', 'alimentacao', null),
  current_setting('test.provider_id')::uuid,
  'retry returns the existing page without creating another'
);

select lives_ok(
  $$ select public.update_member_business_page(
       current_setting('test.provider_id')::uuid,
       'Marmitas da Ju', 'alimentacao', 'Almoço sob encomenda'
     ) $$,
  'member owner edits the own page'
);
select is(
  (select bio from public.provider_profiles
    where id = current_setting('test.provider_id')::uuid),
  'Almoço sob encomenda',
  'member profile update RPC persists the requested description'
);
select lives_ok(
  $$ update public.provider_profiles
       set contact_phone = '+5592999999999', contact_is_public = true
     where id = current_setting('test.provider_id')::uuid $$,
  'member cannot directly change privacy-sensitive contact columns'
);
select is(
  (select contact_phone from public.provider_profiles
    where id = current_setting('test.provider_id')::uuid),
  null::text,
  'member business page keeps phone unset until its visibility contract is implemented'
);
select is(
  (select contact_is_public from public.provider_profiles
    where id = current_setting('test.provider_id')::uuid),
  false,
  'member cannot directly turn on public contact visibility'
);
select lives_ok(
  $$ insert into public.provider_catalog_items (provider_id, title, description)
       values (current_setting('test.provider_id')::uuid, 'Marmita do dia', 'Entrega no bairro') $$,
  'member owner adds a catalog item'
);
select lives_ok(
  $$ insert into public.provider_portfolio_photos (provider_id, photo_path, caption)
       values (
         current_setting('test.provider_id')::uuid,
         current_setting('test.provider_id') || '/portfolio/prato.webp',
         'Prato do dia'
       ) $$,
  'member owner adds a portfolio photo row'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
       values (
         'provider-photos',
         current_setting('test.provider_id') || '/portfolio/prato.webp',
         '10000000-0000-4000-8000-000000000001'
       ) $$,
  'member owner uploads to the own business folder'
);
select throws_ok(
  $$ insert into public.provider_reach (provider_id, scope_type, scope_id, source)
       values (
         current_setting('test.provider_id')::uuid, 'locality',
         '00000000-0000-4000-8000-000000000002', 'free'
       ) $$,
  '42501', null,
  'member cannot directly broaden or move business reach'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.update_member_business_page(
       current_setting('test.provider_id')::uuid,
       'Taken over', 'alimentacao', null
     ) $$,
  '42501', null,
  'another member cannot update the business through the profile RPC'
);

select isnt_empty(
  $$ select 1 from public.provider_profiles
      where id = current_setting('test.provider_id')::uuid $$,
  'another member in the same locality sees the business page'
);
select isnt_empty(
  $$ select 1 from public.search_providers()
      where id = current_setting('test.provider_id')::uuid $$,
  'another member in the same locality finds the business in search'
);
select isnt_empty(
  $$ select 1 from public.provider_catalog_items
      where provider_id = current_setting('test.provider_id')::uuid $$,
  'another member in the same locality sees the catalog'
);
select isnt_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'provider-photos'
        and name = current_setting('test.provider_id') || '/portfolio/prato.webp' $$,
  'another member in the same locality sees the business photo'
);
select throws_ok(
  $$ insert into public.provider_catalog_items (provider_id, title)
       values (current_setting('test.provider_id')::uuid, 'Unauthorized') $$,
  '42501', null,
  'another member cannot add catalog items to this page'
);
select lives_ok(
  $$ update public.provider_catalog_items set title = 'Hijacked'
       where provider_id = current_setting('test.provider_id')::uuid
         and title = 'Marmita do dia' $$,
  'another member cannot edit an owner catalog item'
);
select is(
  (select title from public.provider_catalog_items
    where provider_id = current_setting('test.provider_id')::uuid),
  'Marmita do dia',
  'cross-owner catalog update does not change the item'
);
select lives_ok(
  $$ delete from public.provider_catalog_items
       where provider_id = current_setting('test.provider_id')::uuid
         and title = 'Marmita do dia' $$,
  'another member cannot delete an owner catalog item'
);
select is(
  (select count(*)::integer from public.provider_catalog_items
    where provider_id = current_setting('test.provider_id')::uuid),
  1,
  'cross-owner catalog delete leaves the item intact'
);
select throws_ok(
  $$ insert into public.provider_portfolio_photos (provider_id, photo_path)
       values (
         current_setting('test.provider_id')::uuid,
         current_setting('test.provider_id') || '/portfolio/intruder.webp'
       ) $$,
  '42501', null,
  'another member cannot add a portfolio photo to this page'
);
select lives_ok(
  $$ update public.provider_portfolio_photos set caption = 'Hijacked'
       where provider_id = current_setting('test.provider_id')::uuid $$,
  'another member cannot edit an owner portfolio photo'
);
select is(
  (select caption from public.provider_portfolio_photos
    where provider_id = current_setting('test.provider_id')::uuid),
  'Prato do dia',
  'cross-owner portfolio update does not change the photo'
);
select lives_ok(
  $$ delete from public.provider_portfolio_photos
       where provider_id = current_setting('test.provider_id')::uuid $$,
  'another member cannot delete an owner portfolio photo'
);
select is(
  (select count(*)::integer from public.provider_portfolio_photos
    where provider_id = current_setting('test.provider_id')::uuid),
  1,
  'cross-owner portfolio delete leaves the photo intact'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
       values (
         'provider-photos',
         current_setting('test.provider_id') || '/portfolio/intruder.webp',
         '10000000-0000-4000-8000-000000000002'
       ) $$,
  '42501', null,
  'another member cannot upload into the business folder'
);
select lives_ok(
  $$ update public.provider_profiles set display_name = 'Changed by another'
       where id = current_setting('test.provider_id')::uuid $$,
  'cross-owner update is filtered by RLS'
);
select is(
  (select display_name from public.provider_profiles
    where id = current_setting('test.provider_id')::uuid),
  'Marmitas da Ju',
  'cross-owner update does not change the page'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is_empty(
  $$ select 1 from public.provider_profiles
      where id = current_setting('test.provider_id')::uuid $$,
  'transferred member with read-only access cannot read the old locality page'
);
select is_empty(
  $$ select 1 from public.search_providers()
      where id = current_setting('test.provider_id')::uuid $$,
  'transferred member with read-only access cannot find the old locality page in search'
);
select is_empty(
  $$ select 1 from storage.objects
      where bucket_id = 'provider-photos'
        and name = current_setting('test.provider_id') || '/portfolio/prato.webp' $$,
  'transferred member with read-only access cannot read the old locality photo'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.create_member_business_page('Not admitted', 'alimentacao', null) $$,
  '42501', null,
  'authenticated user without an active membership cannot create a page'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select public.create_member_business_page('Anonymous', 'alimentacao', null) $$,
  '42501', null,
  'anonymous user cannot execute member business page creation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.create_member_business_page('Civil account', 'alimentacao', null) $$,
  '42501', null,
  'civil provider account cannot use member business page creation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.fail_business_reach', 'on', true);
select throws_ok(
  $$ select public.create_member_business_page('Atomic failure', 'alimentacao', null) $$,
  '23514', null,
  'reach failure aborts business page creation'
);
select is(
  (select count(*)::integer from public.provider_profiles
    where owner_user_id = '10000000-0000-4000-8000-000000000004'),
  0,
  'failed creation leaves no orphan profile'
);
select is(
  (select count(*)::integer from public.provider_reach r
     join public.provider_profiles p on p.id = r.provider_id
    where p.owner_user_id = '10000000-0000-4000-8000-000000000004'),
  0,
  'failed creation leaves no reach row'
);

reset role;
select * from finish();
rollback;
