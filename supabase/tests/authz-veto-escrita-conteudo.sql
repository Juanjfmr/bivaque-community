-- AUTHZ-006 (R3): conta suspensa ou com exclusão pedida não cria, edita nem
-- apaga conteúdo em perguntas, respostas, anúncios, fotos, eventos e grupos.
-- Correção: 20261118060000_authz006_veto_escrita_conteudo.sql.
-- Execução somente em Supabase LOCAL: fixtures de exemplo e rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- Conteúdo de member-one (10..01) e uma pergunta de member-two para a resposta.
insert into public.recommendation_requests (id, author_id, locality_id, title, body, category)
values
  ('98000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'Pergunta para editar',
   'Texto da pergunta de exemplo.', 'servicos_locais'),
  ('98000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-000000000001', 'Pergunta de outra pessoa',
   'Texto da pergunta de exemplo.', 'servicos_locais');

insert into public.recommendation_replies (id, request_id, author_id, body)
values
  ('98100000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001', 'Resposta de exemplo.');

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

insert into public.listings (
  id, owner_user_id, kind, status, title, description, locality_id, community_id,
  neighborhood, category, price_cents, condition
)
values (
  '98200000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'property', 'active', 'Apartamento de exemplo', 'Sala integrada.',
  '00000000-0000-4000-8000-000000000001', null, 'Centro', null, null, null
);

insert into public.property_details (listing_id, deal, property_type, rent_cents)
values ('98200000-0000-4000-8000-000000000002', 'rent', 'apartment', 220000);

insert into public.listing_photos (listing_id, path, position)
values (
  '98200000-0000-4000-8000-000000000001',
  '98200000-0000-4000-8000-000000000001/foto-0.jpg',
  0
);

insert into public.events (id, locality_id, organizer_id, title, starts_at)
values (
  '98300000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Encontro de exemplo',
  now() + interval '10 days'
);

-- Mesma probe do AUTHZ-001: executa como o chamador e desfaz sempre.
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

-- Catálogo: três restritivas por tabela, todas para authenticated.
select is((
  select count(*)::integer
  from pg_policies
  where schemaname = 'public'
    and permissive = 'RESTRICTIVE'
    and roles @> array['authenticated']::name[]
    and policyname like '%\_veto\_conta\_%'
    and tablename in (
      'recommendation_requests', 'recommendation_replies', 'listings',
      'property_details', 'listing_photos', 'events', 'groups'
    )
), 21, 'sete tabelas de conteudo com veto restritivo em insert, update e delete');

-- ── Conta ativa: tudo continua funcionando.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(pg_temp.authz_probe_mutation($q$
  update public.recommendation_requests set title = 'Pergunta editada'
  where id = '98000000-0000-4000-8000-000000000001'
$q$), 1, 'ativo edita propria pergunta');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.recommendation_requests where id = '98000000-0000-4000-8000-000000000001'
$q$), 1, 'ativo exclui propria pergunta');
select is(pg_temp.authz_probe_mutation($q$
  update public.recommendation_replies set body = 'Resposta editada'
  where id = '98100000-0000-4000-8000-000000000001'
$q$), 1, 'ativo edita propria resposta');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.recommendation_replies where id = '98100000-0000-4000-8000-000000000001'
$q$), 1, 'ativo exclui propria resposta');
select is(pg_temp.authz_probe_mutation($q$
  update public.listings set price_cents = 50000
  where id = '98200000-0000-4000-8000-000000000001'
$q$), 1, 'ativo edita proprio anuncio');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.listings where id = '98200000-0000-4000-8000-000000000001'
$q$), 1, 'ativo exclui proprio anuncio');
select is(pg_temp.authz_probe_mutation($q$
  update public.listing_photos set path = path
  where listing_id = '98200000-0000-4000-8000-000000000001'
$q$), 1, 'ativo altera foto do proprio anuncio');
select is(pg_temp.authz_probe_mutation($q$
  update public.property_details set rent_cents = 210000
  where listing_id = '98200000-0000-4000-8000-000000000002'
$q$), 1, 'ativo edita detalhes do proprio imovel');
select is(pg_temp.authz_probe_mutation($q$
  update public.events set title = 'Encontro editado'
  where id = '98300000-0000-4000-8000-000000000001'
$q$), 1, 'ativo edita proprio evento');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.events (locality_id, organizer_id, title, starts_at)
  values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
          'Novo encontro', now() + interval '12 days')
$q$), 1, 'ativo cria evento');
select is(pg_temp.authz_probe_mutation($q$
  update public.groups set description = 'Descricao editada'
  where id = '40000000-0000-4000-8000-000000000001'
$q$), 1, 'ativo edita proprio grupo');
select lives_ok($$
  select public.create_group('Grupo novo', 'public', '00000000-0000-4000-8000-000000000001')
$$, 'ativo cria grupo pela RPC');
select lives_ok($$
  select public.transition_listing('98200000-0000-4000-8000-000000000001', 'pause')
$$, 'ativo pausa proprio anuncio pela RPC');

-- ── Conta suspensa: leitura preservada, escrita congelada.
reset role;
insert into public.profile_suspensions (user_id)
values ('10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((
  select count(*)::integer from public.listings
  where id = '98200000-0000-4000-8000-000000000001'
), 1, 'suspenso continua lendo proprio anuncio');

select ok(pg_temp.authz_probe_mutation($q$
  update public.recommendation_requests set title = 'Edicao indevida'
  where id = '98000000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao edita propria pergunta');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.recommendation_requests where id = '98000000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao exclui propria pergunta');
select ok(pg_temp.authz_probe_mutation($q$
  update public.recommendation_replies set body = 'Edicao indevida'
  where id = '98100000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao edita propria resposta');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.recommendation_replies where id = '98100000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao exclui propria resposta');
