-- FEED-PAGINACAO-CURSOR — pgTAP do cursor em `public.feed_community`.
-- Par da migration 20260922103620_feed_community_cursor_pagination.sql: positiva
-- e negativa no MESMO lote. Só faz sentido depois dela.
--
-- O que este arquivo prova, e por quê:
--
--   A. CATÁLOGO — a assinatura antiga de dois argumentos NÃO existe mais (a
--      sobrecarga morreu), a nova tem cinco com o cursor antes do limite, o
--      default é 20 no catálogo, `security definer` e `search_path` vazio
--      sobreviveram, `authenticated` executa e `anon` não.
--   B. PAGINAÇÃO — três páginas de 20 cobrem 60 posts em ordem, sem repetir e sem
--      pular ninguém. O TETO DE 50 é do servidor: a base tem 60 posts e pedir
--      100.000 devolve 50.
--   C. PUBLICAÇÃO ENTRE REQUISIÇÕES — post novo no meio da rolagem não entra na
--      página seguinte e não duplica a página 1.
--   D. MESMO INSTANTE — dois posts com o mesmo `created_at` aparecem os dois,
--      porque o `id` desempata o cursor.
--   E. RELEVANTES — janela, piso de 1 comentário e limite de 20, com controle
--      positivo de cada exclusão (o post excluído existe e é o que se diz dele).
--   F. TRÊS RAMOS — comunidade, grupo público e cidade aparecem; post de grupo
--      privado não vaza, em página nenhuma.
--   G. AUTORIZAÇÃO — quem não é membro recebe ZERO LINHAS EM TODAS AS PÁGINAS,
--      com controle positivo de que a fixture não está vazia.
--   H. CURSOR INCOMPLETO — meio cursor é recusado pelo servidor, não devolvido
--      como primeira página outra vez em silêncio.
--
-- ESCOPO ISOLADO, de propósito. As fixtures `foundation` e `communities` vivem na
-- localidade 00000000-…-0001, que nesta base local carrega resíduo do seed de
-- desenvolvimento (centenas de posts de alcance da cidade). Contar linhas exatas
-- ali mediria o seed, não a paginação. Cada grupo abaixo ganha localidade e
-- comunidade PRÓPRIAS, então o ramo da cidade (`community_id` e `group_id`
-- nulos, mesma localidade) só encontra o que este arquivo inseriu — o teste mede
-- a paginação nos dois ambientes, com e sem seed.

begin;

create extension if not exists pgtap with schema extensions;
select plan(54);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- Localidades e comunidades próprias: cada grupo mede um feed que só ele habita.

insert into public.localities (id, slug, city_name, state_code, country_code, ibge_code)
values
  ('00000000-0000-4000-8000-0000000000f1', 'fixture-paginacao', 'Fixture Paginacao', 'EX', 'BR', '9999901'),
  ('00000000-0000-4000-8000-0000000000f2', 'fixture-publicacao', 'Fixture Publicacao', 'EX', 'BR', '9999902'),
  ('00000000-0000-4000-8000-0000000000f3', 'fixture-empate', 'Fixture Empate', 'EX', 'BR', '9999903'),
  ('00000000-0000-4000-8000-0000000000f4', 'fixture-relevancia', 'Fixture Relevancia', 'EX', 'BR', '9999904'),
  ('00000000-0000-4000-8000-0000000000f6', 'fixture-ramos', 'Fixture Ramos', 'EX', 'BR', '9999906');

