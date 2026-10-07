-- Review delta. Unique transactional identities also run safely on the seeded
-- isolated runtime stack; no reset or development seed UUID is required.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000e201', 'listing-draft-owner@example.invalid'),
  ('10000000-0000-4000-8000-00000000e202', 'listing-draft-reader@example.invalid');
insert into public.locality_memberships (user_id, locality_id) values
  ('10000000-0000-4000-8000-00000000e201', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-00000000e202', '00000000-0000-4000-8000-000000000001');
insert into public.profiles (user_id, display_name, visibility) values
  ('10000000-0000-4000-8000-00000000e201', 'Draft Fixture Owner', 'locality_members'),
  ('10000000-0000-4000-8000-00000000e202', 'Draft Fixture Reader', 'locality_members');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-00000000e201', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok($q$
  insert into public.listings (owner_user_id,kind,title,locality_id,status)
  values ('10000000-0000-4000-8000-00000000e201','property','Active bypass',
    '00000000-0000-4000-8000-000000000001','active')
$q$, '23514', 'property listing must be created as draft', 'direct active INSERT without details is denied');

select is((select count(*) from public.listings where title='Active bypass'), 0::bigint,
  'denied INSERT persisted no listing');

select lives_ok($q$
  insert into public.listings (id,owner_user_id,kind,title,locality_id,status)
  values ('81000000-0000-4000-8000-00000000e201','10000000-0000-4000-8000-00000000e201',
    'property','Legitimate draft','00000000-0000-4000-8000-000000000001','draft')
$q$, 'owner can insert a legitimate draft');

select throws_ok($q$
  update public.listings set status='active' where id='81000000-0000-4000-8000-00000000e201'
$q$, '23514', 'property listing requires details before publish', 'draft cannot activate without details');

select public.create_property_listing(
  'RPC draft', 'Fixture to prove authorized publication after details.',
  '00000000-0000-4000-8000-000000000001', null, 'apartamento', 'Bairro Fixture',
  null, null, null, null, null, null, null, null, false, false, false
) as rpc_id \gset
select is((select status::text from public.listings where id=:'rpc_id'), 'draft', 'RPC creates draft');
select is((select count(*) from public.property_details where listing_id=:'rpc_id'), 1::bigint,
  'RPC creates its details atomically');

select lives_ok('update public.listings set status=''active'' where id=' || quote_literal(:'rpc_id'),
  'RPC-created draft can be published by its owner');
select is((select status::text from public.listings where id=:'rpc_id'), 'active', 'publication is persisted');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-00000000e202', true);
select is((select count(*) from public.listings where id='81000000-0000-4000-8000-00000000e201'),
  0::bigint, 'other member cannot see private draft');
with touched as (
  update public.listings set title='Unauthorized edit' where id=:'rpc_id' returning id
)
select is((select count(*) from touched),0::bigint, 'reader cannot edit published listing');

select * from finish();
rollback;
