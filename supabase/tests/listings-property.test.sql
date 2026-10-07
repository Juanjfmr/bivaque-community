-- FIGMA-002 — provas pgTAP do domínio de anúncios de moradia.
-- Positivo E negativo por operação, como exige o contrato: busca por público,
-- publicação, transições idempotentes, público imutável, interesse idempotente
-- (inclusive em anúncio pausado e próprio), 13ª foto, mídia por terceiro e
-- grants mínimos. Fixtures transacionais (rollback automático); nenhum uuid
-- de seed de desenvolvimento entra aqui.
--
-- Nota de dialeto: psql NÃO interpola :var dentro de dollar-quoting, então as
-- SQL dinâmicas dos throws_ok/lives_ok/results_eq são montadas por concatenação
-- com quote_literal (variáveis q_*).

begin;

create extension if not exists pgtap with schema extensions;

\ir fixtures/foundation.inc

-- Comunidade fixture para o público exclusivo por comunidade (D3).
insert into public.communities (id, locality_id, name, created_by, owner_user_id)
values (
  '71000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-000000000001',
  'Vila Fixture',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.community_memberships (community_id, user_id, status)
values
  ('71000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-000000000001', 'approved'),
  ('71000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-000000000002', 'approved');

select plan(55);

-- ── publicação: rascunho só do dono ──────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.create_property_listing(
  'Apartamento 3 quartos', 'Apartamento claro e ventilado perto do centro.',
  '00000000-0000-4000-8000-000000000001', null,
  'apartamento', 'Ponta Negra',
  320000, 72000, null,
  3::smallint, 2::smallint, 2::smallint, 98, '2026-11-01', true, false, false
) as l_loc \gset

select quote_literal(:'l_loc') as q_loc \gset

select is(
  (select status::text from public.listings where id = :'l_loc'),
  'draft',
  'publicação nasce draft e só o dono a vê'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.listings where id = :'l_loc'),
  0::bigint,
  'leitor do público NÃO vê rascunho alheio'
);

-- ── publicação: draft -> active abre para o público alcançado ────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

update public.listings set status = 'active' where id = :'l_loc';

select is(
  (select status::text from public.listings where id = :'l_loc'),
  'active',
  'dono publica o próprio anúncio (draft -> active)'
);

select results_eq(
  'select from_status::text || ''->'' || to_status::text || ''|'' || actor_user_id::text'
  ' from public.listing_status_history where listing_id = ' || :'q_loc',
  array['draft->active|10000000-0000-4000-8000-000000000001'],
  'transição gravada na história com ator real'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.listings where id = :'l_loc'),
  1::bigint,
  'membro da localidade vê o anúncio active'
);

select is(
  (select count(*) from public.property_details where listing_id = :'l_loc'),
  1::bigint,
  'ficha satélite legível para o público alcançado'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*) from public.listings where id = :'l_loc'),
  0::bigint,
  'membro de OUTRA localidade não vê o anúncio de cidade'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select is(
  (select count(*) from public.listings where id = :'l_loc'),
  0::bigint,
  'quem não é membro de lugar nenhum não vê o anúncio'
);

reset role;
set local role anon;

select throws_ok(
  'select count(*) from public.listings',
  '42501',
  'permission denied for table listings',
  'anon não tem sequer grant de leitura em listings'
);

reset role;

-- ── interesse: conversa contextual idempotente (D4) ──────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select public.register_listing_interest(:'l_loc') as conv \gset

select quote_literal(:'conv') as q_conv \gset

select results_eq(
  'select context_type::text || ''|'' || participant_a::text || ''|'' || participant_b::text'
  ' from public.dm_conversations where id = ' || :'q_conv',
  array[
    'listing|10000000-0000-4000-8000-000000000001|10000000-0000-4000-8000-000000000002'
  ],
  'interesse abre conversa contextual listing com participantes derivados'
);

select is(
  (select count(*) from public.listing_interests where listing_id = :'l_loc'),
  1::bigint,
  'interesse registrado uma única vez'
);

