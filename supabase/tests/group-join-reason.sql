-- COM-005 (B2 do lote 5): o motivo do pedido de entrada do grupo Fechado.
--
-- O que esta prova cobre:
--   - o CHECK de 300 caracteres;
--   - a leitura do motivo só pelo autor e por quem aprova (dono e moderador),
--     com negativo para outro membro, para quem não é membro e para `anon`;
--   - o motivo sumindo na aprovação (RPC) e na recusa (delete da participação);
--   - o limite de 3 pedidos em 30 dias contado em tabela própria, que sobrevive
--     à recusa;
--   - o job de limpeza apagando o motivo de pedido sem decisão há 30 dias.
--
-- Personas (fixtures/foundation.inc + groups.inc):
--   001 member-one: dono do grupo 003 (e do 004, 005, criados abaixo).
--   002 member-two: membro aprovado comum do grupo 003 ("outro membro").
--   003 other-locality: mora em outra localidade e não participa de grupo.
--   004 hidden-member: da localidade, sem nenhum grupo — o autor dos pedidos.
--   005 non-member: moderador do grupo 003 (não é da localidade).

begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- ── Preparo: um grupo Fechado para a matriz de leitura, um para a recusa e o
-- limite, e um para o CHECK e a limpeza ─────────────────────────────────────

insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id
)
values
  (
    '40000000-0000-4000-8000-000000000003',
    'Clube Fechado COM-005',
    'Pedidos com motivo',
    'private',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    'Clube Limite COM-005',
    'Limite de pedidos',
    'private',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    'Clube Limpeza COM-005',
    'CHECK e limpeza',
    'private',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001'
  );

insert into public.group_memberships (group_id, user_id, role, status)
values
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'member', 'approved'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', 'moderator', 'approved'),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'owner', 'approved'),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'member', 'pending'),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'member', 'pending');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Estrutura e fechamento das tabelas
-- ═══════════════════════════════════════════════════════════════════════════════

select has_table('public', 'group_join_reasons', 'a tabela do motivo do pedido existe');
select has_table('public', 'group_join_attempts', 'a tabela das tentativas existe');

select has_column('public', 'group_join_reasons', 'reason', 'o motivo tem coluna própria');
select has_column('public', 'group_join_reasons', 'created_at', 'o motivo guarda quando foi escrito');

select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where relname = 'group_join_reasons' and relnamespace = 'public'::regnamespace
  $$,
  $$ values (true) $$,
  'RLS habilitada e forçada em group_join_reasons'
);

select results_eq(
  $$
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where relname = 'group_join_attempts' and relnamespace = 'public'::regnamespace
  $$,
  $$ values (true) $$,
  'RLS habilitada e forçada em group_join_attempts'
);

select is(
  has_table_privilege('authenticated', 'public.group_join_attempts', 'SELECT'),
  false,
  'authenticated não lê a tabela de tentativas'
);

select is(
  has_table_privilege('authenticated', 'public.group_join_reasons', 'INSERT'),
  false,
  'authenticated não escreve o motivo pela Data API'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- O job de limpeza está agendado
-- ═══════════════════════════════════════════════════════════════════════════════

select is(
  (select count(*)::integer from cron.job where jobname = 'bivaque-group-join-reason-purge'),
  1,
  'o job de limpeza do motivo está agendado'
);

select is(
  (
    select command from cron.job
    where jobname = 'bivaque-group-join-reason-purge'
  ),
  'select private.purge_stale_group_join_reasons()',
  'o job chama a função de limpeza'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- A matriz de leitura: autor e quem aprova leem; o resto, não
-- ═══════════════════════════════════════════════════════════════════════════════

-- 004 pede entrada no grupo 003 com um motivo.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.join_group(
  '40000000-0000-4000-8000-000000000003',
  'Quero participar dos encontros do clube'
);

reset role;

select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
  ),
  1,
  'o pedido com motivo grava uma linha de motivo'
);

-- POSITIVO: o autor lê o próprio motivo.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
  ),
  1,
  'o autor do pedido lê o próprio motivo'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
  ),
  1,
  'o dono do grupo lê o motivo de quem pediu entrada'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
  ),
  1,
  'o moderador do grupo lê o motivo de quem pediu entrada'
);

-- NEGATIVO: outro membro aprovado lê o roster e NÃO lê o motivo.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
  ),
  0,
  'outro membro do grupo NÃO lê o motivo'
);

