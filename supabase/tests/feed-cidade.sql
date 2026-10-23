-- O feed da cidade (lote 5, N2 — migration 20261024100000).
--
-- Prova a regra de leitura que o dono fixou no ADR-20261023: o feed da cidade
-- devolve as publicações da cidade da pessoa SEM grupo e SEM vila. O positivo
-- (a publicação da cidade aparece) vale pouco sem os negativos: é o negativo
-- que impede o vazamento da vila, do grupo Fechado e de outra cidade — o risco
-- declarado no ADR. A paginação e as contagens são as mesmas dos outros feeds.

begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- As fixtures de comunidade já trazem uma publicação de VILA (900…001), uma de
-- grupo ABERTO (900…002) e uma de grupo FECHADO (900…003), todas na mesma
-- localidade da pessoa. Aqui entram as da cidade e as que não podem vazar.
insert into public.posts (
  id, locality_id, user_id, community_id, group_id, post_type, content,
  created_at, is_deleted
)
values
  (
    '90000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    null, null, 'text',
    'Aviso da cidade para quem mora aqui',
    '2026-08-04 16:00:00+00', false
  ),
  (
    '90000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    null, null, 'text',
    'Aviso de outra cidade',
    '2026-08-04 17:00:00+00', false
  ),
  (
    '90000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    null, null, 'text',
    'Publicacao removida pela moderacao',
    '2026-08-04 18:00:00+00', true
  );

-- Volume para a paginação: 9 publicações da cidade, 5 delas no MESMO instante
-- (o empate que obriga o desempate por id).
insert into public.posts (
  id, locality_id, user_id, community_id, group_id, post_type, content, created_at
)
select
  ('f1000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  null, null, 'text',
  'Publicacao da cidade ' || g,
  case when g between 5 and 9 then '2026-09-20 12:00:00+00'::timestamptz
       else '2026-09-01 12:00:00+00'::timestamptz + (g || ' hours')::interval end
from generate_series(1, 9) as g;

-- Contagens e estado da pessoa, provados DENTRO de uma página.
insert into public.comments (post_id, user_id, content)
select '90000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', 'Comentario ' || g
from generate_series(1, 2) as g;

insert into public.post_reactions (post_id, user_id)
values
  ('90000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002'),
  ('90000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001');

insert into public.post_follows (post_id, user_id)
values ('90000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001');

-- ── POSITIVO: membro da localidade ─────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select isnt_empty(
  $$ select id from public.feed_locality('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000010' $$,
  'N2+: a publicação da cidade aparece no feed da cidade da pessoa'
);

select is(
  (
    select t.comment_count
    from public.feed_locality('00000000-0000-4000-8000-000000000001') t
    where t.id = '90000000-0000-4000-8000-000000000010'
  ),
  2::bigint,
  'N2+: a contagem de respostas sai dentro do feed'
);

select is(
  (
    select t.reaction_count
    from public.feed_locality('00000000-0000-4000-8000-000000000001') t
    where t.id = '90000000-0000-4000-8000-000000000010'
  ),
  2::bigint,
  'N2+: a contagem de reações sai dentro do feed'
);

select is(
  (
    select t.my_reaction
    from public.feed_locality('00000000-0000-4000-8000-000000000001') t
    where t.id = '90000000-0000-4000-8000-000000000010'
  ),
  true,
  'N2+: my_reaction diz que a própria pessoa reagiu'
);

select is(
  (
    select t.my_follow
    from public.feed_locality('00000000-0000-4000-8000-000000000001') t
    where t.id = '90000000-0000-4000-8000-000000000010'
  ),
  true,
  'N2+: my_follow diz que a própria pessoa acompanha'
);

-- ── NEGATIVO: o que NÃO pode aparecer ──────────────────────────────────────

select is_empty(
  $$ select id from public.feed_locality('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000001' $$,
  'N2-: publicação de VILA (community_id) não aparece no feed da cidade'
);

select is_empty(
  $$ select id from public.feed_locality('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000003' $$,
  'N2-: publicação de grupo FECHADO não aparece no feed da cidade'
);

select is_empty(
  $$ select id from public.feed_locality('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000002' $$,
  'N2-: publicação de grupo ABERTO também não aparece — o feed é sem grupo'
);

select is_empty(
  $$ select id from public.feed_locality('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000011' $$,
  'N2-: publicação de OUTRA cidade não aparece'
);

select is_empty(
  $$ select id from public.feed_locality('00000000-0000-4000-8000-000000000001')
     where id = '90000000-0000-4000-8000-000000000012' $$,
  'N2-: publicação removida pela moderação não aparece'
);

-- ── Paginação: as páginas somadas são o feed inteiro, sem repetir nem pular ─

create temp table feed_inteiro on commit drop as
select row_number() over () as pos, id
from public.feed_locality('00000000-0000-4000-8000-000000000001', 'recent');

create temp table feed_paginado on commit drop as
select row_number() over (order by pg, ord) as pos, id
from (
  select g as pg, t.id, row_number() over (partition by g) as ord
  from generate_series(0, (select count(*) from feed_inteiro)::int / 4) as g,
       lateral public.feed_locality(
         '00000000-0000-4000-8000-000000000001', 'recent', 4, g * 4
       ) as t
) x;

select results_eq(
  $$ select id from feed_paginado order by pos $$,
  $$ select id from feed_inteiro order by pos $$,
  'N2: as páginas somadas são o feed inteiro, na mesma ordem, sem repetir nem pular'
);

select is(
  (
    select count(*)
    from public.feed_locality('00000000-0000-4000-8000-000000000001', 'recent', 4, 0)
  ),
  4::bigint,
  'N2: p_limit limita a página'
);

select results_eq(
  $$
    select id from public.feed_locality('00000000-0000-4000-8000-000000000001', 'recent')
    where created_at = '2026-09-20 12:00:00+00'
  $$,
  $$
    values
      ('f1000000-0000-4000-8000-000000000009'::uuid),
      ('f1000000-0000-4000-8000-000000000008'::uuid),
      ('f1000000-0000-4000-8000-000000000007'::uuid),
      ('f1000000-0000-4000-8000-000000000006'::uuid),
      ('f1000000-0000-4000-8000-000000000005'::uuid)
  $$,
  'N2: publicações do mesmo instante saem por id, do maior para o menor'
);

-- ── NEGATIVO: quem não é membro da localidade não lê nada ──────────────────

-- Membro da OUTRA cidade pedindo a cidade da pessoa: nada.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is_empty(
  $$ select 1 from public.feed_locality('00000000-0000-4000-8000-000000000001') $$,
  'N2-: membro de outra cidade não lê o feed desta cidade'
);

-- Autorizado sem vínculo nenhum com a localidade: nada, nem na primeira página.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select is_empty(
  $$ select 1 from public.feed_locality('00000000-0000-4000-8000-000000000001', 'recent', 20, 0) $$,
  'N2-: quem não é membro da localidade não vê página nenhuma'
);

select * from finish();
rollback;