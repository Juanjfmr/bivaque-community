-- P3a — fila de curadoria assistida do Guia, escopo de banco.
--
-- Autoridade: docs/decisions/ADR-20260921-curadoria-assistida-do-guia.md
-- Migration sob prova: 20260921134129_guide_candidate_queue.sql
--
-- O que esta suíte prova, e o que ela NÃO prova:
--   + a seleção das respostas devidas começa por resolved_reply_id (o sinal que
--     a autora da pergunta marcou) — pergunta aberta não entra;
--   + o teto por localidade por execução corta POR localidade, não no total;
--   + o piso de confidence impede a entrada na fila;
--   + a dedup contra o Guia da localidade acontece ANTES de qualquer escrita, e
--     o bloqueio é o NOME, não a resposta: a mesma chamada com outro nome grava;
--   + a gravação é `pending`, `source='ai'`, com `confidence` e
--     `source_reply_id`, e sem `submitted_by` (a máquina não é membro);
--   + a candidata `pending` NÃO é legível por membro comum da localidade;
--   + o índice único parcial impede duas entradas para a mesma resposta;
--   + a função da fila não é executável por `authenticated`;
--   + o payload do despacho é mínimo e nunca carrega `author_id`;
--   + o nono job existe no padrão `bivaque-*`.
--   − NADA aqui chama IA, lê o Vault ou faz `net.http_post`: a extração é
--     SINTÉTICA e o despacho ao endpoint interno é o P3b.
--
-- Toda fixture vive em localidades criadas DENTRO desta transação (a cidade da
-- fixture no `foundation.inc` e uma cidade só do teto). Isso é deliberado: a
-- cidade de Manaus carrega resíduo de rodadas anteriores no banco local e uma
-- asserção de conjunto exato contra ela mediria o resíduo, não a migration.

begin;

create extension if not exists pgtap with schema extensions;
select plan(33);

\ir fixtures/foundation.inc

reset role;

-- Cidade só do teste do teto: prova que o teto é POR localidade e que uma
-- cidade cheia não corta a outra.
insert into public.localities (id, slug, city_name, state_code, country_code, ibge_code)
values (
  '00000000-0000-4000-8000-0000000000f3',
  'test-cap-locality',
  'Cap City',
  'EX',
  'BR',
  '9999998'
);

-- ── fixtures: três respostas marcadas na cidade da fixture, uma pergunta
--    aberta, e uma resposta marcada na cidade do teto ──────────────────────
-- O pedido nasce sem marca; a marca entra depois que a resposta existe, porque
-- o trigger `validate_recommendation_resolved_reply` exige que a resposta
-- marcada seja resposta DESTE pedido.

insert into public.recommendation_requests (
  id, locality_id, author_id, title, body, category
) values
  (
    '70000000-0000-4000-8000-000000000200',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Indicam um colégio que atenda dependentes de militar?',
    'Procuro um colégio para o dependente na zona norte.',
    'educacao'
  ),
  (
    '70000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Qual transportadora entrega mudança para a zona leste?',
    'Preciso de uma transportadora que atenda bem a zona leste.',
    'transporte'
  ),
  (
    '70000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Indicam um hospital de referência na cidade?',
    'Procuro um hospital com pronto atendimento perto de casa.',
    'outros'
  ),
  (
    '70000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Indicam um despachante de confiança?',
    'Procuro um despachante para resolver documentos.',
    'servicos_locais'
  ),
  (
    '70000000-0000-4000-8000-000000000300',
    '00000000-0000-4000-8000-0000000000f3',
    '10000000-0000-4000-8000-000000000001',
    'Indicam um despachante na cidade do teto?',
    'Procuro um despachante aqui na cidade do teto.',
    'servicos_locais'
  );