select is(
  (select public.register_listing_interest(:'l_loc')),
  :'conv',
  'segundo clique reencontra a MESMA conversa (idempotente)'
);

select is(
  (select count(*) from public.listing_interests where listing_id = :'l_loc'),
  1::bigint,
  'idempotência não duplica linha de interesse'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  'select public.register_listing_interest(' || :'q_loc' || ')',
  '22023',
  null,
  'dono não registra interesse no próprio anúncio'
);

-- ── pausar/reativar: transições idempotentes e interesse fechado ─────────────

update public.listings set status = 'paused' where id = :'l_loc';

select is(
  (select status::text from public.listings where id = :'l_loc'),
  'paused',
  'pausar é transição autorizada e gravada'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select throws_ok(
  'select public.register_listing_interest(' || :'q_loc' || ')',
  '42501',
  null,
  'anúncio pausado não aceita interesse novo'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.dm_conversations where id = :'conv'),
  1::bigint,
  'histórico da conversa continua legível para quem já participava'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

update public.listings set status = 'active' where id = :'l_loc';

select is(
  (select status::text from public.listings where id = :'l_loc'),
  'active',
  'reativar volta para active'
);

select is(
  (select count(*) from public.listing_status_history where listing_id = :'l_loc'),
  3::bigint,
  'história tem as três transições reais (pausar duas vezes não dobraria)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select lives_ok(
  'select public.register_listing_interest(' || :'q_loc' || ')',
  'com o anúncio active de novo, interesse novo é aceito'
);

-- ── mídia: 12 fotos, capa única, 13ª negada, terceiro negado ─────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  'insert into public.listing_media (listing_id, position, object_path, mime_type, byte_size)'
  ' select ' || :'q_loc' || ', n, ' || :'q_loc' || ' || ''/foto-'' || n || ''.jpg'', ''image/jpeg'', 2048'
  ' from generate_series(1, 12) as n',
  'dono grava as 12 fotos permitidas'
);

select is(
  (select is_cover from public.listing_media where listing_id = :'l_loc' and position = 1),
  true,
  'primeira foto entra como capa'
);

