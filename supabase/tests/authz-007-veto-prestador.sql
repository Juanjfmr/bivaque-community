-- AUTHZ-007 (R3): conta suspensa ou com exclusão pedida não cria, edita nem
-- apaga página de negócio, item de catálogo, foto de portfólio nem pedido de
-- serviço. O veto de FOTO é do servidor, antes do upload com service_role: o
-- que o banco prova aqui é a RPC de autoverificação que o servidor chama
-- (public.can_account_write_content) em cada estado; os caminhos de upload
-- têm testes unitários em tests/unit/security/uploads-authz.test.ts.
-- Correção: 20261118174716_authz_007_veto_prestador.sql.
-- Execução somente em Supabase LOCAL: fixtures de exemplo e rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

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

-- Prestador civil (fluxo de conta convidada): o INSERT e o UPDATE DIRETOS em
-- provider_profiles são deste fluxo — o membro cria e edita a própria página
-- pela RPC. Sem este fixture, as provas diretas de insert/update da tabela
-- não passariam da policy permissiva, que só aceita prestador civil.
reset role;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000006', 'civil-provider@example.invalid');
insert into public.communities (id, locality_id, name, created_by, owner_user_id)
values (
  '70000000-0000-4000-8000-000000000009',
  '00000000-0000-4000-8000-000000000001',
  'Comunidade do prestador civil',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);
insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values (
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000009',
  '00000000-0000-4000-8000-000000000001'
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

-- Catálogo: três restritivas por tabela do prestador.
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
select is(
  public.can_account_write_content(),
  true,
  'ativo pode escrever (RPC de autoverificacao que o servidor chama no upload)'
);

-- Prestador civil ativo: INSERT e UPDATE diretos em provider_profiles.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
insert into public.provider_profiles (owner_user_id, display_name, category)
values ('10000000-0000-4000-8000-000000000006', 'Prestador civil', 'assistencia_tecnica');
select is((
  select count(*)::integer from public.provider_profiles
  where owner_user_id = '10000000-0000-4000-8000-000000000006'
), 1, 'prestador civil ativo cria a propria ficha diretamente');
select is(pg_temp.authz_probe_mutation($q$
  update public.provider_profiles set display_name = 'Prestador civil editado'
  where owner_user_id = '10000000-0000-4000-8000-000000000006'
$q$), 1, 'prestador civil ativo edita a propria ficha diretamente');

-- O upload de foto não é provado no banco: é da Server Action com
-- service_role, sem sub do usuário, e o veto é do servidor, que confere a RPC
-- acima antes do upload (tests/unit/security/uploads-authz.test.ts).
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
values ('10000000-0000-4000-8000-000000000001'),
       ('10000000-0000-4000-8000-000000000006');

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
select is(
  public.can_account_write_content(),
  false,
  'suspenso nao pode escrever (RPC que o servidor chama antes do upload de foto)'
);

-- Prestador civil suspenso: INSERT e UPDATE diretos recusados. A restritiva
-- negando antes do unique de owner_user_id é a prova de que o veto decide, não
-- a constraint.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_profiles (owner_user_id, display_name, category)
  values ('10000000-0000-4000-8000-000000000006', 'Ficha indevida', 'alimentacao')
$q$), -1, 'prestador civil suspenso nao cria ficha diretamente');
select ok(pg_temp.authz_probe_mutation($q$
  update public.provider_profiles set display_name = 'Edicao indevida'
  where owner_user_id = '10000000-0000-4000-8000-000000000006'
$q$) <= 0, 'prestador civil suspenso nao edita ficha diretamente');

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
where user_id in ('10000000-0000-4000-8000-000000000001',
                  '10000000-0000-4000-8000-000000000006');
insert into public.account_deletion_requests (user_id, due_at)
values ('10000000-0000-4000-8000-000000000001', now() + interval '30 days'),
       ('10000000-0000-4000-8000-000000000006', now() + interval '30 days');

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
  update public.provider_portfolio_photos set caption = 'Edicao com exclusao pedida'
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'pedido de exclusao impede editar foto de portfolio');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.provider_portfolio_photos
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'pedido de exclusao impede excluir foto de portfolio');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_catalog_items (provider_id, title)
  values (current_setting('test.provider_a')::uuid, 'Item com exclusao pedida')
$q$), -1, 'pedido de exclusao impede criar item de catalogo');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.provider_catalog_items
  where provider_id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'pedido de exclusao impede excluir item de catalogo');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.provider_profiles
  where id = current_setting('test.provider_a')::uuid
$q$) <= 0, 'pedido de exclusao impede apagar a propria pagina');
select is(
  public.can_account_write_content(),
  false,
  'pedido de exclusao impede escrever (RPC que o servidor chama antes do upload)'
);

-- Prestador civil com exclusão pedida: INSERT e UPDATE diretos recusados.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(pg_temp.authz_probe_mutation($q$
  insert into public.provider_profiles (owner_user_id, display_name, category)
  values ('10000000-0000-4000-8000-000000000006', 'Ficha indevida', 'alimentacao')
$q$), -1, 'prestador civil com exclusao pedida nao cria ficha diretamente');
select ok(pg_temp.authz_probe_mutation($q$
  update public.provider_profiles set display_name = 'Edicao indevida'
  where owner_user_id = '10000000-0000-4000-8000-000000000006'
$q$) <= 0, 'prestador civil com exclusao pedida nao edita ficha diretamente');

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