insert into public.communities (id, locality_id, name, description, created_by, owner_user_id)
values
  ('71000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f1', 'Vila Paginacao', 'Grupo B: tres paginas e o teto', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f2', 'Vila Publicacao', 'Grupo C: post no meio da rolagem', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000f3', 'Vila Empate', 'Grupo D: dois posts no mesmo instante', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-0000000000f4', 'Vila Relevancia', 'Grupo E: janela, piso e limite', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-0000000000f6', '00000000-0000-4000-8000-0000000000f6', 'Vila Ramos', 'Grupo F: os tres ramos', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');

insert into public.community_memberships (community_id, user_id, role, status)
values
  ('71000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('71000000-0000-4000-8000-0000000000f2', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('71000000-0000-4000-8000-0000000000f3', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('71000000-0000-4000-8000-0000000000f4', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('71000000-0000-4000-8000-0000000000f6', '10000000-0000-4000-8000-000000000001', 'owner', 'approved');

-- Grupo F: um grupo PÚBLICO onde o leitor está, e um PRIVADO do qual ele não
-- participa. O dono do privado é outra pessoa — o negativo só é honesto se a
-- única razão da invisibilidade for a visibilidade do grupo, não uma fixture
-- artificial onde o próprio dono ficou de fora.
insert into public.groups (id, name, description, visibility, locality_id, community_id, created_by, owner_user_id)
values
  ('81000000-0000-4000-8000-0000000000f1', 'Grupo aberto da vila', 'Grupo publico do grupo F', 'public', '00000000-0000-4000-8000-0000000000f6', '71000000-0000-4000-8000-0000000000f6', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-0000000000f2', 'Grupo fechado da vila', 'Grupo privado do grupo F', 'private', '00000000-0000-4000-8000-0000000000f6', '71000000-0000-4000-8000-0000000000f6', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002');

insert into public.group_memberships (group_id, user_id, role, status)
values (
  '81000000-0000-4000-8000-0000000000f1',
  '10000000-0000-4000-8000-000000000001',
  'owner',
  'approved'
);

-- Grupo B (f1): 60 posts, o mais novo por último na série de `created_at`.
insert into public.posts (id, locality_id, user_id, community_id, post_type, content, created_at)
select
  ('91000000-0000-4000-8000-' || lpad(g.i::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-0000000000f1',
  '10000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-0000000000f1',
  'text',
  'post de paginacao ' || g.i,
  '2026-06-01 12:00:00+00'::timestamptz + (g.i || ' minutes')::interval
from generate_series(1, 60) as g(i);

-- Grupo C (f2): 25 posts.
insert into public.posts (id, locality_id, user_id, community_id, post_type, content, created_at)
select
  ('92000000-0000-4000-8000-' || lpad(g.i::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-0000000000f2',
  '10000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-0000000000f2',
  'text',
  'post de publicacao ' || g.i,
  '2026-06-01 12:00:00+00'::timestamptz + (g.i || ' minutes')::interval
from generate_series(1, 25) as g(i);

-- Grupo D (f3): dois posts no MESMO instante. Os ids foram escolhidos para a
-- ordem ser conhecida: `d2` > `d1`, então o desempate por `id desc` põe `d2`
-- primeiro.
insert into public.posts (id, locality_id, user_id, community_id, post_type, content, created_at)
values
  ('93000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000f3', '10000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-0000000000f3', 'text', 'empate primeiro', '2026-06-01 12:00:00+00'),
  ('93000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000f3', '10000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-0000000000f3', 'text', 'empate segundo', '2026-06-01 12:00:00+00');

-- Grupo E (f4): 25 posts na janela com 1 comentário cada — mais que o limite de
-- 20, para o limite morder de verdade. `0101` tem 3 comentários e lidera; `0103`
-- está na janela e NÃO tem comentário (piso); `0102` tem 5 comentários e está
-- FORA da janela.
insert into public.posts (id, locality_id, user_id, community_id, post_type, content, created_at)
select
  ('94000000-0000-4000-8000-' || lpad(g.i::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-0000000000f4',
  '10000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-0000000000f4',
  'text',
  'post relevante ' || g.i,
  now() - interval '2 days'
from generate_series(1, 25) as g(i);

insert into public.posts (id, locality_id, user_id, community_id, post_type, content, created_at)
values
  ('94000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-0000000000f4', '10000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-0000000000f4', 'text', 'post com tres comentarios', now() - interval '1 day'),
  ('94000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000000f4', '10000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-0000000000f4', 'text', 'post antigo com cinco comentarios', now() - interval '10 days'),
  ('94000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-0000000000f4', '10000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-0000000000f4', 'text', 'post sem comentario', now() - interval '1 day');

-- Comentários pelo MESMO autor dos posts: evita disparar `notify_comment`, que
-- só cria notificação quando quem comenta não é o autor.
insert into public.comments (post_id, user_id, content)
select
  ('94000000-0000-4000-8000-' || lpad(g.i::text, 12, '0'))::uuid,
  '10000000-0000-4000-8000-000000000001',
  'comentario ' || g.i
from generate_series(1, 25) as g(i);

insert into public.comments (post_id, user_id, content)
select
  '94000000-0000-4000-8000-000000000101',
  '10000000-0000-4000-8000-000000000001',
  'comentario da lider ' || g.i
from generate_series(1, 3) as g(i);

insert into public.comments (post_id, user_id, content)
select
  '94000000-0000-4000-8000-000000000102',
  '10000000-0000-4000-8000-000000000001',
  'comentario do antigo ' || g.i
from generate_series(1, 5) as g(i);

-- Grupo F (f6): 25 posts da comunidade (ramo A), um do grupo público (ramo B),
-- um do grupo privado (não pode vazar) e um de alcance da cidade (ramo C).
insert into public.posts (id, locality_id, user_id, community_id, post_type, content, created_at)
select
  ('96000000-0000-4000-8000-' || lpad(g.i::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-0000000000f6',
  '10000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-0000000000f6',
  'text',
  'post de ramo ' || g.i,
  '2026-06-01 12:00:00+00'::timestamptz + (g.i || ' minutes')::interval
from generate_series(1, 25) as g(i);

insert into public.posts (id, locality_id, user_id, group_id, post_type, content, created_at)
values
  ('96000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000f6', '10000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-0000000000f1', 'text', 'post do grupo publico', '2026-06-02 12:00:00+00'),
  ('96000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000f6', '10000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-0000000000f2', 'text', 'post do grupo privado', '2026-06-03 12:00:00+00');

insert into public.posts (id, locality_id, user_id, community_id, group_id, post_type, content, created_at)
values (
  '96000000-0000-4000-8000-0000000000a3',
  '00000000-0000-4000-8000-0000000000f6',
  '10000000-0000-4000-8000-000000000001',
  null,
  null,
  'text',
  'post de alcance da cidade',
  '2026-06-04 12:00:00+00'
);

-- ── A. CATÁLOGO ─────────────────────────────────────────────────────────────

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_community'
  ),
  1::bigint,
  'A1: feed_community tem UMA assinatura — a sobrecarga nao sobreviveu'
);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_community'
      and pg_get_function_identity_arguments(p.oid) = 'p_community_id uuid, p_order text'
  ),
  0::bigint,
  'A2: a assinatura antiga de dois argumentos NAO existe mais (pg_proc)'
);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_community'
      and p.pronargs = 5
      and pg_get_function_identity_arguments(p.oid) like
        'p_community_id uuid, p_order text, p_before_created_at%, p_before_id uuid, p_limit integer'
  ),
  1::bigint,
  'A3: existe exatamente a assinatura nova, com o cursor e o limite'
);

select ok(
  (
    select pg_get_function_arguments(p.oid) like '%p_limit integer DEFAULT 20%'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_community'
  ),
  'A4: o default de p_limit e 20, lido do catalogo'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_community'
  ),
  'A5: security definer preservado'
);

select is(
  (
    select p.proconfig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_community'
  ),
  array['search_path=""']::text[],
  'A6: search_path vazio preservado'
);

select is(
  private.feed_community_max_limit(),
  50,
  'A7: o teto de uma pagina e 50, em funcao privada'
);

select is(
  private.feed_community_relevant_window(),
  interval '7 days',
  'A8: a janela de Relevantes e 7 dias, em funcao privada'
);

select is(
  private.feed_community_relevant_limit(),
  20,
  'A9: o limite de Relevantes e 20, em funcao privada'
);

select is(
  private.feed_community_relevant_min_comments(),
  1::bigint,
  'A10: o piso de comentarios de Relevantes e 1, em funcao privada'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.feed_community(uuid,text,timestamp with time zone,uuid,integer)',
    'EXECUTE'
  ),
  'A11: authenticated executa a pagina'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.feed_community(uuid,text,timestamp with time zone,uuid,integer)',
    'EXECUTE'
  ),
  'A12: anon NAO executa a pagina'
);

-- ── B. TRÊS PÁGINAS, SEM REPETIR E SEM PULAR ────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f1') f
  ),
  20::bigint,
  'B1: a pagina default tem 20 linhas'
);

