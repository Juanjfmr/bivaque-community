begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

-- Onda T Task 5 — o sinal de quem está chegando, no esquema aprovado.
--
-- A vila saiu (ADR-20261024 §4, R1-301 removida): a fila de chegada da
-- comunidade (`list_community_pending_arrivals`) não existe mais. O sinal de
-- chegada que sobrevive é o de LOCALIDADE, em `locality_memberships`
-- (`kind='leaving'` com `leaving_at`), alimentado por `declare_locality_transfer`
-- e lido no console do fundador por `list_locality_arrivals_volume`. Os
-- testes exclusivos da fila extinta saem com ela. Os novos casos de localidade
-- não substituem semanticamente a negação de moderador da vila; as proteções
-- remanescentes de cidade e operador continuam sendo testadas.
--
-- member-two tem vínculo atual com Manaus (foundation.inc) e ganha a linha de
-- saída apontando para Fixture City, como se a transferência para Manaus tivesse
-- sido declarada. Os demais seguem orgânicos (sem sinal de chegada).

\ir fixtures/foundation.inc

reset role;

insert into public.locality_memberships (user_id, locality_id, kind, leaving_at, access)
values (
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'leaving',
  (current_date + interval '30 days')::date,
  'active'
);

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-00000000000c', 'operator-arrivals@example.invalid');

insert into public.operators (auth_user_id, notes)
values ('10000000-0000-4000-8000-00000000000c', 'fixture: operator for arrivals volume');

-- 1. A chegada declarada carrega a data.
select is(
  (
    select leaving_at
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000002'
      and kind = 'leaving'
      and locality_id = '00000000-0000-4000-8000-000000000002'
  ),
  (current_date + interval '30 days')::date,
  'a linha de saída declarada carrega a data de chegada'
);

-- 2. Um vínculo orgânico (sem transferência) não traz sinal de chegada.
select is(
  (
    select count(*)::integer
    from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000001'
      and kind = 'leaving'
  ),
  0,
  'um membro sem transferência declarada não carrega sinal de chegada (negativo)'
);

-- 3. Nenhum campo de afiliação (força/OM/posto/turma) na assinatura — a
-- assinatura é o contrato, e é aqui que qualquer coluna nova apareceria.
select is(
  pg_get_function_result('public.declare_locality_transfer(uuid, date)'::regprocedure),
  'TABLE(current_locality_id uuid, leaving_locality_id uuid, leaving_at date)',
  'a assinatura só carrega cidades e data, nenhuma afiliação (negativo)'
);

-- 4. Declarar chegada para a própria cidade é recusado.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$
    select * from public.declare_locality_transfer(
      '00000000-0000-4000-8000-000000000001',
      (current_date + interval '30 days')::date
    )
  $$,
  '23514',
  null,
  'declarar chegada para a própria cidade é recusado (negativo)'
);

-- 5. O console do fundador conta uma chegada declarada em Manaus.
select is(
  (
    select arrivals_count
    from public.list_locality_arrivals_volume('10000000-0000-4000-8000-00000000000c')
    where locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'o console do fundador conta uma chegada declarada em Manaus'
);

select ok(
  not exists (
    select 1
    from public.list_locality_arrivals_volume('10000000-0000-4000-8000-00000000000c')
    where locality_id = '00000000-0000-4000-8000-000000000002'
  ),
  'Fixture City é origem, não destino, então não carrega chegada (negativo)'
);

-- 6. Um não-operador é barrado no console do fundador.
select throws_ok(
  $$
    select * from public.list_locality_arrivals_volume('10000000-0000-4000-8000-000000000001')
  $$,
  '42501',
  null,
  'um não-operador é barrado no volume de chegadas do fundador (negativo)'
);

-- 7. Declarar chegada dentro do catálogo devolve a origem e a data.
select results_eq(
  $$
    select current_locality_id, leaving_locality_id, leaving_at
    from public.declare_locality_transfer(
      '00000000-0000-4000-8000-000000000002',
      (current_date + interval '30 days')::date
    )
  $$,
  $$ values (
       '00000000-0000-4000-8000-000000000002'::uuid,
       '00000000-0000-4000-8000-000000000001'::uuid,
       (current_date + interval '30 days')::date
     ) $$,
  'declarar chegada no catálogo devolve a origem e a data'
);

select * from finish();
rollback;
