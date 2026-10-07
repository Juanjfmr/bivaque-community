-- FIGMA-002 — salvos de anúncio e moderação de anúncio.
--
-- ADR-20261006-anuncios-salvos-e-moderacao: positivos E negativos por
-- operação, como o contrato exige. Salvar/desfazer/retorno/reload; denúncia com
-- alvo real, autorrelato, duplicata e negativa uniforme para inexistente e não
-- autorizado; ocultação separada de status, trilha append-only, lock
-- transacional, idempotência de hide/restore, ligação hide↔denúncia na mesma
-- transação, RPC com ator vindo de auth.uid() e service_role sem execução.
--
-- Fixtures transacionais (rollback automático) com example.invalid. Nenhum uuid
-- de seed de desenvolvimento entra aqui; o operador é uma fixture local, porque
-- pgTAP roda sem seed por contrato.
--
-- Nota de dialeto: psql NÃO interpola :var dentro de dollar-quoting, então as
-- SQL dinâmicas dos throws_ok/lives_ok/results_eq são montadas por concatenação
-- com quote_literal (variáveis q_*).

begin;

create extension if not exists pgtap with schema extensions;

\ir fixtures/foundation.inc

-- Comunidade fixture: só o dono (user 001) e o morador de outra cidade
-- (user 003) são membros aprovados. O membro da cidade SEM comunidade (user 002)
-- fica de fora de propósito — é o negativo de audiência do alvo de comunidade.
insert into public.communities (id, locality_id, name, created_by, owner_user_id)
values (
  '72000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-000000000001',
  'Vila Salvos',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.community_memberships (community_id, user_id, status)
values
  ('72000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-000000000001', 'approved'),
  ('72000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-000000000003', 'approved');

-- Operador fixture. Não é um dos cinco membros do foundation.inc: um membro
-- comum precisa continuar NÃO sendo operador para o RPC negar a ele.
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000006', 'operator@example.invalid');

insert into public.locality_memberships (user_id, locality_id)
values ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001');

insert into public.profiles (user_id, display_name, visibility)
values ('10000000-0000-4000-8000-000000000006', 'Operator Fixture', 'locality_members');

insert into public.operators (auth_user_id, notes)
values ('10000000-0000-4000-8000-000000000006', 'pgTAP operator fixture');

select plan(126);

-- ── anúncios fixture ──────────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- A:Moradia active por cidade, com fotos. Alvo de salvamento, denúncia e
-- ocultação de todo o arquivo.
select public.create_property_listing(
  'Apartamento salva e denuncia', 'Apartamento de prova para salvar, denunciar e ocultar.',
  '00000000-0000-4000-8000-000000000001', null,
  'apartamento', 'Ponta Negra',
  320000, 72000, null,
  3::smallint, 2::smallint, 2::smallint, 98, '2026-11-01', true, false, false
) as l_a \gset

select quote_literal(:'l_a') as q_a \gset

update public.listings set status = 'active' where id = :'l_a';

-- B: rascunho da mesma cidade. Salvar e denunciar exigem active.
select public.create_property_listing(
  'Rascunho invisivel', 'Rascunho de prova: nao entra em salvos nem em denúncia.',
  '00000000-0000-4000-8000-000000000001', null,
  'casa', 'Aleixo',
  150000, null, null,
  2::smallint, 1::smallint, 1::smallint, 70, null, false, true, false
) as l_b \gset

select quote_literal(:'l_b') as q_b \gset

-- C: active de OUTRA cidade (user 003 é o dono). Fora de audiência.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select public.create_property_listing(
  'Casa de outra cidade', 'Anuncio de prova publicado em outra localidade.',
  '00000000-0000-4000-8000-000000000002', null,
  'casa', 'Centro',
  210000, null, null,
  2::smallint, 1::smallint, 0::smallint, 60, null, false, false, false
) as l_c \gset

select quote_literal(:'l_c') as q_c \gset

update public.listings set status = 'active' where id = :'l_c';

-- D: active por comunidade. O membro da cidade sem a comunidade não o alcança.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select public.create_property_listing(
  'Casa da vila', 'Anuncio de prova por comunidade, para o negativo de audiencia.',
  null, '72000000-0000-4000-8000-0000000000f1',
  'casa', 'Centro',
  260000, null, null,
  3::smallint, 2::smallint, 2::smallint, 120, null, false, false, false
) as l_d \gset

select quote_literal(:'l_d') as q_d \gset

update public.listings set status = 'active' where id = :'l_d';

insert into public.listing_media (listing_id, position, object_path, mime_type, byte_size)
values
  (:'l_a', 0, :'l_a' || '/foto-1.jpg', 'image/jpeg', 2048),
  (:'l_a', 0, :'l_a' || '/foto-2.jpg', 'image/jpeg', 2048);

reset role;

insert into storage.objects (bucket_id, name, owner, metadata)
values ('listing-photos', :'l_a' || '/foto-1.jpg', '10000000-0000-4000-8000-000000000001', '{}');

-- ── 1. Salvar: privado, idempotente, common rule para o dono ─────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select lives_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_a' || ')',
  'membro do público salva anúncio active'
);