select is(
  (
    select array_agg(f.id::text order by f.created_at desc, f.id desc)
    from public.feed_community('71000000-0000-4000-8000-0000000000f1') f
  ),
  array(
    select '91000000-0000-4000-8000-' || lpad(g.i::text, 12, '0')
    from generate_series(60, 41, -1) as g(i)
  ),
  'B2: a pagina 1 e exatamente os 20 mais novos, na ordem'
);

with pagina1 as (
  select f.id, f.created_at
  from public.feed_community('71000000-0000-4000-8000-0000000000f1') f
),
cursor1 as (
  select id, created_at from pagina1 order by created_at asc, id asc limit 1
)
select is(
  (
    select array_agg(f.id::text order by f.created_at desc, f.id desc)
    from public.feed_community(
      '71000000-0000-4000-8000-0000000000f1', 'recent',
      (select created_at from cursor1), (select id from cursor1)
    ) f
  ),
  array(
    select '91000000-0000-4000-8000-' || lpad(g.i::text, 12, '0')
    from generate_series(40, 21, -1) as g(i)
  ),
  'B3: a pagina 2 e exatamente as 20 seguintes — nao repete nem pula'
);

with pagina1 as (
  select f.id, f.created_at
  from public.feed_community('71000000-0000-4000-8000-0000000000f1') f
),
cursor1 as (
  select id, created_at from pagina1 order by created_at asc, id asc limit 1
),
pagina2 as (
  select f.id, f.created_at
  from public.feed_community(
    '71000000-0000-4000-8000-0000000000f1', 'recent',
    (select created_at from cursor1), (select id from cursor1)
  ) f
),
cursor2 as (
  select id, created_at from pagina2 order by created_at asc, id asc limit 1
)
select is(
  (
    select array_agg(f.id::text order by f.created_at desc, f.id desc)
    from public.feed_community(
      '71000000-0000-4000-8000-0000000000f1', 'recent',
      (select created_at from cursor2), (select id from cursor2)
    ) f
  ),
  array(
    select '91000000-0000-4000-8000-' || lpad(g.i::text, 12, '0')
    from generate_series(20, 1, -1) as g(i)
  ),
  'B4: a pagina 3 fecha os 60, na ordem'
);

