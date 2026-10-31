begin;
create extension if not exists pgtap with schema extensions;
select plan(30);
\ir fixtures/foundation.inc

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('test.business', public.create_member_business_page('Negócio completo', 'alimentacao', null)::text, true);
select lives_ok($$ select public.save_business_page_details(current_setting('test.business')::uuid,
  'Centro', 'Toda a cidade', 'Segunda a sexta, 9h–18h', '10% para a comunidade', 'whatsapp', '+5592999999999', false) $$,
  'owner saves complete details');
select is(public.get_own_business_page_details(current_setting('test.business')::uuid)->>'opening_hours',
  'Segunda a sexta, 9h–18h', 'hours persist');
select is(public.get_own_business_page_details(current_setting('test.business')::uuid)->>'contact_phone',
  '+5592999999999', 'owner reads private contact');
select ok(not has_column_privilege('authenticated', 'public.provider_profiles', 'contact_phone', 'SELECT'),
  'table API cannot expose legacy phone');
select ok(not has_table_privilege('authenticated', 'private.business_page_details', 'SELECT'),
  'private details are not exposed as a table');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(public.get_business_page_details(current_setting('test.business')::uuid)->>'contact_phone',
  null::text, 'other member cannot read hidden phone');
select is(public.get_business_page_details(current_setting('test.business')::uuid)->>'contact_mode',
  'app', 'hidden external contact falls back to app');
select is(public.get_business_page_details(current_setting('test.business')::uuid)->>'community_discount',
  '10% para a comunidade', 'discount is available to ordinary city members');
select is(public.get_own_business_page_details(current_setting('test.business')::uuid),
  null::jsonb, 'other member cannot read owner projection');
select throws_ok($$ select public.save_business_page_details(current_setting('test.business')::uuid) $$,
  '42501', 'business owner unavailable', 'other member cannot save details');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(public.get_business_page_details(current_setting('test.business')::uuid),
  null::jsonb, 'outside city cannot read details');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.save_business_page_contact(current_setting('test.business')::uuid, '+5592888888888', true) $$,
  'owner explicitly publishes external contact');
select is(public.get_business_page_details(current_setting('test.business')::uuid)->>'contact_phone',
  '+5592888888888', 'public projection shows opted-in contact');
select is(public.get_own_business_page_details(current_setting('test.business')::uuid)->>'service_area',
  'Toda a cidade', 'contact update preserves service details');
select throws_ok($$ select public.save_business_page_details(current_setting('test.business')::uuid,
  null, null, null, null, 'app', null, true) $$,
  '23514', null, 'public contact requires external mode and number');

insert into public.provider_catalog_items(provider_id, title) values
  (current_setting('test.business')::uuid, 'Serviço de fixture');
insert into public.provider_portfolio_photos(provider_id, photo_path) values
  (current_setting('test.business')::uuid, current_setting('test.business') || '/portfolio/test.webp');
insert into storage.objects(bucket_id, name, owner) values
  ('provider-photos', current_setting('test.business') || '/portfolio/test.webp',
   '10000000-0000-4000-8000-000000000001');
select lives_ok($$ insert into public.listings(id, owner_user_id, kind, status, title,
  description, category, condition, price_cents, neighborhood, locality_id, provider_id)
  values ('33000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  'item', 'active', 'Produto de negócio', 'Descrição de fixture', 'outros', 'new', 1000,
  'Centro', '00000000-0000-4000-8000-000000000001', current_setting('test.business')::uuid) $$,
  'same owner links product in current free city');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok($$ insert into public.listings(owner_user_id, kind, title,
  description, category, condition, price_cents, neighborhood, locality_id, provider_id)
  values ('10000000-0000-4000-8000-000000000002', 'item', 'Produto alheio', 'Descrição',
  'outros', 'new', 1000, 'Centro', '00000000-0000-4000-8000-000000000001',
  current_setting('test.business')::uuid) $$,
  '42501', null, 'another owner cannot link product to this page');
select is((select count(*)::integer from storage.objects where bucket_id = 'provider-photos'
  and name = current_setting('test.business') || '/portfolio/test.webp'), 1,
  'active city member can request access to business photo');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

reset role;
insert into public.profile_suspensions(user_id) values ('10000000-0000-4000-8000-000000000001');
set local role authenticated;
select is(public.get_own_business_page_details(current_setting('test.business')::uuid),
  null::jsonb, 'suspended owner loses private projection');
select throws_ok($$ select public.save_business_page_contact(current_setting('test.business')::uuid, '+5592888888888', true) $$,
  '42501', 'business owner unavailable', 'stale suspended JWT cannot save contact');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(public.get_business_page_details(current_setting('test.business')::uuid),
  null::jsonb, 'suspended owner is not publicly exposed');
select is((select count(*)::integer from public.provider_catalog_items
  where provider_id = current_setting('test.business')::uuid), 0, 'suspended owner catalog is denied');
select is((select count(*)::integer from public.provider_portfolio_photos
  where provider_id = current_setting('test.business')::uuid), 0, 'suspended owner portfolio is denied');
select is((select count(*)::integer from storage.objects where bucket_id = 'provider-photos'
  and name = current_setting('test.business') || '/portfolio/test.webp'), 0,
  'suspension denies new photo access even with known path');
reset role;
delete from public.profile_suspensions where user_id = '10000000-0000-4000-8000-000000000001';
update public.locality_memberships set access = 'read_only', kind = 'leaving', leaving_at = current_date + 30
where user_id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.get_business_page_details(current_setting('test.business')::uuid),
  null::jsonb, 'transferred owner loses public visibility');
reset role;
select is((select provider_id from public.listings where id = '33000000-0000-4000-8000-000000000001'),
  current_setting('test.business')::uuid, 'transfer retains commercial classification');
insert into public.account_deletion_requests(user_id, requested_at, due_at) values
  ('10000000-0000-4000-8000-000000000001', now() - interval '16 days', now() - interval '1 day');
set local role service_role;
select is(public.finalize_account_deletion('10000000-0000-4000-8000-000000000001'),
  'purged', 'business owner account completes existing purge');
reset role;
select is((select count(*)::integer from private.business_page_details
  where provider_id = current_setting('test.business')::uuid), 0, 'purge removes private details');
select is((select contact_phone from public.provider_profiles
  where id = current_setting('test.business')::uuid), null::text, 'purge removes legacy contact');
select is((select provider_id from public.listings where id = '33000000-0000-4000-8000-000000000001'),
  current_setting('test.business')::uuid, 'purge does not turn business listing into personal listing');
select * from finish();
rollback;