select is(
  (select count(*) from public.listing_saves where listing_id = :'l_a'),
  1::bigint,
  'o save gravou exatamente uma linha'
);

select throws_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_a' || ')',
  '23505',
  null,
  'a PK (user, listing) impede a duplicata'
);

select lives_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_a' || ')'
  || ' on conflict do nothing',
  'salvar de novo é idempotente (upsert com on conflict)'
);

select is(
  (select count(*) from public.listing_saves where listing_id = :'l_a'),
  1::bigint,
  'idempotência não duplica a relação'
);

select is(
  (select count(*) from public.listing_saves where listing_id = :'l_a'),
  1::bigint,
  'o salvo persiste: a relação continua legível depois do reload'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000001' || ''', ' || :'q_a' || ')',
  'o dono também salva o próprio anúncio active e visível'
);

reset role;

select is(
  (select count(*) from public.listing_saves where listing_id = :'l_a'),
  2::bigint,
  'cada membro tem a sua própria relação, sem compartilhamento'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.listing_saves),
  1::bigint,
  'o membro lê somente os próprios saves (o do dono não aparece)'
);

select is(
  (select user_id::text from public.listing_saves limit 1),
  '10000000-0000-4000-8000-000000000002',
  'a leitura devolve o id do próprio membro, nunca o de outro'
);

with del as (
  delete from public.listing_saves where listing_id = :'l_a' returning 1
)
select is(
  (select count(*) from del),
  1::bigint,
  'desfazer remove a própria relação'
);

select lives_ok(
  'delete from public.listing_saves where listing_id = ' || :'q_a',
  'desfazer de novo é idempotente (nada a remover não é erro)'
);

select is(
  (select count(*) from public.listing_saves),
  0::bigint,
  'depois do desfazer não resta save do membro'
);

-- ── 2. Salvar: quem NÃO pode ──────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_b' || ')',
  '42501',
  null,
  'rascunho não é salvo'
);

select throws_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_c' || ')',
  '42501',
  null,
  'anúncio de outra cidade não é salvo'
);

select throws_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_d' || ')',
  '42501',
  null,
  'anúncio de comunidade que o membro não alcança não é salvo'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select throws_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000005' || ''', ' || :'q_a' || ')',
  '42501',
  null,
  'quem não pertence a lugar nenhum não salva'
);

select is(
  (select count(*) from public.listing_saves),
  0::bigint,
  'nenhum dos denied deixou linha para trás'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select lives_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000003' || ''', ' || :'q_d' || ')',
  'membro aprovado da comunidade salva o anúncio da comunidade'
);

select is(
  (select count(*) from public.listing_saves),
  1::bigint,
  'a audiência de comunidade é respeitada no salvamento'
);

-- ── 3. Denúncia: alvo real, autorrelato, duplicata e negativa uniforme ────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

insert into public.listing_saves (user_id, listing_id)
values ('10000000-0000-4000-8000-000000000002', :'l_a');

select lives_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_a' || ', ''Anúncio com foto enganosa'')',
  'membro denuncia anúncio active de terceiro dentro da audiência'
);

select id as r_a
from public.reports
where target_type = 'listing' and target_id = :'l_a' and status = 'open' \gset

select quote_literal(:'r_a') as q_r_a \gset