with pagina1 as (
  select f.id, f.created_at
  from public.feed_community('71000000-0000-4000-8000-0000000000f1') f
),
cursor1 as (
  select id, created_at from pagina1 order by created_at asc, id asc limit 1
),
pagina2 as (
  select f.id, f.created_at
  from public.feed_community(
    '71000000-0000-4000-8000-0000000000f1', 'recent',
    (select created_at from cursor1), (select id from cursor1)
  ) f
),
cursor2 as (
  select id, created_at from pagina2 order by created_at asc, id asc limit 1
),
pagina3 as (
  select f.id, f.created_at
  from public.feed_community(
    '71000000-0000-4000-8000-0000000000f1', 'recent',
    (select created_at from cursor2), (select id from cursor2)
  ) f
),
todas as (
  select id from pagina1
  union all select id from pagina2
  union all select id from pagina3
)
select is(
  (select count(*)::text || '/' || count(distinct id)::text from todas),
  '60/60',
  'B5: as tres paginas cobrem os 60 posts, sem um unico repetido'
);

select is(
  (
    select count(*)
    from public.feed_community(
      p_community_id => '71000000-0000-4000-8000-0000000000f1',
      p_limit => 100000
    ) f
  ),
  50::bigint,
  'B6: TETO DO SERVIDOR — pedir 100.000 numa base de 60 posts devolve 50'
);

select is(
  (
    select count(*)
    from public.feed_community(
      p_community_id => '71000000-0000-4000-8000-0000000000f1',
      p_limit => 51
    ) f
  ),
  50::bigint,
  'B7: pedir 51 devolve 50 — o teto e 50, nao 51'
);

select is(
  (
    select count(*)
    from public.feed_community(
      p_community_id => '71000000-0000-4000-8000-0000000000f1',
      p_limit => 50
    ) f
  ),
  50::bigint,
  'B8: o teto permite pedir 50 inteiro'
);

-- ── C. POST PUBLICADO ENTRE DUAS REQUISIÇÕES ────────────────────────────────

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f2') f
  ),
  20::bigint,
  'C1: a pagina 1 de f2 tem 20 linhas'
);

select is(
  (
    select g.id
    from public.feed_community('71000000-0000-4000-8000-0000000000f2') g
    order by g.created_at asc, g.id asc
    limit 1
  ),
  '92000000-0000-4000-8000-000000000006'::uuid,
  'C2: o cursor da pagina 1 e o post 6 — o unico que a pagina seguinte usa'
);