insert into public.recommendation_replies (id, request_id, author_id, body) values
  (
    '80000000-0000-4000-8000-000000000200',
    '70000000-0000-4000-8000-000000000200',
    '10000000-0000-4000-8000-000000000002',
    'O Colégio Alfa atende dependentes e fica perto da Vila Nova.'
  ),
  (
    '80000000-0000-4000-8000-000000000201',
    '70000000-0000-4000-8000-000000000201',
    '10000000-0000-4000-8000-000000000001',
    'A Transportadora Beta entrega em toda a cidade e cuidou bem da mudança.'
  ),
  (
    '80000000-0000-4000-8000-000000000202',
    '70000000-0000-4000-8000-000000000202',
    '10000000-0000-4000-8000-000000000002',
    'O Hospital Gama tem pronto atendimento e fica na avenida central.'
  ),
  (
    '80000000-0000-4000-8000-000000000203',
    '70000000-0000-4000-8000-000000000203',
    '10000000-0000-4000-8000-000000000001',
    'Ainda ninguém respondeu com um despachante.'
  ),
  (
    '80000000-0000-4000-8000-000000000300',
    '70000000-0000-4000-8000-000000000300',
    '10000000-0000-4000-8000-000000000002',
    'O Despachante Delta resolve tudo na Vila Nova.'
  );

-- Quatro pedidos marcados; o pedido ...0203 fica ABERTO de propósito.
update public.recommendation_requests
   set is_resolved = true,
       resolved_at = now(),
       resolved_by = author_id,
       resolved_reply_id = case id
         when '70000000-0000-4000-8000-000000000200'::uuid
           then '80000000-0000-4000-8000-000000000200'::uuid
         when '70000000-0000-4000-8000-000000000201'::uuid
           then '80000000-0000-4000-8000-000000000201'::uuid
         when '70000000-0000-4000-8000-000000000202'::uuid
           then '80000000-0000-4000-8000-000000000202'::uuid
         when '70000000-0000-4000-8000-000000000300'::uuid
           then '80000000-0000-4000-8000-000000000300'::uuid
       end
 where id in (
   '70000000-0000-4000-8000-000000000200',
   '70000000-0000-4000-8000-000000000201',
   '70000000-0000-4000-8000-000000000202',
   '70000000-0000-4000-8000-000000000300'
 );

-- Uma entrada APROVADA que já está no Guia da cidade antes de o job rodar. É o
-- caso do ADR: o lugar já existe, então a resposta que o indica não pode virar
-- uma segunda entrada.
insert into public.arrival_guide_entries (
  id, locality_id, category, name, description, status, source
) values (
  'a3000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'hospital',
  'Hospital Gama',
  'Já estava no Guia antes do job.',
  'approved',
  'manual'
);

-- ── A. vocabulário e defaults ─────────────────────────────────────────────

select is(
  private.guide_candidate_max_per_locality(),
  10,
  'A1: o teto por localidade por execução tem default 10'
);

select is(
  private.guide_candidate_min_confidence(),
  60::smallint,
  'A2: o piso de confidence tem default 60'
);

select is(
  private.guide_candidate_name_key('  Colégio   ALFA '),
  'colegio alfa',
  'A3: a chave de nome dobra acento, caixa e espaço'
);

select is(
  private.guide_candidate_name_key('   '),
  null,
  'A4: nome em branco não tem chave (não deduplica contra tudo)'
);

-- ─ B. seleção das respostas devidas ───────────────────────────────────────

select results_eq(
  $$
    select reply_id
      from private.guide_candidate_select_due(10)
     where reply_id in (
       '80000000-0000-4000-8000-000000000200',
       '80000000-0000-4000-8000-000000000201',
       '80000000-0000-4000-8000-000000000202',
       '80000000-0000-4000-8000-000000000203',
       '80000000-0000-4000-8000-000000000300'
     )
  $$,
  $$
    values
      ('80000000-0000-4000-8000-000000000200'::uuid),
      ('80000000-0000-4000-8000-000000000201'::uuid),
      ('80000000-0000-4000-8000-000000000202'::uuid),
      ('80000000-0000-4000-8000-000000000300'::uuid)
  $$,
  'B1: só as respostas MARCADAS estão devidas'
);

select is_empty(
  $$
    select 1 from private.guide_candidate_select_due(10)
     where reply_id = '80000000-0000-4000-8000-000000000203'
  $$,
  'B2: NEGATIVO — resposta de pergunta ainda aberta não é devida'
);

select is(
  (
    select count(*)::integer
      from private.guide_candidate_select_due(2)
     where locality_id = '00000000-0000-4000-8000-000000000002'
  ),
  2,
  'B3: o teto corta a cidade que tem três respostas devidas'
);

select is(
  (
    select count(*)::integer
      from private.guide_candidate_select_due(2)
     where locality_id = '00000000-0000-4000-8000-0000000000f3'
  ),
  1,
  'B4: o teto é POR localidade — a outra cidade não é cortada pelo teto da primeira'
);

