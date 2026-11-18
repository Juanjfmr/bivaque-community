-- AUTHZ-007 (R3): conta suspensa ou com exclusão pedida não cria, edita nem
-- apaga página de negócio, item de catálogo, foto de portfólio, pedido de
-- serviço, nem sobe foto de anúncio ou de evento.
-- Correção: 20261118174716_authz_007_veto_prestador.sql.
-- Execução somente em Supabase LOCAL: fixtures de exemplo e rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

\ir fixtures/foundation.inc

-- Anúncio de member-one: o caminho de foto de anúncio vive na pasta do id dele.
insert into public.listings (
  id, owner_user_id, kind, status, locality_id, community_id,
  category, title, description, price_cents, condition, neighborhood
)
values (
  '98200000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'item', 'active', '00000000-0000-4000-8000-000000000001', null,
  'casa_moveis', 'Mesa de exemplo', 'Mesa usada.', 65000, 'used', 'Centro'
);

-- Página de negócio de member-one (A) e de member-two (B), ambas com conta ativa.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'test.provider_a',
  public.create_member_business_page('Marmitas da Ju', 'alimentacao', 'Comida caseira')::text,
  true
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'test.provider_b',
  public.create_member_business_page('Costura do Zé', 'assistencia_tecnica', null)::text,
  true
);
insert into public.provider_catalog_items (provider_id, title)
values (current_setting('test.provider_b')::uuid, 'Ajuste de roupa');

-- Catálogo e portfólio de member-one, gravados pelo dono com conta ativa.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.provider_catalog_items (provider_id, title)
values (current_setting('test.provider_a')::uuid, 'Marmita do dia');
insert into public.provider_portfolio_photos (provider_id, photo_path, caption)
values (
  current_setting('test.provider_a')::uuid,
  current_setting('test.provider_a') || '/portfolio/prato.webp',
  'Prato do dia'
);

-- Mesma probe do AUTHZ-006: executa como o chamador e desfaz sempre.
-- 1 = alterou linha; 0 = RLS ocultou a linha; -1 = SQLSTATE 42501.
create function pg_temp.authz_probe_mutation(p_sql text)
returns integer language plpgsql security invoker set search_path = ''
as $probe$
declare v_rows integer;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    raise exception using errcode = 'ZX001', message = 'rollback authz probe';
  exception
    when sqlstate 'ZX001' then return v_rows;
    when insufficient_privilege then return -1;
  end;
end;
$probe$;

-- Catálogo: três restritivas por tabela do prestador e o trigger nos buckets.
select is((
  select count(*)::integer
  from pg_policies
  where schemaname = 'public'
    and permissive = 'RESTRICTIVE'
    and roles @> array['authenticated']::name[]
    and policyname like '%\_veto\_conta\_%'
    and tablename in (
      'provider_profiles', 'provider_catalog_items', 'provider_portfolio_photos'
    )
), 9, 'tres tabelas do prestador com veto restritivo em insert, update e delete');
select is((
  select count(*)::integer
  from information_schema.triggers
  where trigger_schema = 'storage'
    and event_object_table = 'objects'
    and trigger_name = 'veto_conta_foto_conteudo'
    and action_timing = 'BEFORE'
    and event_manipulation = 'INSERT'
), 1, 'trigger de veto antes do insert em storage.objects');

-- ── Conta ativa: tudo continua funcionando.
select is((
  select count(*)::integer from public.provider_profiles
  where owner_user_id = '10000000-0000-4000-8000-000000000001'
), 1, 'ativo cria pagina de negocio pela RPC');
select lives_ok(
  $$ select public.update_member_business_page(
       current_setting('test.provider_a')::uuid,
       'Marmitas da Ju', 'alimentacao', 'Almoço sob encomenda'
     ) $$,
  'ativo edita a pagina pela RPC'
);
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_catalog_items (provider_id, title)
  values (current_setting('test.provider_a')::uuid, 'Item novo')
$q$), 1, 'ativo cria item de catalogo');
select is(pg_temp.authz_probe_mutation($q$
  update public.provider_catalog_items set title = 'Item editado'
  where provider_id = current_setting('test.provider_a')::uuid
$q$), 1, 'ativo edita item de catalogo');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.provider_catalog_items
  where provider_id = current_setting('test.provider_a')::uuid
$q$), 1, 'ativo exclui item de catalogo');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_portfolio_photos (provider_id, photo_path, caption)
  values (current_setting('test.provider_a')::uuid,
          current_setting('test.provider_a') || '/portfolio/prato-2.webp',
          'Segunda foto')
$q$), 1, 'ativo cria foto de portfolio');
select is(pg_temp.authz_probe_mutation($q$
  update public.provider_portfolio_photos set caption = 'Legenda editada'
  where provider_id = current_setting('test.provider_a')::uuid
$q$), 1, 'ativo edita foto de portfolio');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.provider_portfolio_photos
  where provider_id = current_setting('test.provider_a')::uuid
$q$), 1, 'ativo exclui foto de portfolio');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.provider_profiles
  where id = current_setting('test.provider_a')::uuid
$q$), 1, 'ativo apaga a propria pagina diretamente');

-- Buckets: o upload real é da Server Action com service_role, sem sub do usuário.
reset role;
set local role service_role;
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('listing-photos', '98200000-0000-4000-8000-000000000001/foto-0.jpg',
             '10000000-0000-4000-8000-000000000001') $$,
  'ativo sobe foto de anuncio'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('event-photos',
             '10000000-0000-4000-8000-000000000001/grupos/98400000-0000-4000-8000-000000000001/capa.jpg',
             '10000000-0000-4000-8000-000000000001') $$,
  'ativo sobe foto de evento'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ select public.create_service_request(
       current_setting('test.provider_a')::uuid, 'Pedido de exemplo'
     ) $$,
  'ativo pede servico de prestador visivel'
);