-- O post novo entra AGORA, mais novo que todo o feed: se ele vazasse para a
-- página seguinte, a rolagem mostraria o mesmo cartão duas vezes.
--
-- A escrita é FIXTURE, não produto: volta ao papel de dono para gravar (a policy
-- de INSERT exige vínculo de localidade, e member-one só é membro da comunidade
-- f2 — o gate de escrita não é o que este arquivo mede) e retoma o papel de
-- membro logo abaixo, para as leituras continuarem sendo as de um membro real.
reset role;

insert into public.posts (id, locality_id, user_id, community_id, post_type, content, created_at)
values (
  '92000000-0000-4000-8000-0000000000ff',
  '00000000-0000-4000-8000-0000000000f2',
  '10000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-0000000000f2',
  'text',
  'post publicado no meio da rolagem',
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select g.id
    from public.feed_community('71000000-0000-4000-8000-0000000000f2') g
    order by g.created_at desc, g.id desc
    limit 1
  ),
  '92000000-0000-4000-8000-0000000000ff'::uuid,
  'C3: controle positivo — o post novo E visivel, e aparece no topo da proxima pagina 1'
);

select is(
  (
    select count(*)
    from public.feed_community(
      '71000000-0000-4000-8000-0000000000f2', 'recent',
      '2026-06-01 12:06:00+00'::timestamptz,
      '92000000-0000-4000-8000-000000000006'::uuid
    ) f
    where f.id = '92000000-0000-4000-8000-0000000000ff'::uuid
  ),
  0::bigint,
  'C4: o post publicado entre as duas requisicoes NAO entra na pagina seguinte'
);

select is(
  (
    select count(*)
    from public.feed_community(
      '71000000-0000-4000-8000-0000000000f2', 'recent',
      '2026-06-01 12:06:00+00'::timestamptz,
      '92000000-0000-4000-8000-000000000006'::uuid
    ) f
    where f.id in (
      select ('92000000-0000-4000-8000-' || lpad(g.i::text, 12, '0'))::uuid
      from generate_series(25, 6, -1) as g(i)
    )
  ),
  0::bigint,
  'C5: a pagina seguinte nao repete nada da pagina 1'
);

-- ── D. DOIS POSTS NO MESMO INSTANTE ─────────────────────────────────────────

-- A prova do empate vem PELO FEED, não de uma leitura direta de `posts`: a
-- leitura direta é filtrada por RLS e member-one só tem vínculo de COMUNIDADE
-- nestas fixtures isoladas, não de localidade. Pelo feed a asserção fica mais
-- forte, e não mais fraca: prova que os dois posts são visíveis E que dividem o
-- mesmo instante.
select is(
  (
    select count(*)::text || ' posts em ' || count(distinct f.created_at)::text || ' instante'
    from public.feed_community(
      '71000000-0000-4000-8000-0000000000f3', 'recent', null, null, 50
    ) f
  ),
  '2 posts em 1 instante',
  'D1: a fixture e mesmo um empate — dois posts visiveis, um unico instante'
);

select is(
  (
    select f.id
    from public.feed_community('71000000-0000-4000-8000-0000000000f3', 'recent', null, null, 1) f
  ),
  '93000000-0000-4000-8000-0000000000d2'::uuid,
  'D2: no empate o id desempata — o maior id vem primeiro'
);

select is(
  (
    select f.id
    from public.feed_community(
      '71000000-0000-4000-8000-0000000000f3', 'recent',
      '2026-06-01 12:00:00+00'::timestamptz,
      '93000000-0000-4000-8000-0000000000d2'::uuid,
      1
    ) f
  ),
  '93000000-0000-4000-8000-0000000000d1'::uuid,
  'D3: o outro post do mesmo instante aparece na pagina seguinte'
);

select is(
  (
    select count(*)::text || '/' || count(distinct id)::text
    from (
      select f.id
      from public.feed_community('71000000-0000-4000-8000-0000000000f3', 'recent', null, null, 1) f
      union all
      select f.id
      from public.feed_community(
        '71000000-0000-4000-8000-0000000000f3', 'recent',
        '2026-06-01 12:00:00+00'::timestamptz,
        '93000000-0000-4000-8000-0000000000d2'::uuid,
        1
      ) f
    ) duas
  ),
  '2/2',
  'D4: os dois posts do mesmo instante aparecem, sem repetir'
);