select is(
  (select count(*) from public.reports where id = :'r_a'),
  1::bigint,
  'a denúncia aberta entrou na fila com o alvo listing'
);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_a' || ', ''Mesma denúncia aberta'')',
  '23505',
  null,
  'deduplicação aberta por membro/alvo é preservada'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_a' || ', ''Auto denúncia'')',
  'P0001',
  'cannot report your own content',
  'autorrelato de anúncio é bloqueado'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ''ffffffff-ffff-4fff-8fff-ffffffffffff'', ''Inexistente'')',
  '42501',
  null,
  'UUID inexistente recebe a mesma negativa do alvo não autorizado'
);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_c' || ', ''Fora da audiência'')',
  '42501',
  null,
  'anúncio de outra cidade não é denunciável'
);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_b' || ', ''Rascunho'')',
  '42501',
  null,
  'rascunho não é denunciável'
);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_d' || ', ''Comunidade não alcançada'')',
  '42501',
  null,
  'anúncio de comunidade não alcançada não é denunciável'
);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_a' || ', '''')',
  '23514',
  null,
  'motivo validado: a coluna de texto recusa motivo vazio'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select throws_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_a' || ', ''Sem lugar'')',
  '42501',
  null,
  'quem não pertence a lugar nenhum não denuncia'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);

select lives_ok(
  'insert into public.reports (target_type, target_id, reason) values ('
  || '''listing'', ' || :'q_d' || ', ''Comunidade alcançada'')',
  'membro aprovado da comunidade denuncia o anúncio da comunidade'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.reports),
  1::bigint,
  'o denunciante enxerga a própria denúncia'
);

select is(
  (select reporter_user_id::text from public.reports limit 1),
  '10000000-0000-4000-8000-000000000002',
  'a identidade do denunciante é a do próprio membro'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.reports),
  0::bigint,
  'outro membro não lê a denúncia de ninguém'
);

-- A fila da operação mostra o alvo novo com trecho e autor.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
reset role;

set local role service_role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select results_eq(
  'select target_type::text || ''|'' || target_excerpt || ''|'' || target_author_name'
  ' from public.list_open_reports() where id = ' || :'q_r_a',
  array['listing|Apartamento salva e denuncia|Member One'],
  'a fila entrega trecho e autor do alvo listing'
);

reset role;

-- ── 4. Moderação: só operador, ator vindo de auth.uid() ──────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  'select public.moderate_listing(' || :'q_a' || ', ''hide'', ''não sou operador'', null)',
  '42501',
  'only operators moderate listings',
  'membro comum não oculta anúncio'
);

