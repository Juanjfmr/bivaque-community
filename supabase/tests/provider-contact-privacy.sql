begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

\ir fixtures/foundation.inc

insert into public.provider_profiles (
  id, owner_user_id, display_name, category, contact_phone, contact_is_public
)
values (
  '30000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000001',
  'Contato privado', 'alimentacao', '+5592999999999', false
);
insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000020', 'locality',
  '00000000-0000-4000-8000-000000000001', 'free'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select display_name from public.provider_profiles
    where id = '30000000-0000-4000-8000-000000000020'),
  'Contato privado',
  'member reaches the profile independently of phone visibility'
);
select throws_ok(
  $$ select contact_phone from public.provider_profiles
      where id = '30000000-0000-4000-8000-000000000020' $$,
  '42501', null,
  'member cannot directly select a private contact phone'
);
select throws_ok(
  $$ select p.* from public.provider_profiles p
      where id = '30000000-0000-4000-8000-000000000020' $$,
  '42501', null,
  'wildcard selection cannot bypass phone privacy'
);
select throws_ok(
  $$ select to_jsonb(p) from public.provider_profiles p
      where id = '30000000-0000-4000-8000-000000000020' $$,
  '42501', null,
  'whole-row JSON cannot bypass phone privacy'
);
select throws_ok(
  $$ select id from public.provider_profiles where contact_phone is not null $$,
  '42501', null,
  'phone predicates cannot be used to infer private contact'
);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020'),
  null::text,
  'scoped member cannot read private phone through RPC'
);
select is(
  (select count(*)::integer from public.search_providers(null, null, 'Contato privado')),
  1,
  'provider search still works with a private phone'
);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000099'),
  null::text,
  'missing profile does not disclose contact'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020'),
  '+5592999999999',
  'member owner reads own private phone through RPC'
);
select throws_ok(
  $$ select contact_phone from public.provider_profiles
      where id = '30000000-0000-4000-8000-000000000020' $$,
  '42501', null,
  'owner also uses the protected RPC instead of raw column access'
);

reset role;
update public.provider_profiles set contact_is_public = true
 where id = '30000000-0000-4000-8000-000000000020';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020'),
  '+5592999999999',
  'scoped member reads the phone when the owner makes it public'
);
select throws_ok(
  $$ update public.provider_profiles set contact_phone = '+5592888888888'
      where id = '30000000-0000-4000-8000-000000000020'
      returning contact_phone $$,
  '42501', null,
  'UPDATE RETURNING cannot bypass phone read privileges'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020'),
  null::text,
  'public phone remains inaccessible outside profile reach'
);
select is(
  (select count(*)::integer from public.provider_profiles
    where id = '30000000-0000-4000-8000-000000000020'),
  0,
  'profile RLS still denies an out-of-scope member'
);
select set_config('request.jwt.claim.sub', '', true);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020'),
  null::text,
  'RPC without a user identity fails closed'
);

reset role;
update public.provider_profiles set is_deleted = true
 where id = '30000000-0000-4000-8000-000000000020';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020'),
  null::text,
  'owner cannot use contact RPC to bypass a removed profile'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020'),
  null::text,
  'member cannot read public phone from a removed profile'
);

reset role;
update public.provider_profiles set is_deleted = false, contact_is_public = false
 where id = '30000000-0000-4000-8000-000000000020';
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  (select contact_phone from public.provider_profiles
    where id = '30000000-0000-4000-8000-000000000020'),
  '+5592999999999',
  'authorized server operations keep direct access to private contact'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$ select public.get_provider_contact_phone('30000000-0000-4000-8000-000000000020') $$,
  '42501', null,
  'anonymous callers cannot execute the contact RPC'
);
select throws_ok(
  $$ select contact_phone from public.provider_profiles $$,
  '42501', null,
  'anonymous callers cannot read raw contact'
);

reset role;
\ir fixtures/communities.inc
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000020', 'contact-provider@example.invalid');
insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values (
  '10000000-0000-4000-8000-000000000020',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ insert into public.provider_profiles (id, owner_user_id, display_name, category, contact_phone)
     values (
       '30000000-0000-4000-8000-000000000021',
       '10000000-0000-4000-8000-000000000020',
       'Prestador civil', 'alimentacao', '+5592777777777'
     ) $$,
  'civil provider still creates a profile with private contact'
);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000021'),
  '+5592777777777',
  'civil provider reads own private phone without any active reach'
);
select lives_ok(
  $$ update public.provider_profiles set contact_phone = '+5592666666666'
      where id = '30000000-0000-4000-8000-000000000021' $$,
  'civil provider still edits the own contact phone'
);
select is(
  public.get_provider_contact_phone('30000000-0000-4000-8000-000000000021'),
  '+5592666666666',
  'owner RPC returns the edited contact used by account and profile forms'
);

select * from finish();
rollback;
