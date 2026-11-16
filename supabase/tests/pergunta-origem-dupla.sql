-- RUN-178 — pergunta de origem dupla (Também perguntar à cidade).
--
-- A regra do dono (ADR-20261024 §1) e a execução (ADR-20261116): a pergunta
-- feita num grupo Aberto é UMA linha de recommendation_requests com
-- locality_id + group_id. Este teste prova, por escrita direta na tabela:
--   * o positivo: membro do grupo cria a linha dupla;
--   * os quatro vetos: não membro, grupo Fechado, grupo apagado (o estado
--     "Encerrado" ainda não existe no schema) e cidade diferente da do grupo;
--   * a leitura: a cidade vê a linha em list_indications COM o nome do grupo, e
--     outra cidade não vê;
--   * seguir: quem vê segue (cidade ou grupo), quem não vê é recusado;
--   * a contagem da cidade (count_indications) conta a linha dupla e o que a
--     pessoa ocultou some dela;
--   * resolver e reabrir continuam funcionando na linha dupla.

begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- ── POSITIVO: membro aprova o grupo Aberto cria a linha de origem dupla ─────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.recommendation_requests (
      id, author_id, locality_id, group_id, title, body, category
    )
    values (
      '60000000-0000-4000-8000-0000000000d1',
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'Alguem indica personal para corrida?',
      'Procuro indicacao de personal que atenda o grupo de corrida nas manhas.',
      'esporte_lazer'
    )
  $$,
  'D+ — membro do grupo Aberto cria a pergunta com cidade e grupo juntos'
);

select is(
  (
    select group_id
    from public.recommendation_requests
    where id = '60000000-0000-4000-8000-0000000000d1'
  ),
  '40000000-0000-4000-8000-000000000001'::uuid,
  'D+ — a linha guarda o grupo de origem'
);

-- ── VETO 1: não membro do grupo ────────────────────────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id, locality_id, group_id, title, body, category
    )
    values (
      '10000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'Pergunta de quem nao esta no grupo',
      'Corpo valido o suficiente para passar pela regra de tamanho.',
      'outros'
    )
  $$,
  42501,
  null,
  'D- — não membro do grupo não cria pergunta de origem dupla'
);

-- ── VETO 2: grupo Fechado (o dono do grupo é membro aprovado) ──────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id, locality_id, group_id, title, body, category
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002',
      'Pergunta de grupo fechado para a cidade',
      'Corpo valido o suficiente para passar pela regra de tamanho.',
      'outros'
    )
  $$,
  42501,
  null,
  'D- — grupo Fechado não pergunta à cidade nem para o próprio dono'
);

-- ── VETO 3: grupo apagado (fora do ar) ─────────────────────────────────────

reset role;
update public.groups
set is_deleted = true
where id = '40000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id, locality_id, group_id, title, body, category
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',
      'Pergunta de grupo fora do ar',
      'Corpo valido o suficiente para passar pela regra de tamanho.',
      'outros'
    )
  $$,
  42501,
  null,
  'D- — grupo apagado não pergunta à cidade'
);

reset role;
update public.groups
set is_deleted = false
where id = '40000000-0000-4000-8000-000000000001';

-- ── VETO 4: cidade diferente da cidade do grupo ────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select throws_ok(
  $$
    insert into public.recommendation_requests (
      author_id, locality_id, group_id, title, body, category
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000001',
      'Pergunta de outra cidade no grupo',
      'Corpo valido o suficiente para passar pela regra de tamanho.',
      'outros'
    )
  $$,
  42501,
  null,
  'D- — cidade da pergunta diferente da cidade do grupo é recusada'
);

-- ── LEITURA: a cidade vê com o nome do grupo ───────────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select results_eq(
  $$
    select group_name from public.list_indications('00000000-0000-4000-8000-000000000001')
    where id = '60000000-0000-4000-8000-0000000000d1'
  $$,
  $$ values ('Grupo de Corrida'::text) $$,
  'D+ — outro membro da cidade vê a pergunta dupla em Indicações com o nome do grupo'
);

-- ── LEITURA: outra cidade não vê ───────────────────────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);

select is_empty(
  $$
    select 1 from public.recommendation_requests
    where id = '60000000-0000-4000-8000-0000000000d1'
  $$,
  'D- — quem é de outra cidade não vê a pergunta de origem dupla'
);

select throws_ok(
  $$
    insert into public.recommendation_saves (user_id, request_id)
    values (
      '10000000-0000-4000-8000-000000000003',
      '60000000-0000-4000-8000-0000000000d1'
    )
  $$,
  42501,
  null,
  'D- — quem não vê a pergunta também não a segue'
);

-- ── SEGUIR: a policy nova aceita o que é visível ───────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select lives_ok(
  $$
    insert into public.recommendation_saves (user_id, request_id)
    values (
      '10000000-0000-4000-8000-000000000004',
      '60000000-0000-4000-8000-0000000000d1'
    )
  $$,
  'D+ — membro da cidade segue a pergunta de origem dupla'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$
    insert into public.recommendation_saves (user_id, request_id)
    values (
      '10000000-0000-4000-8000-000000000002',
      '60000000-0000-4000-8000-0000000000d1'
    )
  $$,
  'D+ — membro do grupo também segue a pergunta de origem dupla'
);

-- ── CONTAGEM: a linha dupla entra, o oculto sai ────────────────────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select is(
  public.count_indications('00000000-0000-4000-8000-000000000001'),
  0,
  'D+ — pergunta aberta não conta como resolvida'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$ select public.mark_recommendation_resolved('60000000-0000-4000-8000-0000000000d1') $$,
  'D+ — a autora resolve a pergunta de origem dupla sem resposta marcada'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);

select is(
  public.count_indications('00000000-0000-4000-8000-000000000001'),
  1,
  'D+ — a contagem da cidade soma a pergunta resolvida de origem dupla'
);

select lives_ok(
  $$
    insert into public.hidden_questions (user_id, request_id)
    values (
      '10000000-0000-4000-8000-000000000004',
      '60000000-0000-4000-8000-0000000000d1'
    )
  $$,
  'D+ — quem ocultou guarda a escolha'
);

select is(
  public.count_indications('00000000-0000-4000-8000-000000000001'),
  0,
  'D+ — o que a pessoa ocultou some da contagem dela, como some da lista'
);

-- ── REABRIR: a linha dupla continua sendo pergunta para tudo ───────────────

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

select lives_ok(
  $$ select public.reopen_recommendation('60000000-0000-4000-8000-0000000000d1') $$,
  'D+ — a autora reabre a pergunta de origem dupla'
);

select is(
  (
    select is_resolved
    from public.recommendation_requests
    where id = '60000000-0000-4000-8000-0000000000d1'
  ),
  false,
  'D+ — reabrir devolve a pergunta dupla ao estado aberto'
);

select * from finish();
rollback;