set local role service_role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select throws_ok(
  'select public.moderate_listing(' || :'q_a' || ', ''hide'', null, null)',
  '42501',
  null,
  'service_role NÃO executa o RPC de moderação: a via é o JWT do operador'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select throws_ok(
  'select public.moderate_listing(' || :'q_a' || ', ''delete'', null, null)',
  '22023',
  'action must be hide or restore',
  'ação fora do vocabulário é negada'
);

select throws_ok(
  'select public.moderate_listing(' || :'q_a' || ', ''restore'', ''nota'', ' || :'q_r_a' || ')',
  '22023',
  'report binding is only valid for hide',
  'restauração não aceita ligação de denúncia'
);

select throws_ok(
  'select public.moderate_listing(''ffffffff-ffff-4fff-8fff-ffffffffffff'', ''hide'', null, null)',
  'P0002',
  'listing not found',
  'anúncio inexistente não é ocultado'
);

select throws_ok(
  'select public.moderate_listing(' || :'q_d' || ', ''hide'', ''alvo trocado'', ' || :'q_r_a' || ')',
  'P0002',
  'report does not target this listing',
  'denúncia de outro anúncio não roteia por esta via'
);

-- cobertura pontual do caso "denúncia de OUTRO TIPO" pela via listing. Não
-- confundir com o caso acima: aqui a denúncia é legítima e ABERTA, o alvo é `post`, e o
-- que se prova é que a recusa NÃO tem efeito colateral — a denúncia continua
-- aberta, o anúncio NÃO é ocultado e NENHUM evento é gravado. Um `raise` que
-- resolvesse ou escondesse algo passaria num throws_ok sozinho.
reset role;

insert into public.posts (id, user_id, locality_id, content, post_type)
values (
  '7a000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Publicação de prova para a negativa de tipo cruzado.',
  'text'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

insert into public.reports (reporter_user_id, target_type, target_id, reason)
values (
  '10000000-0000-4000-8000-000000000002',
  'post',
  '7a000000-0000-4000-8000-000000000001',
  'Publicação de prova'
);

reset role;

select id as r_post
from public.reports
where target_type = 'post' and target_id = '7a000000-0000-4000-8000-000000000001' \gset

select quote_literal(:'r_post') as q_r_post \gset

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select throws_ok(
  'select public.moderate_listing(' || :'q_d' || ', ''hide'', ''tipo cruzado'', ' || :'q_r_post' || ')',
  'P0002',
  'report does not target this listing',
  'denúncia de outro TIPO não é aceita pela via de anúncio'
);

reset role;

select is(
  (select status::text from public.reports where id = :'r_post'),
  'open',
  'a recusa de tipo cruzado NÃO resolve a denúncia'
);

select is(
  (select moderation_hidden from public.listings where id = :'l_d'),
  false,
  'a recusa de tipo cruzado NÃO oculta o anúncio'
);

select is(
  (select count(*) from public.listing_moderation_events where listing_id = :'l_d'),
  0::bigint,
  'a recusa de tipo cruzado NÃO grava evento de moderação'
);

select is(
  (select is_deleted from public.posts where id = '7a000000-0000-4000-8000-000000000001'),
  false,
  'a recusa de tipo cruzado NÃO oculta a publicação denunciada'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select is(
  (select public.moderate_listing(:'l_a', 'hide', 'oculto por prova', :'r_a')),
  true,
  'operador oculta o anúncio e devolve que o estado mudou'
);

reset role;

select is(
  (select moderation_hidden from public.listings where id = :'l_a'),
  true,
  'a marca de moderação é própria e não usa status'
);

select is(
  (select moderation_hidden_by::text from public.listings where id = :'l_a'),
  '10000000-0000-4000-8000-000000000006',
  'o ator gravado é o do JWT da sessão, não um argumento do cliente'
);

select is(
  (select moderation_hidden_at is not null from public.listings where id = :'l_a'),
  true,
  'a data da ocultação é gravada'
);

select is(
  (select status::text from public.listings where id = :'l_a'),
  'active',
  'ocultar mantém o status original do anunciante'
);

select is(
  (select count(*) from public.listing_status_history where listing_id = :'l_a'),
  1::bigint,
  'ocultar não fabrica transição na história de status'
);

select results_eq(
  'select action::text || ''|'' || operator_user_id::text || ''|'' || coalesce(report_id::text, '''')'
  ' || ''|'' || coalesce(note, '''') from public.listing_moderation_events'
  ' where listing_id = ' || :'q_a',
  array[
    'hide|10000000-0000-4000-8000-000000000006|' || :'r_a' || '|oculto por prova'
  ],
  'a trilha guarda ação, ator, denúncia e nota'
);

select is(
  (select status::text from public.reports where id = :'r_a'),
  'resolved',
  'a denúncia foi resolvida na mesma transação do hide'
);

select is(
  (select resolved_by::text from public.reports where id = :'r_a'),
  '10000000-0000-4000-8000-000000000006',
  'a resolução registra o operador que decidiu'
);

select is(
  (select count(*) from public.notifications
   where type = 'report_resolved' and target_id = :'r_a'),
  1::bigint,
  'quem denunciou recebe o retorno da decisão'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select throws_ok(
  'select public.moderate_listing(' || :'q_a' || ', ''hide'', ''de novo'', ' || :'q_r_a' || ')',
  'P0002',
  'report already resolved',
  'denúncia já resolvida não executa novo hide'
);

select is(
  (select public.moderate_listing(:'l_a', 'hide', 'repetido', null)),
  false,
  'repetir o mesmo hide não muda o estado'
);

-- ── 5. Oculto: terceiro perde busca, salvos, detalhe, foto e interesse ────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.listings where id = :'l_a'),
  0::bigint,
  'anúncio ocultado some da busca do terceiro'
);

select is(
  (select count(*) from public.property_details where listing_id = :'l_a'),
  0::bigint,
  'anúncio ocultado some do detalhe do terceiro'
);

select is(
  (select count(*) from public.listing_media where listing_id = :'l_a'),
  0::bigint,
  'anúncio ocultado não devolve as fotos ao terceiro'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'listing-photos'),
  0::bigint,
  'anúncio ocultado nega o byte da foto na mesma URL'
);

select is(
  (select count(*) from public.listing_saves),
  1::bigint,
  'após perder acesso, o membro ainda lê o próprio save (id e data)'
);

select is(
  (select count(*) from public.listing_saves s
   join public.listings l on l.id = s.listing_id
   where s.listing_id = :'l_a'),
  0::bigint,
  'o join não revela título nem status do anúncio inacessível'
);

select is(
  (select count(*) from public.listing_saves s
   join public.listing_media m on m.listing_id = s.listing_id
   where s.listing_id = :'l_a'),
  0::bigint,
  'o join não revela foto do anúncio inacessível'
);

select throws_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_a' || ')'
  || ' on conflict do nothing',
  '42501',
  null,
  'anúncio ocultado não pode ser salvo'
);

