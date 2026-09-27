-- A página do negócio do membro segue o dono quando ele muda de cidade
-- (migration 20260927005841_member_business_page_follows_owner, decisão do
-- dono de 27/09/2026). O dono continua editando e apagando; a página aparece
-- na cidade nova e deixa de aparecer na antiga.

begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

\ir fixtures/foundation.inc

-- Given: member-one (Manaus, locality ...0001) cria a página.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'test.provider_id',
  public.create_member_business_page('Marmitas da Ju', 'alimentacao', 'Comida caseira')::text,
  true
);

-- When: ela muda para a cidade de other-locality (...0002), como faz
-- declare_locality_transfer: a filiação atual vira `leaving` e nasce a nova.
reset role;
update public.locality_memberships
   set kind = 'leaving', leaving_at = current_date + 30, access = 'active'
 where user_id = '10000000-0000-4000-8000-000000000001' and kind = 'current';
insert into public.locality_memberships (user_id, locality_id, kind, access)
values (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'current',
  'active'
);

select is(
  (select count(*)::integer from public.provider_reach
    where provider_id = current_setting('test.provider_id')::uuid
      and scope_type = 'locality'
      and scope_id = '00000000-0000-4000-8000-000000000002'
      and source = 'free' and active),
  1,
  'the free reach moves to the owner''s new current locality'
);
select is(
  (select count(*)::integer from public.provider_reach
    where provider_id = current_setting('test.provider_id')::uuid
      and scope_id = '00000000-0000-4000-8000-000000000001'),
  0,
  'no reach is left in the old locality'
);

-- Then: o dono continua dono.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select ok(
  public.can_manage_provider_profile(current_setting('test.provider_id')::uuid),
  'the owner still manages the page after the transfer'
);
select lives_ok(
  $$ select public.update_member_business_page(
       current_setting('test.provider_id')::uuid,
       'Marmitas da Ju Recife', 'alimentacao', null
     ) $$,
  'the owner edits the page after the transfer'
);
select is(
  (select display_name from public.provider_profiles
    where id = current_setting('test.provider_id')::uuid),
  'Marmitas da Ju Recife',
  'the edit is saved'
);

-- And: quem mora na cidade nova vê a página.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select isnt_empty(
  $$ select 1 from public.provider_profiles
      where id = current_setting('test.provider_id')::uuid $$,
  'a member of the new locality sees the page'
);
select isnt_empty(
  $$ select 1 from public.search_providers()
      where id = current_setting('test.provider_id')::uuid $$,
  'a member of the new locality finds the page in search'
);

-- And: quem ficou na cidade antiga não vê nem mexe.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is_empty(
  $$ select 1 from public.provider_profiles
      where id = current_setting('test.provider_id')::uuid $$,
  'a member of the old locality no longer sees the page'
);
select is_empty(
  $$ select 1 from public.search_providers()
      where id = current_setting('test.provider_id')::uuid $$,
  'a member of the old locality no longer finds the page in search'
);
select ok(
  not public.can_manage_provider_profile(current_setting('test.provider_id')::uuid),
  'another member does not manage the page'
);
select throws_ok(
  $$ select public.update_member_business_page(
       current_setting('test.provider_id')::uuid,
       'Tomada', 'alimentacao', null
     ) $$,
  '42501', null,
  'another member cannot edit the page'
);
select lives_ok(
  $$ delete from public.provider_profiles
      where id = current_setting('test.provider_id')::uuid $$,
  'another member''s delete is filtered by RLS'
);

-- A página que ficou presa antes da migration se acerta quando o dono pede
-- para criá-la de novo: o alcance vai para a cidade atual, sem duplicar.
reset role;
update public.provider_reach
   set scope_id = '00000000-0000-4000-8000-000000000001'
 where provider_id = current_setting('test.provider_id')::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  public.create_member_business_page('Marmitas da Ju Recife', 'alimentacao', null)::text,
  current_setting('test.provider_id'),
  'creating again returns the same page'
);
select is(
  (select count(*)::integer from public.provider_reach
    where provider_id = current_setting('test.provider_id')::uuid
      and scope_id = '00000000-0000-4000-8000-000000000002'),
  1,
  'a stuck page is moved to the owner''s current locality'
);
reset role;
select is(
  (select count(*)::integer from public.provider_reach
    where provider_id = current_setting('test.provider_id')::uuid),
  1,
  'the page still has exactly one reach'
);

-- And: o dono apaga a própria página na cidade nova.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select isnt_empty(
  $$ select 1 from public.provider_profiles
      where id = current_setting('test.provider_id')::uuid $$,
  'the page survived the other member''s delete'
);
select lives_ok(
  $$ delete from public.provider_profiles
      where id = current_setting('test.provider_id')::uuid $$,
  'the owner deletes the page after the transfer'
);
reset role;
select is(
  (select count(*)::integer from public.provider_profiles
    where id = current_setting('test.provider_id')::uuid),
  0,
  'the page is gone'
);

select * from finish();
rollback;