select throws_ok(
  'insert into public.listing_media (listing_id, position, object_path, mime_type, byte_size)'
  ' values (' || :'q_loc' || ', 13, ' || :'q_loc' || ' || ''/foto-13.jpg'', ''image/jpeg'', 2048)',
  '23514',
  null,
  'a 13ª foto é negada no servidor'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  'insert into public.listing_media (listing_id, position, object_path, mime_type, byte_size)'
  ' values (' || :'q_loc' || ', 13, ' || :'q_loc' || ' || ''/foto-intrusa.jpg'', ''image/jpeg'', 2048)',
  '42501',
  null,
  'terceiro não grava mídia em anúncio alheio'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

update public.listing_media set is_cover = true where listing_id = :'l_loc' and position = 2;

select is(
  (select is_cover from public.listing_media where listing_id = :'l_loc' and position = 1),
  false,
  'marcar nova capa desmarca a anterior'
);

select is(
  (select is_cover from public.listing_media where listing_id = :'l_loc' and position = 2),
  true,
  'a capa nova é exatamente uma'
);

select id as media_first
from public.listing_media
where listing_id = :'l_loc' and position = 1 \gset

select lives_ok(
  'select public.listing_media_set_order(' || :'q_loc' || ','
  ' (select array_agg(id order by position desc) from public.listing_media'
  '   where listing_id = ' || :'q_loc' || '))',
  'reordenar fotos num ato atômico é permitido ao dono'
);

select is(
  (select position::int from public.listing_media where id = :'media_first'),
  12,
  'a ordem invertida foi gravada'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  'select public.listing_media_set_order(' || :'q_loc' || ','
  ' (select array_agg(id order by position desc) from public.listing_media'
  '   where listing_id = ' || :'q_loc' || '))',
  '42501',
  null,
  'terceiro não reordena fotos alheias'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

-- Reposição após remoção (achado da coordenação em 06/10/2026): remover o
-- meio, a capa e a última e repor não pode colidir nem deixar lacuna morta.
-- Gap-fill sob lock do anúncio (migration 20261006094544).
delete from public.listing_media where listing_id = :'l_loc' and position = 6;

insert into public.listing_media (listing_id, position, object_path, mime_type, byte_size)
values (:'l_loc', 0, :'l_loc' || '/reposicao-meio.jpg', 'image/jpeg', 512)
returning position::int as pos_meio \gset

select is(:'pos_meio'::int, 6, 'reposição após remover o meio ocupa a posição liberada');

select position::int as pos_capa
from public.listing_media
where listing_id = :'l_loc' and is_cover \gset

delete from public.listing_media where listing_id = :'l_loc' and is_cover;

select is(
  (select position::int from public.listing_media where listing_id = :'l_loc' and is_cover),
  1,
  'remover a capa promove a menor posição restante'
);

insert into public.listing_media (listing_id, position, object_path, mime_type, byte_size)
values (:'l_loc', 0, :'l_loc' || '/reposicao-capa.jpg', 'image/jpeg', 512)
returning position::int as pos_rep2 \gset

select is(
  :'pos_rep2'::int,
  :'pos_capa'::int,
  'reposição após remover a capa ocupa a posição liberada pela capa'
);

select lives_ok(
  'select public.listing_media_set_order(' || :'q_loc' || ','
  ' (select array_agg(id order by position desc) from public.listing_media'
  '   where listing_id = ' || :'q_loc' || '))',
  'reordenar depois de remoções renumera sem colisão'
);

select results_eq(
  'select position::int from public.listing_media where listing_id = ' || :'q_loc'
  || ' order by position',
  array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  'posições contíguas 1..12 após remoções, reposições e reordenação'
);

-- ── público imutável e matriz de transição (D2, D3) ──────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  'update public.listings set locality_id = ''00000000-0000-4000-8000-000000000002'''
  ' where id = ' || :'q_loc',
  '23514',
  null,
  'trocar a cidade do público é negado (D3)'
);

select throws_ok(
  'update public.listings set community_id = ''71000000-0000-4000-8000-0000000000f1'','
  ' locality_id = null where id = ' || :'q_loc',
  '23514',
  null,
  'trocar cidade por comunidade também é negado'
);

select throws_ok(
  'update public.listings set kind = ''item'' where id = ' || :'q_loc',
  '23514',
  null,
  'trocar o tipo do anúncio é negado'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

with upd as (
  update public.listings set title = 'intrusão' where id = :'l_loc' returning 1
)
select is(
  (select count(*) from upd),
  0::bigint,
  'update de terceiro não toca o anúncio (RLS, sem erro silencioso de grant)'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select public.create_property_listing(
  'Rascunho dois', 'Segundo rascunho para provar a matriz de transição.',
  '00000000-0000-4000-8000-000000000001', null,
  'casa', 'Aleixo',
  null, null, null,
  2::smallint, 1::smallint, 1::smallint, 70, null, false, true, false
) as l_draft2 \gset

select quote_literal(:'l_draft2') as q_draft2 \gset

select throws_ok(
  'update public.listings set status = ''paused'' where id = ' || :'q_draft2',
  '22023',
  null,
  'draft -> paused não existe na matriz'
);

-- Posição de foto é atribuída pelo servidor: o valor do caller é ignorado
-- (migration 20261006092246), mantendo ordem determinística sob concorrência.
select lives_ok(
  'insert into public.listing_media (listing_id, position, object_path, mime_type, byte_size)'
  ' values (' || :'q_draft2' || ', 55, ' || :'q_draft2' || ' || ''/a.jpg'', ''image/jpeg'', 512)',
  'insert de foto com posição arbitrária é aceito e reposicionado'
);

select is(
  (select position::int from public.listing_media where listing_id = :'l_draft2'),
  1,
  'a posição gravada é a do servidor (1), não o 55 enviado'
);

select throws_ok(
  'update public.listings set status = ''sold'' where id = ' || :'q_loc',
  '22023',
  null,
  'vendido só existe para kind = item'
);

insert into public.listings (owner_user_id, kind, title, locality_id)
values (
  '10000000-0000-4000-8000-000000000001',
  'property',
  'Sem ficha satélite',
  '00000000-0000-4000-8000-000000000001'
)
returning id as l_nod \gset

select quote_literal(:'l_nod') as q_nod \gset

select throws_ok(
  'update public.listings set status = ''active'' where id = ' || :'q_nod',
  '23514',
  null,
  'publicar Moradia sem property_details é negado'
);

-- ── escrita onde não há grant: interesse e ficha por terceiro ────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  'insert into public.listing_interests (listing_id, user_id, conversation_id)'
  ' values (' || :'q_loc' || ', ' || :'q_loc' || ', ' || :'q_conv' || ')',
  '42501',
  'permission denied for table listing_interests',
  'interesse só entra pela RPC: nenhum grant de insert'
);

select is(
  (select count(*) from public.listing_status_history where listing_id = :'l_loc'),
  0::bigint,
  'histórico de transições não é legível por terceiro'
);

select throws_ok(
  'insert into public.property_details (listing_id, property_type, neighborhood)'
  ' values (' || :'q_loc' || ', ''casa'', ''Intrusão'')',
  '42501',
  null,
  'terceiro não cria ficha satélite em anúncio alheio'
);

-- ── público por comunidade: só a comunidade alcança ──────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select public.create_property_listing(
  'Casa na vila', 'Casa reservada aos membros da comunidade fixture.',
  null, '71000000-0000-4000-8000-0000000000f1',
  'casa', 'Centro',
  260000, null, null,
  3::smallint, 2::smallint, 2::smallint, 120, null, false, false, false
) as l_com \gset

update public.listings set status = 'active' where id = :'l_com';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.listings where id = :'l_com'),
  1::bigint,
  'membro aprovado da comunidade vê o anúncio de comunidade'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*) from public.listings where id = :'l_com'),
  0::bigint,
  'membro da cidade SEM comunidade não vê o anúncio de comunidade'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*) from public.listings where id = :'l_com'),
  0::bigint,
  'fora da comunidade e da cidade, nada visível'
);