select throws_ok(
  'select public.register_listing_interest(' || :'q_a' || ')',
  '42501',
  null,
  'anúncio ocultado não aceita interesse novo'
);

select lives_ok(
  'delete from public.listing_saves where listing_id = ' || :'q_a',
  'desfazer continua possível mesmo sem acesso ao anúncio'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.listing_saves),
  0::bigint,
  'o save foi removido mesmo sem acesso ao anúncio'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*) from public.listings where id = :'l_a'),
  1::bigint,
  'o dono continua vendo o próprio anúncio ocultado'
);

select is(
  (select count(*) from public.listing_media where listing_id = :'l_a'),
  2::bigint,
  'o dono continua lendo as fotos do próprio anúncio ocultado'
);

select throws_ok(
  'update public.listings set moderation_hidden = false where id = ' || :'q_a',
  '42501',
  'listing moderation flag is set only by the moderation RPC',
  'o dono não limpa a ocultação por UPDATE direto'
);

select lives_ok(
  'update public.listings set title = ''Apartamento salva e denuncia (revisado)'''
  || ' where id = ' || :'q_a',
  'o dono edita o anúncio ocultado com aviso, e a edição não levanta a marca'
);

select is(
  (select moderation_hidden from public.listings where id = :'l_a'),
  true,
  'editar não remove a ocultação'
);

select lives_ok(
  'update public.listings set status = ''paused'' where id = ' || :'q_a',
  'pausar o anúncio ocultado continua sendo ação do dono'
);

select lives_ok(
  'update public.listings set status = ''active'' where id = ' || :'q_a',
  'reativar o anúncio ocultado continua sendo ação do dono'
);

select is(
  (select moderation_hidden from public.listings where id = :'l_a'),
  true,
  'pausar e reativar NÃO remove a restrição da moderação'
);

-- ── 6. A trilha é append-only e só o dono/operação a lê ────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select throws_ok(
  'insert into public.listing_moderation_events (listing_id, action, operator_user_id)'
  || ' values (' || :'q_a' || ', ''hide'', ''10000000-0000-4000-8000-000000000001'')',
  '42501',
  'permission denied for table listing_moderation_events',
  'membro não escreve na trilha'
);

-- Defeito 1 (ADR): o dono recebe o ESTADO do anúncio (moderation_hidden, lido
-- na própria linha de listings), não o diário da operação. Ler a trilha é
-- operação autorizada — e "dono" não é "operador".
select is(
  (select count(*) from public.listing_moderation_events where listing_id = :'l_a'),
  0::bigint,
  'o dono do anúncio NÃO lê a trilha de moderação'
);