select ok(pg_temp.authz_probe_mutation($q$
  update public.listings set price_cents = 1
  where id = '98200000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao muda preco do proprio anuncio');
select ok(pg_temp.authz_probe_mutation($q$
  delete from public.listings where id = '98200000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao exclui proprio anuncio');
select ok(pg_temp.authz_probe_mutation($q$
  update public.listing_photos set path = path
  where listing_id = '98200000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao altera foto do proprio anuncio');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.listing_photos (listing_id, path, position)
  values ('98200000-0000-4000-8000-000000000001',
          '98200000-0000-4000-8000-000000000001/foto-1.jpg', 1)
$q$), -1, 'suspenso nao adiciona foto ao proprio anuncio');
select ok(pg_temp.authz_probe_mutation($q$
  update public.property_details set rent_cents = 1
  where listing_id = '98200000-0000-4000-8000-000000000002'
$q$) <= 0, 'suspenso nao edita detalhes do proprio imovel');
select ok(pg_temp.authz_probe_mutation($q$
  update public.events set title = 'Edicao indevida'
  where id = '98300000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao edita proprio evento');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.events (locality_id, organizer_id, title, starts_at)
  values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
          'Encontro indevido', now() + interval '12 days')
$q$), -1, 'suspenso nao cria evento');
select ok(pg_temp.authz_probe_mutation($q$
  update public.groups set description = 'Edicao indevida'
  where id = '40000000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao edita proprio grupo');
select throws_ok($$
  select public.create_group('Grupo indevido', 'public', '00000000-0000-4000-8000-000000000001')
$$, '42501', null, 'suspenso nao cria grupo pela RPC');
select throws_ok($$
  select public.transition_listing('98200000-0000-4000-8000-000000000001', 'reactivate')
$$, '42501', null, 'suspenso nao reativa anuncio pela RPC');
select throws_ok($$
  select public.set_group_rules('40000000-0000-4000-8000-000000000001', 'Regra indevida')
$$, '42501', null, 'suspenso nao muda regras do grupo pela RPC');
select throws_ok($$
  select public.delete_group('40000000-0000-4000-8000-000000000001')
$$, '42501', null, 'suspenso nao apaga grupo pela RPC');
select throws_ok($$
  select public.mark_recommendation_resolved('98000000-0000-4000-8000-000000000001')
$$, '42501', null, 'suspenso nao marca pergunta como resolvida pela RPC');

-- Suspensão vencida não congela: is_account_suspended ignora expires_at passado.
reset role;
update public.profile_suspensions
set expires_at = now() - interval '1 minute'
where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(pg_temp.authz_probe_mutation($q$
  update public.listings set price_cents = 45000
  where id = '98200000-0000-4000-8000-000000000001'
$q$), 1, 'suspensao vencida volta a permitir editar o anuncio');

-- ── Pedido de exclusão de conta: mesmo congelamento.
reset role;
delete from public.profile_suspensions
where user_id = '10000000-0000-4000-8000-000000000001';
insert into public.account_deletion_requests (user_id, due_at)
values ('10000000-0000-4000-8000-000000000001', now() + interval '30 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select ok(pg_temp.authz_probe_mutation($q$
  update public.recommendation_requests set title = 'Edicao com exclusao pedida'
  where id = '98000000-0000-4000-8000-000000000001'
$q$) <= 0, 'pedido de exclusao impede editar propria pergunta');
select ok(pg_temp.authz_probe_mutation($q$
  update public.listings set price_cents = 1
  where id = '98200000-0000-4000-8000-000000000001'
$q$) <= 0, 'pedido de exclusao impede mudar preco do anuncio');
select ok(pg_temp.authz_probe_mutation($q$
  update public.events set title = 'Edicao com exclusao pedida'
  where id = '98300000-0000-4000-8000-000000000001'
$q$) <= 0, 'pedido de exclusao impede editar evento');
select ok(pg_temp.authz_probe_mutation($q$
  update public.groups set description = 'Edicao com exclusao pedida'
  where id = '40000000-0000-4000-8000-000000000001'
$q$) <= 0, 'pedido de exclusao impede editar grupo');
select is(pg_temp.authz_probe_mutation($q$
  insert into public.recommendation_replies (request_id, author_id, body)
  values ('98000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
          'Resposta com exclusao pedida.')
$q$), -1, 'pedido de exclusao impede responder pergunta');
select throws_ok($$
  select public.create_group('Grupo indevido', 'public', '00000000-0000-4000-8000-000000000001')
$$, '42501', null, 'pedido de exclusao impede criar grupo pela RPC');
select throws_ok($$
  select public.transition_listing('98200000-0000-4000-8000-000000000001', 'reactivate')
$$, '42501', null, 'pedido de exclusao impede reativar anuncio pela RPC');

-- Cancelar o pedido devolve a escrita.
reset role;
delete from public.account_deletion_requests
where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(pg_temp.authz_probe_mutation($q$
  update public.listings set price_cents = 40000
  where id = '98200000-0000-4000-8000-000000000001'
$q$), 1, 'cancelar pedido de exclusao devolve a edicao do anuncio');
select lives_ok($$
  select public.transition_listing('98200000-0000-4000-8000-000000000001', 'reactivate')
$$, 'cancelar pedido de exclusao devolve a RPC de situacao');

-- Outra pessoa ativa não é afetada pelo estado de member-one.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(pg_temp.authz_probe_mutation($q$
  update public.recommendation_requests set title = 'Edicao de member-two'
  where id = '98000000-0000-4000-8000-000000000002'
$q$), 1, 'member-two ativo segue editando a propria pergunta');

select * from finish();
rollback;
