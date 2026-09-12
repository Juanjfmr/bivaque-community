-- RECON-030 — artigo estruturado do Guia (prancha 25).
--
-- Cobre a migration 20260910202110_guide_article.sql: visibilidade do artigo
-- publicado vs. rascunho, escopo de localidade, sugestão de correção do
-- membro (própria) e decisão da curadoria (aplicar/rejeitar) com a versão
-- publicada anterior registrada.
--
-- PENDÊNCIA DE EXECUÇÃO: este arquivo existe no diff, mas NÃO foi executado
-- nesta sessão. O banco local compartilhado estava semeado e em uso por
-- outros executores; test:db exige banco SEM seed. Comando que falta:
--   npx pnpm@11.18.0 exec supabase db reset --local --no-seed
--   npx pnpm@11.18.0 test:db
--   npx pnpm@11.18.0 db:lint

begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

\ir fixtures/foundation.inc

-- ── fixtures (owner) ────────────────────────────────────────────────────────
-- Duas entradas aprovadas em Manaus (locality 00000000-...-0001): uma sustenta
-- o artigo publicado, outra o rascunho. foundation.inc já cria os membros.

reset role;

insert into public.arrival_guide_entries (
  id, locality_id, category, name, description, status
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'transporter',
    'Mudanca assistida',
    'Referencia que sustenta o artigo publicado.',
    'approved'
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'school',
    'Escola em rascunho',
    'Referencia cujo artigo ainda nao foi publicado.',
    'approved'
  );

insert into public.guide_articles (
  id, entry_id, title, subtitle, summary, status, reviewed_at
)
values
  (
    'b1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000001',
    'Como organizar a mudanca para outra cidade',
    'Um roteiro para preparar a saida e a chegada',
    'Resumo do artigo publicado.',
    'published',
    now()
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    'a1000000-0000-4000-8000-000000000002',
    'Artigo ainda em rascunho',
    null,
    null,
    'draft',
    null
  );

insert into public.guide_article_sections (
  id, article_id, position, anchor, title, body
)
values
  (
    'c1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    0,
    'antes-de-contratar',
    'Antes de contratar',
    'Peca orcamentos por escrito de pelo menos tres empresas.'
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'b1000000-0000-4000-8000-000000000001',
    1,
    'ao-chegar',
    'Ao chegar',
    'Confirme medidas de portas e elevadores antes da descarga.'
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000002',
    0,
    'rascunho',
    'Rascunho',
    'Este corpo nao pode aparecer para membros.'
  );

-- Uma sugestao ja existente do member-one, para leitura de retorno.
insert into public.guide_correction_requests (
  id, article_id, section_id, requester_id, description, reference_text
)
values (
  'd1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'O telefone da transportadora mudou.',
  'https://transportadora.example.invalid/contato'
);

-- member-one e operador (mesma ponte do guide-from-reply.sql).
insert into public.operators (auth_user_id)
values ('10000000-0000-4000-8000-000000000001');

-- ── leitura do membro da localidade ─────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select title from public.guide_articles
    where id = 'b1000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Como organizar a mudanca para outra cidade'::text) $$,
  'member sees the published article'
);

select is_empty(
  $$
    select 1 from public.guide_articles
    where id = 'b1000000-0000-4000-8000-000000000002'
  $$,
  'member cannot see a draft article'
);

select results_eq(
  $$
    select anchor from public.guide_article_sections
    where article_id = 'b1000000-0000-4000-8000-000000000001'
    order by position
  $$,
  $$ values ('antes-de-contratar'::text), ('ao-chegar'::text) $$,
  'member sees the published sections in order'
);

select is_empty(
  $$
    select 1 from public.guide_article_sections
    where article_id = 'b1000000-0000-4000-8000-000000000002'
  $$,
  'member cannot see draft sections'
);

select results_eq(
  $$
    select description from public.guide_correction_requests
    where id = 'd1000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('O telefone da transportadora mudou.'::text) $$,
  'requester sees their own correction request'
);

-- ── outro membro da mesma localidade não lê a sugestão alheia ───────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.guide_correction_requests',
  'another member cannot read someone else correction request'
);

-- ── sugestão: o solicitante é a sessão ──────────────────────────────────────

-- member-two tenta inserir em nome de member-one: a policy exige
-- requester_id = auth.uid(), então a inserção é recusada (42501).
select throws_ok(
  $$
    insert into public.guide_correction_requests (
      article_id, section_id, requester_id, description
    )
    values (
      'b1000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      'Sugestao forjada em nome de outro membro.'
    )
  $$,
  42501,
  null,
  'a member cannot submit a correction as another requester'
);

-- member-two sugere para o artigo publicado da própria localidade.
select lives_ok(
  $$
    insert into public.guide_correction_requests (
      article_id, section_id, requester_id, description
    )
    values (
      'b1000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000002',
      'O texto de chegada pode citar o prazo da mudanca.'
    )
  $$,
  'a member can submit a correction for a published article in their locality'
);

-- ── membro de outra localidade não enxerga o artigo ─────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.guide_articles',
  'a member of another locality sees no articles'
);

-- ── decisão da curadoria (service_role) ─────────────────────────────────────

reset role;

insert into public.guide_correction_requests (
  id, article_id, section_id, requester_id, description
)
values (
  'd1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'Atualizar o corpo de "Antes de contratar".'
);

-- não-operador não decide.
select throws_ok(
  $$
    select public.apply_guide_correction(
      'd1000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid,
      'nota',
      'Antes de contratar (revisado)',
      'Corpo revisado.',
      null
    )
  $$,
  42501,
  null,
  'a non-operator cannot apply a correction'
);

-- operador aplica.
select lives_ok(
  $$
    select public.apply_guide_correction(
      'd1000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      'correcao aplicada na curadoria',
      'Antes de contratar (revisado)',
      'Corpo revisado.',
      null
    )
  $$,
  'an operator applies the correction'
);

select results_eq(
  $$
    select title, body from public.guide_article_sections
    where id = 'c1000000-0000-4000-8000-000000000001'
  $$,
  $$ values ('Antes de contratar (revisado)'::text, 'Corpo revisado.'::text) $$,
  'applying the correction updates the section'
);

select results_eq(
  $$
    select count(*)::int from public.guide_article_revisions
    where article_id = 'b1000000-0000-4000-8000-000000000001'
  $$,
  $$ values (1) $$,
  'applying the correction records the previous published version'
);

select results_eq(
  $$
    select status from public.guide_correction_requests
    where id = 'd1000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('applied'::text) $$,
  'applying the correction marks the request as applied'
);

select throws_ok(
  $$
    select public.apply_guide_correction(
      'd1000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      'segunda vez',
      null,
      'Outro corpo.',
      null
    )
  $$,
  55000,
  null,
  'an already decided request cannot be applied again'
);

-- rejeição exige justificativa.
insert into public.guide_correction_requests (
  id, article_id, section_id, requester_id, description
)
values (
  'd1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000001',
  null,
  '10000000-0000-4000-8000-000000000002',
  'Sugestao sem procedencia.'
);

select throws_ok(
  $$
    select public.reject_guide_correction(
      'd1000000-0000-4000-8000-000000000003'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      '   '
    )
  $$,
  22023,
  null,
  'rejecting without a justification is refused'
);

select lives_ok(
  $$
    select public.reject_guide_correction(
      'd1000000-0000-4000-8000-000000000003'::uuid,
      '10000000-0000-4000-8000-000000000001'::uuid,
      'informacao ja correta na versao vigente'
    )
  $$,
  'an operator rejects the correction with a justification'
);

select * from finish();
rollback;