-- ── C. piso de confidence: nada abaixo dele entra na fila ──────────────────

select is(
  private.guide_candidate_enqueue(
    '80000000-0000-4000-8000-000000000201',
    'transporter',
    'Transportadora Beta',
    'Entrega em toda a cidade.',
    59::smallint
  ),
  null,
  'C1: confidence abaixo do piso devolve null'
);

select is_empty(
  $$ select 1 from public.arrival_guide_entries
      where source_reply_id = '80000000-0000-4000-8000-000000000201' $$,
  'C2: confidence abaixo do piso não escreve nada'
);

--  D. a gravação: pending, source='ai', confidence, source_reply_id ───────

select ok(
  (
    select private.guide_candidate_enqueue(
      '80000000-0000-4000-8000-000000000200',
      'school',
      '  Colégio Alfa ',
      'Atende dependentes de militar, perto da Vila Nova.',
      90::smallint
    )
  ) is not null,
  'D1: extração acima do piso grava a candidata e devolve o id'
);

select results_eq(
  $$
    select status::text, source::text, confidence, source_reply_id::text,
           submitted_by::text, name
      from public.arrival_guide_entries
     where source_reply_id = '80000000-0000-4000-8000-000000000200'
  $$,
  $$
    values (
      'pending'::text,
      'ai'::text,
      90::smallint,
      '80000000-0000-4000-8000-000000000200'::text,
      null::text,
      'Colégio Alfa'::text
    )
  $$,
  'D2: a candidata é pending/ai, com confidence e a resposta de origem, e SEM submitted_by'
);

select is_empty(
  $$ select 1 from public.arrival_guide_entries
      where source_reply_id = '80000000-0000-4000-8000-000000000200'
        and status = 'approved' $$,
  'D3: a candidata não nasce aprovada — a curadoria continua humana'
);

-- ─ E. dedup contra o Guia da localidade, ANTES de qualquer escrita ────────

select is(
  private.guide_candidate_enqueue(
    '80000000-0000-4000-8000-000000000201',
    'transporter',
    ' colegio   alfa ',
    'Mesmo lugar, nome com outra caixa e outro espaço.',
    95::smallint
  ),
  null,
  'E1: nome que normaliza para uma entrada da cidade não escreve'
);

select is_empty(
  $$ select 1 from public.arrival_guide_entries
      where source_reply_id = '80000000-0000-4000-8000-000000000201' $$,
  'E2: a dedup bloqueou ANTES da escrita — nenhuma linha pendente sobrou para trás'
);

select ok(
  (
    select private.guide_candidate_enqueue(
      '80000000-0000-4000-8000-000000000201',
      'transporter',
      'Transportadora Beta',
      'Entrega em toda a cidade.',
      95::smallint
    )
  ) is not null,
  'E3: o bloqueio de E1 era o NOME — a mesma resposta com outro nome grava'
);

select is(
  (
    select count(*)::integer
      from public.arrival_guide_entries
     where source_reply_id = '80000000-0000-4000-8000-000000000201'
  ),
  1,
  'E4: agora existe exatamente uma candidata para essa resposta'
);

select is(
  private.guide_candidate_enqueue(
    '80000000-0000-4000-8000-000000000201',
    'transporter',
    'Transportadora Beta Revisitada',
    'Segunda extração da mesma resposta.',
    99::smallint
  ),
  null,
  'E5: a mesma resposta não gera segunda entrada — a chamada repetida é idempotente'
);

select is(
  private.guide_candidate_enqueue(
    '80000000-0000-4000-8000-000000000202',
    'hospital',
    'HOSPITAL GAMA',
    'Mesmo hospital, extração com caixa alta.',
    95::smallint
  ),
  null,
  'E6: entrada já APROVADA no Guia da cidade também bloqueia a candidata'
);

select is_empty(
  $$ select 1 from public.arrival_guide_entries
      where source_reply_id = '80000000-0000-4000-8000-000000000202' $$,
  'E7: nada foi escrito para a resposta do hospital'
);

-- ── F. a seleção enxerga o que já foi escrito ─────────────────────────────

select results_eq(
  $$
    select reply_id
      from private.guide_candidate_select_due(10)
     where locality_id = '00000000-0000-4000-8000-000000000002'
  $$,
  $$ values ('80000000-0000-4000-8000-000000000202'::uuid) $$,
  'F1: resposta que já tem entrada sai da lista de devidas'
);