-- ── Conta suspensa: leitura preservada, escrita congelada.
reset role;
insert into public.profile_suspensions (user_id)
values ('10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((
  select count(*)::integer from public.provider_profiles
  where id = current_setting('test.provider_a')::uuid
), 1, 'suspenso continua lendo a propria pagina');

select throws_ok(
  $$ select public.create_member_business_page('Outra pagina', 'alimentacao', null) $$,
  '42501', 'account cannot write content',
  'suspenso nao cria pagina de negocio pela RPC'
);
select throws_ok(
  $$ select public.update_member_business_page(
       current_setting('test.provider_a')::uuid, 'Nome novo', 'alimentacao', null
     ) $$,
  '42501', 'account cannot write content',
  'suspenso nao edita a pagina pela RPC'
);
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_catalog_items (provider_id, title)
  values (current_setting('test.provider_a')::uuid, 'Item indevido')
$q$), -1, 'suspenso nao cria item de catalogo');
select ok(pg_temp.authz_probe_mutation($q$
  update public.provider_catalog_items set title = 'Edicao indevida'
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'suspenso nao edita item de catalogo');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.provider_catalog_items
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'suspenso nao exclui item de catalogo');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_portfolio_photos (provider_id, photo_path)
  values (current_setting('test.provider_a')::uuid,
          current_setting('test.provider_a') || '/portfolio/indevido.webp')
$q$), -1, 'suspenso nao cria foto de portfolio');
select ok(pg_temp.authz_probe_mutation($q$
  update public.provider_portfolio_photos set caption = 'Edicao indevida'
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'suspenso nao edita foto de portfolio');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.provider_portfolio_photos
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'suspenso nao exclui foto de portfolio');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.provider_profiles
  where id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'suspenso nao apaga a propria pagina');

reset role;
set local role service_role;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('listing-photos', '98200000-0000-4000-8000-000000000001/foto-1.jpg',
             '10000000-0000-4000-8000-000000000001') $$,
  '42501', 'account cannot write content',
  'suspenso nao sobe foto de anuncio'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('event-photos',
             '10000000-0000-4000-8000-000000000001/grupos/98400000-0000-4000-8000-000000000002/capa.jpg',
             '10000000-0000-4000-8000-000000000001') $$,
  '42501', 'account cannot write content',
  'suspenso nao sobe foto de evento'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.create_service_request(
       current_setting('test.provider_b')::uuid, 'Pedido indevido'
     ) $$,
  '42501', 'account cannot write content',
  'suspenso nao pede servico pela RPC'
);

-- Suspensão vencida não congela: is_account_suspended ignora expires_at passado.
reset role;
update public.profile_suspensions
set expires_at = now() - interval '1 minute'
where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_catalog_items (provider_id, title)
  values (current_setting('test.provider_a')::uuid, 'Item depois da suspensao')
$q$), 1, 'suspensao vencida devolve a escrita do catalogo');

-- ── Pedido de exclusão de conta: mesmo congelamento.
reset role;
delete from public.profile_suspensions
where user_id = '10000000-0000-4000-8000-000000000001';
insert into public.account_deletion_requests (user_id, due_at)
values ('10000000-0000-4000-8000-000000000001', now() + interval '30 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.create_member_business_page('Outra pagina', 'alimentacao', null) $$,
  '42501', 'account cannot write content',
  'pedido de exclusao impede criar pagina de negocio pela RPC'
);
select throws_ok(
  $$ select public.update_member_business_page(
       current_setting('test.provider_a')::uuid, 'Nome novo', 'alimentacao', null
     ) $$,
  '42501', 'account cannot write content',
  'pedido de exclusao impede editar a pagina pela RPC'
);
select ok(pg_temp.authz_probe_mutation($q$
  update public.provider_catalog_items set title = 'Edicao com exclusao pedida'
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'pedido de exclusao impede editar item de catalogo');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_portfolio_photos (provider_id, photo_path)
  values (current_setting('test.provider_a')::uuid,
          current_setting('test.provider_a') || '/portfolio/com-exclusao.webp')
$q$), -1, 'pedido de exclusao impede criar foto de portfolio');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.provider_profiles
  where id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'pedido de exclusao impede apagar a propria pagina');

reset role;
set local role service_role;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('listing-photos', '98200000-0000-4000-8000-000000000001/foto-2.jpg',
             '10000000-0000-4000-8000-000000000001') $$,
  '42501', 'account cannot write content',
  'pedido de exclusao impede subir foto de anuncio'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('event-photos',
             '10000000-0000-4000-8000-000000000001/grupos/98400000-0000-4000-8000-000000000003/capa.jpg',
             '10000000-0000-4000-8000-000000000001') $$,
  '42501', 'account cannot write content',
  'pedido de exclusao impede subir foto de evento'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.create_service_request(
       current_setting('test.provider_b')::uuid, 'Pedido com exclusao pedida'
     ) $$,
  '42501', 'account cannot write content',
  'pedido de exclusao impede pedir servico pela RPC'
);

-- Cancelar o pedido devolve a escrita.
reset role;
delete from public.account_deletion_requests
where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_catalog_items (provider_id, title)
  values (current_setting('test.provider_a')::uuid, 'Item depois do cancelamento')
$q$), 1, 'cancelar pedido de exclusao devolve a escrita do catalogo');

-- Outra pessoa ativa não é afetada pelo estado de member-one.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(pg_temp.authz_probe_mutation($q$
  update public.provider_catalog_items set title = 'Edicao de member-two'
  where provider_id = current_setting('test.provider_b')::uuid
$q$), 1, 'member-two ativo segue editando o proprio catalogo');

select * from finish();
rollback;
