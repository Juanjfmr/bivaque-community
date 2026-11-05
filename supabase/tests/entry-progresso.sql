-- Rascunho da entrada (LAN-F01, ADR-20261102-progresso-da-entrada).
--
-- O rascunho é dado pessoal de quem ainda não terminou a entrada. A prova é de
-- permissão: o dono lê a própria linha, ninguém mais lê, e o cliente não
-- escreve — quem grava é a rota, com service_role. Os CHECKs repetem no banco a
-- lista de etapas e a forma do estado. A purga da conta apaga o rascunho.

begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

\ir fixtures/foundation.inc

reset role;

-- O service_role grava o rascunho de member-one, como a rota faria.
insert into public.entry_progress (user_id, versao, etapa, estado)
values (
  '10000000-0000-4000-8000-000000000001',
  2,
  'cidade',
  '{"nome": "Ana Souza", "cidade": "Manaus"}'::jsonb
);

select is(
  (
    select relforcerowsecurity
    from pg_class
    where oid = 'public.entry_progress'::regclass
  ),
  true,
  'RLS forçada na tabela do rascunho'
);

-- ── POSITIVO: o dono lê o próprio rascunho ──────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.entry_progress),
  1,
  'dono lê o próprio rascunho'
);

select is(
  (select etapa from public.entry_progress),
  'cidade',
  'a etapa volta como foi gravada'
);

-- ── NEGATIVO: o cliente não escreve ─────────────────────────────────────────
select throws_ok(
  $$
    insert into public.entry_progress (user_id, versao, etapa)
    values ('10000000-0000-4000-8000-000000000002', 2, 'porta')
  $$,
  '42501',
  null,
  'authenticated não insere rascunho'
);

select throws_ok(
  $$ update public.entry_progress set etapa = 'nome' $$,
  '42501',
  null,
  'authenticated não atualiza rascunho'
);

select throws_ok(
  $$ delete from public.entry_progress $$,
  '42501',
  null,
  'authenticated não apaga rascunho'
);

-- ── NEGATIVO: outra pessoa e anon não leem ──────────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is(
  (select count(*)::integer from public.entry_progress),
  0,
  'outra pessoa não vê o rascunho de ninguém'
);

reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from public.entry_progress $$,
  '42501',
  null,
  'anon não lê o rascunho'
);

-- ── NEGATIVO: os CHECKs recusam etapa, estado e versão inválidos ────────────
reset role;

select throws_ok(
  $$
    insert into public.entry_progress (user_id, versao, etapa)
    values ('10000000-0000-4000-8000-000000000003', 2, 'Etapa Inválida!')
  $$,
  '23514',
  null,
  'etapa com formato inválido é recusada'
);

select throws_ok(
  $$
    insert into public.entry_progress (user_id, versao, etapa, estado)
    values ('10000000-0000-4000-8000-000000000003', 2, 'porta', '[]'::jsonb)
  $$,
  '23514',
  null,
  'estado que não é objeto é recusado'
);

select throws_ok(
  $$
    insert into public.entry_progress (user_id, versao, etapa)
    values ('10000000-0000-4000-8000-000000000003', 0, 'porta')
  $$,
  '23514',
  null,
  'versão fora da faixa é recusada'
);

-- ── A purga da conta apaga o rascunho ───────────────────────────────────────
insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000001',
  now() - interval '2 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000001'),
  'purged',
  'purga da conta conclui'
);

select is(
  (
    select count(*)::integer
    from public.entry_progress
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0,
  'a purga apaga o rascunho da entrada'
);

select * from finish();
rollback;