select is(
  (select moderation_hidden from public.listings where id = :'l_a'),
  true,
  'o dono ainda recebe o estado/aviso da ocultação pela linha do anúncio'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select is(
  (select count(*) from public.listing_moderation_events where listing_id = :'l_a'),
  1::bigint,
  'a operação autorizada lê a própria trilha'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select throws_ok(
  'insert into public.listing_moderation_events (listing_id, action, operator_user_id)'
  || ' values (' || :'q_a' || ', ''restore'', ''10000000-0000-4000-8000-000000000006'')',
  '42501',
  'permission denied for table listing_moderation_events',
  'operador também não escreve direto na trilha: só pelo RPC'
);

select throws_ok(
  'update public.listing_moderation_events set note = ''reescrita'' where listing_id = ' || :'q_a',
  '42501',
  'permission denied for table listing_moderation_events',
  'a trilha não aceita UPDATE'
);

select throws_ok(
  'delete from public.listing_moderation_events where listing_id = ' || :'q_a',
  '42501',
  'permission denied for table listing_moderation_events',
  'a trilha não aceita DELETE'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select is(
  (select count(*) from public.listing_moderation_events),
  0::bigint,
  'membro da mesma cidade que não é dono não lê a trilha alheia'
);

-- ── 6.1 A marca só muda pelo RPC, nem para o operador que é o dono ────────────
--
-- Defeito 2 (ADR): o guard antigo aceitava `private.is_operator()`, e um
-- operador DONO do anúncio passava por UPDATE direto — mudando o estado sem
-- evento, sem atomicidade com a denúncia e sem a verificação in-transação do
-- papel. As negativas abaixo são chamadas DIRETAS (SQL com o papel do cliente),
-- não uma prova de que o dono "conta como operador".

-- O operador é dono de um anúncio próprio, para que a negativa não dependa de
-- ele ser membro comum.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select public.create_property_listing(
  'Anuncio do operador', 'Anuncio do mesmo usuario que e operador da fila.',
  '00000000-0000-4000-8000-000000000001', null,
  'casa', 'Flores',
  190000, null, null,
  2::smallint, 1::smallint, 1::smallint, 64, null, false, false, false
) as l_op \gset

select quote_literal(:'l_op') as q_op \gset

update public.listings set status = 'active' where id = :'l_op';

select throws_ok(
  'update public.listings set moderation_hidden = true,'
  || ' moderation_hidden_at = now(), moderation_hidden_by ='
  || ' ''10000000-0000-4000-8000-000000000006'' where id = ' || :'q_op',
  '42501',
  'listing moderation flag is set only by the moderation RPC',
  'operador que é o DONO do anúncio não escreve a marca por UPDATE direto'
);

set local role service_role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

-- service_role nem chega à guarda: a plataforma não lhe dá escrita em listings,
-- então o caminho privilegiado também está fechado — e o RPC de moderação segue
-- sem EXECUTE para ele (provado na seção 4).
select throws_ok(
  'update public.listings set moderation_hidden = true where id = ' || :'q_op',
  '42501',
  'permission denied for table listings',
  'service_role não tem escrita em listings: nem chega à guarda da marca'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

-- Pelo caminho autorizado, o mesmo ator esconde o próprio anúncio e a trilha
-- nasce com ator, ação e nota — nada de estado órfão.
select is(
  (select public.moderate_listing(:'l_op', 'hide', 'oculto pelo dono operador', null)),
  true,
  'o RPC de moderação funciona para o operador que é o dono'
);

reset role;

select results_eq(
  'select action::text || ''|'' || operator_user_id::text || ''|'' || coalesce(note, '''')'
  ' from public.listing_moderation_events where listing_id = ' || :'q_op',
  array['hide|10000000-0000-4000-8000-000000000006|oculto pelo dono operador'],
  'a trilha registra o ator vindo de auth.uid(), não um argumento do cliente'
);

select is(
  (select moderation_hidden_by::text from public.listings where id = :'l_op'),
  '10000000-0000-4000-8000-000000000006',
  'a marca guardou o ator do JWT da sessão'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select is(
  (select public.moderate_listing(:'l_op', 'hide', 'repetido', null)),
  false,
  'repetir o hide não fabrica evento duplicado'
);

select is(
  (select public.moderate_listing(:'l_op', 'restore', 'restaurado', null)),
  true,
  'restore pelo RPC remove a marca'
);

select is(
  (select public.moderate_listing(:'l_op', 'restore', 'outra vez', null)),
  false,
  'repetir o restore não fabrica evento duplicado'
);

-- Defeito 3 (ADR): metadado de moderação não entra na criação do anúncio.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  'insert into public.listings (owner_user_id, kind, title, locality_id)'
  || ' values (''10000000-0000-4000-8000-000000000001'', ''property'', ''Rascunho legitimo'','
  || ' ''00000000-0000-4000-8000-000000000001'')',
  'anúncio legítimo sem metadado de moderação continua nascendo'
);

select throws_ok(
  'insert into public.listings (owner_user_id, kind, title, locality_id, moderation_hidden_at)'
  || ' values (''10000000-0000-4000-8000-000000000001'', ''property'', ''Data forjada'','
  || ' ''00000000-0000-4000-8000-000000000001'', now())',
  '42501',
  'listing moderation metadata is set only by moderation',
  'INSERT não aceita data de ocultação fabricada'
);

select throws_ok(
  'insert into public.listings (owner_user_id, kind, title, locality_id, moderation_hidden_by)'
  || ' values (''10000000-0000-4000-8000-000000000001'', ''property'', ''Ator forjado'','
  || ' ''00000000-0000-4000-8000-000000000001'','
  || ' ''10000000-0000-4000-8000-000000000001'')',
  '42501',
  'listing moderation metadata is set only by moderation',
  'INSERT não aceita ator de ocultação fabricado'
);

select throws_ok(
  'insert into public.listings (owner_user_id, kind, title, locality_id, moderation_hidden)'
  || ' values (''10000000-0000-4000-8000-000000000001'', ''property'', ''Marca forjada'','
  || ' ''00000000-0000-4000-8000-000000000001'', true)',
  '42501',
  'listing moderation metadata is set only by moderation',
  'INSERT não aceita marca de ocultação já ligada'
);

reset role;

select is(
  (select count(*) from public.listings where title in ('Data forjada', 'Ator forjado', 'Marca forjada')),
  0::bigint,
  'nenhum dos três inserts recusados deixou linha'
);

select is(
  (select count(*) from public.listing_moderation_events where listing_id = :'l_op'),
  2::bigint,
  'hide/restore/hide idempotente deixou exatamente dois eventos'
);

-- ── 7. Restaurar: só operador, muda só a marca, e o save volta ────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select throws_ok(
  'select public.moderate_listing(' || :'q_a' || ', ''restore'', null, null)',
  '42501',
  'only operators moderate listings',
  'membro comum não restaura anúncio'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select is(
  (select public.moderate_listing(:'l_a', 'restore', 'restaurado', null)),
  true,
  'operador restaura o anúncio'
);

select is(
  (select public.moderate_listing(:'l_a', 'restore', 'de novo', null)),
  false,
  'repetir a restauração não muda o estado'
);

reset role;

select is(
  (select moderation_hidden from public.listings where id = :'l_a'),
  false,
  'restaurar limpa a marca de moderação'
);

select is(
  (select moderation_hidden_by is null and moderation_hidden_at is null
   from public.listings where id = :'l_a'),
  true,
  'restaurar limpa ator e data da ocultação'
);

select is(
  (select status::text from public.listings where id = :'l_a'),
  'active',
  'restaurar não altera status nem público'
);

select results_eq(
  'select action::text from public.listing_moderation_events'
  ' where listing_id = ' || :'q_a' || ' order by created_at, action',
  array['hide', 'restore'],
  'a trilha preserva hide e restore, sem evento duplicado'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*) from public.listings where id = :'l_a'),
  1::bigint,
  'com a audiência de volta, o anúncio retorna para o terceiro'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'listing-photos'),
  1::bigint,
  'com a audiência de volta, o byte da foto volta a responder'
);

select lives_ok(
  'insert into public.listing_saves (user_id, listing_id) values ('
  || '''' || '10000000-0000-4000-8000-000000000002' || ''', ' || :'q_a' || ')',
  'com a audiência de volta, salvar o mesmo anúncio é aceito de novo'
);

select is(
  (select count(*) from public.listing_saves s
   join public.listings l on l.id = s.listing_id
   where s.listing_id = :'l_a'),
  1::bigint,
  'o save volta a revelar o anúncio quando ele fica elegível'
);

select is(
  (select count(*) from public.listing_saves s
   join public.listing_media m on m.listing_id = s.listing_id
   where s.listing_id = :'l_a'),
  2::bigint,
  'as fotos voltam junto com o anúncio elegível'
);

-- ── 8. Dismiss não oculta: o resolve_report dos outros alvos fica intacto ─────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

insert into public.reports (target_type, target_id, reason)
values ('listing', :'l_a', 'Denúncia para dismiss');

select id as r_d
from public.reports
where target_type = 'listing' and target_id = :'l_a' and reason = 'Denúncia para dismiss' \gset

select quote_literal(:'r_d') as q_r_d \gset

set local role service_role;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);

select lives_ok(
  'select public.resolve_report(' || :'q_r_d' || ', ''10000000-0000-4000-8000-000000000006'', ''dismiss'', ''mantido'')',
  'dismiss de anúncio resolve pelo RPC de service_role já existente'
);

reset role;

select is(
  (select status::text from public.reports where id = :'r_d'),
  'resolved',
  'a denúncia foi encerrada sem ocultar'
);

select is(
  (select moderation_hidden from public.listings where id = :'l_a'),
  false,
  'dismiss resolve sem ocultar o anúncio'
);

select is(
  (select count(*) from public.listing_moderation_events where listing_id = :'l_a'),
  2::bigint,
  'dismiss não grava evento de moderação'
);

-- ── 9. Guardas estruturais: RLS forçada e grants mínimos ──────────────────────

select results_eq(
  'select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace'
  ' where n.nspname = ''public'''
  ' and c.relname in (''listing_saves'', ''listing_moderation_events'')'
  ' and (c.relrowsecurity = false or c.relforcerowsecurity = false)',
  array[0::bigint],
  'salvos e trilha com RLS enabled E forced'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listing_saves'''
  ' and grantee = ''authenticated'''
  ' and privilege_type in (''UPDATE'', ''TRUNCATE'', ''REFERENCES'', ''TRIGGER'')',
  array[0::bigint],
  'listing_saves sem UPDATE/TRUNCATE/REFERENCES/TRIGGER para authenticated'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listing_moderation_events'''
  ' and grantee = ''authenticated'''
  ' and privilege_type in (''INSERT'', ''UPDATE'', ''DELETE'')',
  array[0::bigint],
  'listing_moderation_events sem nenhuma escrita para authenticated'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listing_saves'''
  ' and grantee = ''authenticated'''
  ' and privilege_type in (''SELECT'', ''INSERT'', ''DELETE'')',
  array[3::bigint],
  'listing_saves: exatamente SELECT, INSERT e DELETE para o membro'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listing_saves'''
  ' and grantee = ''anon''',
  array[0::bigint],
  'listing_saves inacessível a anon'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listing_moderation_events'''
  ' and grantee = ''anon''',
  array[0::bigint],
  'listing_moderation_events inacessível a anon'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listings'''
  ' and grantee = ''service_role'''
  ' and privilege_type in (''INSERT'', ''UPDATE'', ''DELETE'')',
  array[0::bigint],
  'listings sem escrita para service_role: a marca só muda pelo RPC autenticado'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listing_media'''
  ' and grantee = ''service_role'' and privilege_type = ''SELECT''',
  array[0::bigint],
  'listing_media sem SELECT para service_role: operador não ganha caminho de byte'
);

select results_eq(
  'select count(*) from information_schema.table_privileges'
  ' where table_schema = ''public'' and table_name = ''listings'''
  ' and grantee = ''service_role'' and privilege_type = ''SELECT''',
  array[1::bigint],
  'listings legível pela fila da operação (texto do alvo)'
);

select results_eq(
  'select count(*) from pg_policies'
  ' where schemaname = ''public'' and tablename = ''listing_moderation_events'''
  ' and policyname = ''listing_moderation_events_select_authorized''',
  array[0::bigint],
  'a policy que entregava a trilha ao dono não existe mais'
);

select results_eq(
  'select count(*) from pg_policies'
  ' where schemaname = ''public'' and tablename = ''listing_moderation_events'''
  ' and policyname = ''listing_moderation_events_select_operator''',
  array[1::bigint],
  'a leitura da trilha é só da operação autorizada'
);

select * from finish();

rollback;