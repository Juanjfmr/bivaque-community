-- PORT-005 (lote 4 da entrada) — ADR-20261022-entrada-do-prototipo, item 3:
-- o momento declarado na entrada (chegando, moro aqui, saindo), as datas e o
-- destino, guardados com regra de coerência e RLS do dono.
--
-- O que este arquivo prova, e é o motivo de ele existir:
--   * o service_role grava (é o caminho da rota de provisionamento), e o CHECK
--     recusa cada combinação incoerente de momento × datas × destino — no banco,
--     não só na validação da rota;
--   * o destino é cidade do catálogo: fora dele, a FK recusa;
--   * o dono LÊ a própria linha, e mais ninguém — outro membro, anon, e nenhuma
--     escrita do cliente (nem para a própria linha);
--   * a purga da conta apaga o momento junto com o resto do dado pessoal.

begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

\ir fixtures/foundation.inc

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Coerência do momento (o que o CHECK garante no banco)
-- ───────────────────────────────────────────────────────────────────────────

set local role service_role;

select lives_ok(
  $$
    insert into public.member_entry_moments (user_id, moment)
    values ('10000000-0000-4000-8000-000000000001', 'resident')
  $$,
  'service_role grava "moro aqui", sem data e sem destino'
);

select throws_ok(
  $$
    insert into public.member_entry_moments (user_id, moment)
    values ('10000000-0000-4000-8000-000000000002', 'arriving')
  $$,
  '23514', null,
  'chegando sem a data de chegada é recusado'
);

select throws_ok(
  $$
    insert into public.member_entry_moments (user_id, moment, arrival_date)
    values ('10000000-0000-4000-8000-000000000002', 'resident', current_date + 7)
  $$,
  '23514', null,
  'moro aqui com data de chegada é recusado'
);

select throws_ok(
  $$
    insert into public.member_entry_moments (user_id, moment, departure_date)
    values ('10000000-0000-4000-8000-000000000002', 'leaving', current_date + 20)
  $$,
  '23514', null,
  'saindo sem o destino é recusado'
);

select throws_ok(
  $$
    insert into public.member_entry_moments (user_id, moment, arrival_date, departure_date)
    values (
      '10000000-0000-4000-8000-000000000002',
      'leaving',
      current_date + 7,
      current_date + 20
    )
  $$,
  '23514', null,
  'saindo não guarda data de chegada'
);

-- Destino tem de existir no catálogo: a FK, não um texto conferido no app.
select throws_ok(
  $$
    insert into public.member_entry_moments (
      user_id, moment, departure_date, destination_locality_id
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      'leaving',
      current_date + 20,
      '00000000-0000-4000-8000-0000000000ff'
    )
  $$,
  '23503', null,
  'destino fora do catálogo é recusado pela chave estrangeira'
);

-- O caso positivo de "saindo": data de saída e destino, os dois.
select lives_ok(
  $$
    insert into public.member_entry_moments (
      user_id, moment, departure_date, destination_locality_id
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      'leaving',
      current_date + 20,
      '00000000-0000-4000-8000-000000000002'
    )
  $$,
  'saindo grava a data da saída e o destino do catálogo'
);

-- Uma linha por pessoa: a entrada acontece uma vez, e a chave primária diz isso.
select throws_ok(
  $$
    insert into public.member_entry_moments (user_id, moment)
    values ('10000000-0000-4000-8000-000000000001', 'arriving')
  $$,
  '23505', null,
  'o momento é um só por pessoa (o segundo insert colide na chave)'
);

-- A rota reescreve o momento declarado (o caminho de quem refaz a entrada):
-- upsert pela chave, não uma segunda linha.
select lives_ok(
  $$
    insert into public.member_entry_moments (user_id, moment, arrival_date)
    values ('10000000-0000-4000-8000-000000000001', 'arriving', current_date + 3)
    on conflict (user_id) do update
      set moment = excluded.moment,
          arrival_date = excluded.arrival_date,
          departure_date = null,
          destination_locality_id = null
  $$,
  'a entrada pode ser refeita: upsert troca o momento da mesma pessoa'
);

reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. RLS: o dono lê o próprio momento, e só ele
-- ───────────────────────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select moment::text from public.member_entry_moments
  $$,
  array['arriving'::text],
  'o dono lê o próprio momento (e só a linha dele existe para ele)'
);

select is(
  (
    select count(*)
    from public.member_entry_moments
    where user_id = '10000000-0000-4000-8000-000000000002'
  ),
  0::bigint,
  'a linha de outra pessoa não existe para quem não é o dono'
);

select throws_ok(
  $$
    insert into public.member_entry_moments (user_id, moment)
    values ('10000000-0000-4000-8000-000000000001', 'resident')
  $$,
  '42501', null,
  'o cliente não escreve o próprio momento: só a rota de provisionamento escreve'
);

select throws_ok(
  $$
    update public.member_entry_moments
       set moment = 'resident',
           arrival_date = null
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'o cliente não reescreve o próprio momento pela Data API'
);

select throws_ok(
  $$
    delete from public.member_entry_moments
     where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  '42501', null,
  'o cliente não apaga o próprio momento'
);

reset role;

-- Sem sessão nenhuma, a tabela nem é alcançável.
set local role anon;

select throws_ok(
  $$ select count(*) from public.member_entry_moments $$,
  '42501', null,
  'anon não lê o momento de ninguém'
);

reset role;

-- RLS ligada E forçada: nem o dono da tabela escapa da policy.
select is(
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'member_entry_moments'
      and c.relrowsecurity
      and c.relforcerowsecurity
  ),
  1::bigint,
  'RLS ligada e forçada em member_entry_moments'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. A purga da conta conhece o dado novo
-- ───────────────────────────────────────────────────────────────────────────

insert into public.account_deletion_requests (user_id, requested_at, due_at)
values (
  '10000000-0000-4000-8000-000000000001',
  now() - interval '16 days',
  now() - interval '1 day'
);

select is(
  public.finalize_account_deletion('10000000-0000-4000-8000-000000000001'),
  'purged',
  'a purga da conta roda depois do vencimento'
);

select is(
  (
    select count(*) from public.member_entry_moments
    where user_id = '10000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'a purga apaga o momento declarado da pessoa'
);

select is(
  (
    select count(*) from public.member_entry_moments
    where user_id = '10000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'a purga de uma pessoa não toca no momento de outra'
);

select * from finish();
rollback;