-- ── E. RELEVANTES: JANELA, PISO E LIMITE ────────────────────────────────────
--
-- Aqui o teste volta ao papel de dono: as funções de parâmetro vivem em
-- `private` e NÃO são executáveis por `authenticated` (mesmo padrão de
-- `private.guide_candidate_*`), e o valor EM VIGOR é o que se quer comparar, não
-- uma cópia do número escrita no teste. `feed_community` em si já foi provada
-- executável por `authenticated` em A11 e é exercida como membro em B, C, D e F.

reset role;

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'relevant') f
  ),
  20::bigint,
  'E1: Relevantes devolve no maximo 20 — 26 posts elegiveis, 20 devolvidos'
);

select is(
  (
    select f.id
    from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'relevant') f
    order by f.comment_count desc, f.created_at desc, f.id desc
    limit 1
  ),
  '94000000-0000-4000-8000-000000000101'::uuid,
  'E2: a contagem de comentarios e o criterio de ordem'
);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'relevant') f
    where f.id = '94000000-0000-4000-8000-000000000103'::uuid
  ),
  0::bigint,
  'E3: post na janela e SEM comentario nao entra — o piso de 1 morde'
);

select is(
  (
    select count(*)
    from public.posts p
    where p.id = '94000000-0000-4000-8000-000000000103'::uuid
      and p.created_at >= now() - private.feed_community_relevant_window()
  ),
  1::bigint,
  'E4: controle positivo de E3 — o post sem comentario existe e ESTA na janela'
);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'relevant') f
    where f.id = '94000000-0000-4000-8000-000000000102'::uuid
  ),
  0::bigint,
  'E5: post de 10 dias atras nao entra — a janela de 7 dias morde'
);

select is(
  (
    select count(*)::text || ' comentarios'
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.post_id = '94000000-0000-4000-8000-000000000102'::uuid
      and c.is_deleted = false
      and p.created_at < now() - private.feed_community_relevant_window()
  ),
  '5 comentarios',
  'E6: controle positivo de E5 — o post tem 5 comentarios e esta FORA da janela'
);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'relevant') f
    where f.created_at < now() - private.feed_community_relevant_window()
  ),
  0::bigint,
  'E7: nenhuma linha de Relevantes sai da janela'
);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'relevant') f
    where f.comment_count < private.feed_community_relevant_min_comments()
  ),
  0::bigint,
  'E8: nenhuma linha de Relevantes fica abaixo do piso'
);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'relevant') rel
    where rel.id not in (
      select rec.id
      from public.feed_community('71000000-0000-4000-8000-0000000000f4', 'recent', null, null, 50) rec
    )
  ),
  0::bigint,
  'E9: nenhuma linha de Relevantes e invisivel para Recentes — os dois blocos de tres ramos nao divergiram'
);

-- ── F. OS TRÊS RAMOS, E O GRUPO PRIVADO QUE NÃO VAZA ────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f6') f
  ),
  20::bigint,
  'F1: a pagina 1 de f6 tem 20 linhas'
);

select is(
  (
    select array_agg(x.id::text order by x.created_at desc, x.id desc)
    from (
      select f.id, f.created_at
      from public.feed_community('71000000-0000-4000-8000-0000000000f6') f
      order by f.created_at desc, f.id desc
      limit 2
    ) x
  ),
  array[
    '96000000-0000-4000-8000-0000000000a3',
    '96000000-0000-4000-8000-0000000000a1'
  ],
  'F2: a ordem junta os ramos — o da cidade primeiro, o do grupo publico depois'
);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f6') f
    where f.id = '96000000-0000-4000-8000-0000000000a2'::uuid
  ),
  0::bigint,
  'F3: post de grupo PRIVADO nao aparece na pagina 1'
);

with pagina1 as (
  select f.id, f.created_at
  from public.feed_community('71000000-0000-4000-8000-0000000000f6') f
),
cursor1 as (
  select id, created_at from pagina1 order by created_at asc, id asc limit 1
)
select is(
  (
    select count(*)
    from public.feed_community(
      '71000000-0000-4000-8000-0000000000f6', 'recent',
      (select created_at from cursor1), (select id from cursor1)
    ) f
    where f.id = '96000000-0000-4000-8000-0000000000a2'::uuid
  ),
  0::bigint,
  'F4: post de grupo PRIVADO nao aparece na pagina 2 — nao vaza em pagina nenhuma'
);