-- ── storage: leitura derivada do recurso, escrita só do dono ─────────────────

reset role;

insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'listing-photos',
  :'l_loc' || '/obj-prova.jpg',
  '10000000-0000-4000-8000-000000000001',
  '{}'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from storage.objects where bucket_id = 'listing-photos'),
  1::bigint,
  'quem lê o anúncio active lê a foto dele'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select is(
  (select count(*) from storage.objects where bucket_id = 'listing-photos'),
  0::bigint,
  'fora do público, a foto do anúncio é invisível'
);

select throws_ok(
  'insert into storage.objects (bucket_id, name, owner, metadata)'
  ' values (''listing-photos'', ' || :'q_loc' || ' || ''/obj-intruso.jpg'','
  ' ''10000000-0000-4000-8000-000000000003'', ''{}'')',
  '42501',
  null,
  'terceiro não escreve no bucket listing-photos'
);

-- ── guardas estruturais: RLS forced e grants mínimos ─────────────────────────

reset role;

select results_eq(
  'select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace'
  ' where n.nspname = ''public'' and c.relname in ('
  ' ''listings'', ''property_details'', ''listing_media'','
  ' ''listing_interests'', ''listing_status_history'')'
  ' and (c.relrowsecurity = false or c.relforcerowsecurity = false)',
  array[0::bigint],
  'todas as tabelas do lote com RLS enabled E forced'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listing_interests'''
  ' and grantee = ''authenticated'' and privilege_type in (''INSERT'', ''UPDATE'', ''DELETE'')',
  array[0::bigint],
  'listing_interests sem grant de escrita para authenticated'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'''
  ' and table_name in (''listings'', ''property_details'', ''listing_status_history'')'
  ' and grantee = ''authenticated'' and privilege_type = ''DELETE''',
  array[0::bigint],
  'nenhum delete de anúncio/ficha/histórico para authenticated'
);

select * from finish();

rollback;