-- NEGATIVO: quem não é do grupo não lê.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
  ),
  0,
  'quem não é do grupo NÃO lê o motivo'
);

-- NEGATIVO: anon nem alcança a tabela.
reset role;
set local role anon;
select throws_ok(
  $$
    select count(*) from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
  $$,
  '42501',
  null,
  'anon NÃO lê o motivo'
);

reset role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Aprovar apaga o motivo
-- ═══════════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$
    select public.approve_group_member(
      '40000000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000004'
    )
  $$,
  'o dono aprova o pedido'
);

reset role;

select results_eq(
  $$
    select status::text from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000003'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  $$ values ('approved') $$,
  'a participação aprovada permanece'
);

select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000003'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  0,
  'aprovar apaga o motivo'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Recusar (delete da participação) apaga o motivo, e a tentativa sobrevive
-- ═══════════════════════════════════════════════════════════════════════════════

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$
    select public.join_group(
      '40000000-0000-4000-8000-000000000004',
      'Segundo pedido de teste'
    )
  $$,
  'o pedido ao grupo de limite cria a participação pendente'
);

reset role;

select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  1,
  'o motivo do pedido fica gravado antes da decisão'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'o dono recusa o pedido apagando a participação'
);

reset role;

select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  0,
  'recusar apaga o motivo junto com a participação'
);

select is(
  (
    select count(*)::integer from public.group_join_attempts
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  1,
  'a tentativa sobrevive à recusa'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- O limite: o quarto pedido em 30 dias é recusado
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tentativas 2 e 3; o dono recusa cada uma para liberar a vaga.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ select public.join_group('40000000-0000-4000-8000-000000000004') $$,
  'segundo pedido é aceito'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'o dono recusa o segundo pedido'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ select public.join_group('40000000-0000-4000-8000-000000000004') $$,
  'terceiro pedido é aceito'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$
    delete from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  $$,
  'o dono recusa o terceiro pedido'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.join_group('40000000-0000-4000-8000-000000000004') $$,
  '54000',
  null,
  'o quarto pedido em 30 dias é recusado'
);

reset role;

select is(
  (
    select count(*)::integer from public.group_join_attempts
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  3,
  'o quarto pedido não entra na contagem de tentativas'
);

select is(
  (
    select count(*)::integer from public.group_memberships
    where group_id = '40000000-0000-4000-8000-000000000004'
      and user_id = '10000000-0000-4000-8000-000000000004'
  ),
  0,
  'o quarto pedido não cria participação'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- O CHECK de 300 caracteres
-- ═══════════════════════════════════════════════════════════════════════════════

select lives_ok(
  $$
    insert into public.group_join_reasons (group_id, user_id, reason)
    values (
      '40000000-0000-4000-8000-000000000005',
      '10000000-0000-4000-8000-000000000002',
      repeat('a', 300)
    )
  $$,
  'motivo de exatamente 300 caracteres é aceito'
);

select throws_ok(
  $$
    insert into public.group_join_reasons (group_id, user_id, reason)
    values (
      '40000000-0000-4000-8000-000000000005',
      '10000000-0000-4000-8000-000000000003',
      repeat('a', 301)
    )
  $$,
  '23514',
  null,
  'motivo de 301 caracteres é recusado pelo CHECK'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- A limpeza: pedido sem decisão há mais de 30 dias perde o motivo
-- ═══════════════════════════════════════════════════════════════════════════════

-- O motivo do 002 fica velho; o do 003 entra fresco.
update public.group_join_reasons
set created_at = now() - interval '40 days'
where group_id = '40000000-0000-4000-8000-000000000005'
  and user_id = '10000000-0000-4000-8000-000000000002';

insert into public.group_join_reasons (group_id, user_id, reason)
values (
  '40000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000003',
  'Motivo recente, sem decisão'
);

select is(
  private.purge_stale_group_join_reasons(),
  1,
  'a limpeza apaga só o motivo de pedido sem decisão há mais de 30 dias'
);

select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000005'
      and user_id = '10000000-0000-4000-8000-000000000002'
  ),
  0,
  'o motivo velho foi apagado'
);

select is(
  (
    select count(*)::integer from public.group_join_reasons
    where group_id = '40000000-0000-4000-8000-000000000005'
      and user_id = '10000000-0000-4000-8000-000000000003'
  ),
  1,
  'o motivo recente continua'
);

select * from finish();
rollback;