with pagina1 as (
  select f.id, f.created_at
  from public.feed_community('71000000-0000-4000-8000-0000000000f6') f
),
cursor1 as (
  select id, created_at from pagina1 order by created_at asc, id asc limit 1
),
pagina2 as (
  select f.id, f.created_at
  from public.feed_community(
    '71000000-0000-4000-8000-0000000000f6', 'recent',
    (select created_at from cursor1), (select id from cursor1)
  ) f
),
todas as (
  select id from pagina1
  union all select id from pagina2
)
select is(
  (select count(*)::text || '/' || count(distinct id)::text from todas),
  '27/27',
  'F5: as duas paginas cobrem os 27 posts visiveis — sem repetir, e o privado fora'
);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f6', 'recent', null, null, 50) f
    where f.id in (
      '96000000-0000-4000-8000-0000000000a1'::uuid,
      '96000000-0000-4000-8000-0000000000a3'::uuid
    )
  ),
  2::bigint,
  'F6: o ramo do grupo publico e o da cidade aparecem juntos na mesma pagina'
);

-- ── G. AUTORIZAÇÃO: ZERO LINHAS EM TODAS AS PÁGINAS ─────────────────────────

-- member-two é PENDENTE na comunidade -001 e não tem vínculo nenhum com f1. A
-- fixture de f1 tem 60 posts, então o zero é a porta fechando, não um feed vazio.

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_community('71000000-0000-4000-8000-0000000000f1') $$,
  'G1: nao-membro recebe ZERO linhas na PAGINA 1'
);

select is_empty(
  $$ select id from public.feed_community(
       p_community_id => '71000000-0000-4000-8000-0000000000f1', p_limit => 50) $$,
  'G2: nao-membro recebe ZERO linhas na pagina do TETO'
);

select is_empty(
  $$ select id from public.feed_community(
       '71000000-0000-4000-8000-0000000000f1', 'recent',
       '2026-06-01 13:00:00+00'::timestamptz,
       '91000000-0000-4000-8000-000000000060'::uuid, 50) $$,
  'G3: nao-membro recebe ZERO linhas com um CURSOR real — em pagina nenhuma'
);

select is_empty(
  $$ select id from public.feed_community('71000000-0000-4000-8000-0000000000f1', 'relevant') $$,
  'G4: nao-membro recebe ZERO linhas tambem em Relevantes'
);

-- non-member (005) não tem vínculo nenhum no produto.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.feed_community('71000000-0000-4000-8000-0000000000f1') $$,
  'G5: autenticado sem vinculo recebe ZERO linhas na pagina 1'
);

select is_empty(
  $$ select id from public.feed_community(
       p_community_id => '71000000-0000-4000-8000-0000000000f1', p_limit => 50) $$,
  'G6: autenticado sem vinculo recebe ZERO linhas na pagina do teto'
);

-- Controle positivo: as MESMAS chamadas, com quem é membro, devolvem linhas. Sem
-- isto, um feed vazio por qualquer outro motivo passaria nos seis negativos.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)
    from public.feed_community('71000000-0000-4000-8000-0000000000f1') f
  ),
  20::bigint,
  'G7: CONTROLE POSITIVO — o membro recebe 20 linhas na mesma pagina'
);

select is(
  (
    select count(*)
    from public.feed_community(
      p_community_id => '71000000-0000-4000-8000-0000000000f1', p_limit => 50
    ) f
  ),
  50::bigint,
  'G8: CONTROLE POSITIVO — o membro recebe 50 linhas na pagina do teto'
);

-- ── H. CURSOR INCOMPLETO ────────────────────────────────────────────────────

select throws_ok(
  $$ select * from public.feed_community(
       '71000000-0000-4000-8000-0000000000f1', 'recent', now(), null) $$,
  'P0001',
  'cursor incompleto: p_before_created_at e p_before_id andam juntos',
  'H1: so o created_at do cursor e recusado pelo servidor'
);

select throws_ok(
  $$ select * from public.feed_community(
       '71000000-0000-4000-8000-0000000000f1', 'recent', null, gen_random_uuid()) $$,
  'P0001',
  'cursor incompleto: p_before_created_at e p_before_id andam juntos',
  'H2: so o id do cursor e recusado pelo servidor'
);

select * from finish();
rollback;