-- ── G. negativo de RLS: a candidata pending não é legível pelo membro ──────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select name from public.arrival_guide_entries
     where locality_id = '00000000-0000-4000-8000-000000000002'
     order by name
  $$,
  $$ values ('Hospital Gama'::text) $$,
  'G1: controle positivo — o membro da cidade lê o item aprovado'
);

select is(
  (
    select count(*)::integer
      from public.arrival_guide_entries
     where locality_id = '00000000-0000-4000-8000-000000000002'
       and status = 'pending'
  ),
  0,
  'G2: NEGATIVO — o membro da cidade não enxerga nenhuma candidata pending'
);

reset role;

select is(
  (
    select count(*)::integer
      from public.arrival_guide_entries
     where locality_id = '00000000-0000-4000-8000-000000000002'
       and status = 'pending'
  ),
  2,
  'G3: as duas candidatas pending EXISTEM — a invisibilidade de G2 é a policy, não ausência'
);

-- ── H. o índice único parcial em source_reply_id ──────────────────────────

select throws_ok(
  $$
    insert into public.arrival_guide_entries (
      locality_id, category, name, description, status, source, confidence,
      source_reply_id
    ) values (
      '00000000-0000-4000-8000-000000000002',
      'school',
      'Colégio Alfa Duplicado',
      'Segunda entrada para a mesma resposta.',
      'pending',
      'ai',
      80,
      '80000000-0000-4000-8000-000000000200'
    )
  $$,
  '23505',
  null,
  'H1: NEGATIVO — segunda entrada para o mesmo source_reply_id falha (23505)'
);

select has_index(
  'public',
  'arrival_guide_entries',
  'arrival_guide_entries_source_reply_id_key',
  'H2: o índice único em source_reply_id existe'
);

select matches(
  (
    select indexdef from pg_indexes
     where schemaname = 'public'
       and tablename = 'arrival_guide_entries'
       and indexname = 'arrival_guide_entries_source_reply_id_key'
  ),
  'UNIQUE INDEX',
  'H3: o índice é único'
);

-- ── I. a fila não é superfície do membro ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select private.guide_candidate_prepare() $$,
  '42501',
  null,
  'I1: NEGATIVO — authenticated não executa a preparação da fila'
);

reset role;

-- ─ J. o payload do despacho é mínimo e não carrega identidade ───────────

-- O payload cobre TODAS as cidades devidas do banco, não só as da fixture — por
-- isso as asserções abaixo são por item e por localidade, nunca por tamanho
-- total: o banco local carrega respostas devidas de Manaus, e uma contagem
-- global mediria o resíduo.

select ok(
  (
    with payload as (
      select private.guide_candidate_prepare(10) as items
    ),
    element as (
      select item
        from payload, jsonb_array_elements(payload.items) as item
    )
    select (select count(*) from element) > 0
       and not exists (
         select 1
           from element
          where (select count(*) from jsonb_object_keys(item)) <> 3
             or not (item ? 'reply_id' and item ? 'locality_id' and item ? 'body')
       )
  ),
  'J1: todo item do payload leva exatamente corpo, localidade e resposta'
);

select is_empty(
  $$
    select 1
      from jsonb_array_elements(private.guide_candidate_prepare(10)) as element
     where element ? 'author_id'
  $$,
  'J2: NEGATIVO — o payload nunca carrega author_id (decisão 6 do ADR)'
);

select is_empty(
  $$
    select 1
      from jsonb_array_elements(private.guide_candidate_prepare(1)) as element
     group by element ->> 'locality_id'
    having count(*) > 1
  $$,
  'J3: com teto 1, nenhuma localidade aparece duas vezes no payload do despacho'
);

-- ── K. o nono job, no padrão bivaque-* ────────────────────────────────────

select is(
  (
    select count(*)::integer from cron.job
     where jobname = 'bivaque-guide-candidate-prepare'
  ),
  1,
  'K1: o job agendado da fila existe uma vez'
);

select is(
  (
    select command from cron.job
     where jobname = 'bivaque-guide-candidate-prepare'
  ),
  'select private.guide_candidate_prepare()',
  'K2: o job chama a função private, não uma função exposta'
);

select * from finish();
rollback;