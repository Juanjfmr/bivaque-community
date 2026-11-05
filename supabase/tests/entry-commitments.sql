-- O combinado da entrada (LAN-F01; ADR-20261101-entrada-unica-por-codigo §3 e
-- emenda de 04/11): a versão do Código de Conduta exibida depois da prévia da
-- cidade, gravada quando a pessoa confirma a etapa.
--
-- O combinado é dado do titular e não tem escrita pelo cliente. A prova é de
-- permissão e de integridade, com positivo e negativos no mesmo arquivo:
--   * o service_role grava, como a rota /api/app/entry/combinado faz;
--   * o dono lê a própria linha, e mais ninguém — outro membro e anon não leem;
--   * o cliente não escreve, nem na própria linha (sem grant nem policy de
--     escrita);
--   * o CHECK recusa versão fora da faixa 1..1000;
--   * a purga da conta apaga o combinado junto com o resto do dado pessoal.

begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

\ir fixtures/foundation.inc

reset role;

-- ── RLS ligada E forçada: nem o dono da tabela escapa da policy ─────────────
select is(
  (
    select relforcerowsecurity
    from pg_class
    where oid = 'public.entry_commitments'::regclass
  ),
  true,
  'RLS forçada na tabela do combinado'
);

-- ── POSITIVO: a rota grava como service_role ────────────────────────────────
set local role service_role;

select lives_ok(
  $$
    insert into public.entry_commitments (user_id, versao)
    values ('10000000-0000-4000-8000-000000000001', 3)
  $$,
  'service_role grava o combinado da entrada'
);

reset role;

-- ── POSITIVO: o dono lê a própria linha ─────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.entry_commitments),
  1,
  'dono lê o próprio combinado'
);

select is(
  (select versao from public.entry_commitments),
  3,
  'a versão do Código de Conduta volta como foi gravada'
);

-- ── NEGATIVO: o cliente não escreve, nem a própria linha ────────────────────
select throws_ok(
  $$
    insert into public.entry_commitments (user_id, versao)
    values ('10000000-0000-4000-8000-000000000003', 3)
  $$,
  '42501',
  null,
  'authenticated não insere combinado'
);

select throws_ok(
  $$ update public.entry_commitments set versao = 4 $$,
  '42501',
  null,
  'authenticated não atualiza combinado'
);

select throws_ok(
  $$ delete from public.entry_commitments $$,
  '42501',
  null,
  'authenticated não apaga combinado'
);

-- ── NEGATIVO: outro membro não vê o combinado de ninguém ────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.entry_commitments),
  0,
  'outro membro não vê o combinado de ninguém'
);

reset role;

-- ── NEGATIVO: anon nem alcança a tabela ─────────────────────────────────────
set local role anon;

select throws_ok(
  $$ select count(*) from public.entry_commitments $$,
  '42501',
  null,
  'anon não lê o combinado'
);

reset role;

-- ── Grants mínimos: authenticated só lê, anon não alcança, rota escreve ─────
select ok(
  has_table_privilege('authenticated', 'public.entry_commitments', 'SELECT')
    and not has_table_privilege('authenticated', 'public.entry_commitments', 'INSERT')
    and not has_table_privilege('authenticated', 'public.entry_commitments', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.entry_commitments', 'DELETE')
    and not has_table_privilege('anon', 'public.entry_commitments', 'SELECT')
    and has_table_privilege('service_role', 'public.entry_commitments', 'SELECT')
    and has_table_privilege('service_role', 'public.entry_commitments', 'INSERT')
    and has_table_privilege('service_role', 'public.entry_commitments', 'UPDATE')
    and has_table_privilege('service_role', 'public.entry_commitments', 'DELETE'),
  'grants mínimos: authenticated só lê, anon não alcança e service_role escreve'
);

-- ── NEGATIVO: o CHECK recusa versão fora de 1..1000 ─────────────────────────
set local role service_role;

select throws_ok(
  $$
    insert into public.entry_commitments (user_id, versao)
    values ('10000000-0000-4000-8000-000000000003', 0)
  $$,
  '23514',
  null,
  'versão 0 é recusada pelo CHECK'
);

select throws_ok(
  $$
    insert into public.entry_commitments (user_id, versao)
    values ('10000000-0000-4000-8000-000000000003', 1001)
  $$,
  '23514',
  null,
  'versão 1001 é recusada pelo CHECK'
);

-- ── A purga da conta apaga o combinado ──────────────────────────────────────
-- O pedido já venceu: due_at > requested_at respeita o CHECK da tabela.
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

reset role;

select is(
  (
    select count(*)::integer
    from public.entry_commitments
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0,
  'a purga apaga o combinado da entrada'
);

select * from finish();
rollback;
