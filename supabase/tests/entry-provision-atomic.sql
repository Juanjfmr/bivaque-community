-- PORT-005 (correção do achado P1 da revisão independente) — a entrada é
-- atômica: vínculo, perfil e momento gravados na mesma transação, ou nada.
--
-- O que este arquivo prova, e por que ele existe:
--   * a falha do momento desfaz TAMBÉM o vínculo e o perfil. Antes da correção,
--     um erro no upsert do momento deixava a pessoa como membro, sem momento, e
--     a tela de cidade a mandava para /community sem caminho de volta;
--   * a falha é a de verdade (o CHECK de coerência e a FK do destino), não um
--     mock: é o banco recusando dentro da transação da função;
--   * o caminho do convite familiar (sem momento) provisiona e NÃO inventa
--     linha de momento;
--   * só service_role executa; authenticated e anon recebem 42501.

begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

\ir fixtures/foundation.inc

-- A fundação tem quatro pessoas com vínculo; a quinta está livre. Estas duas
-- extras existem para os cenários que precisam de conta sem vínculo e sem
-- perfil, e vivem só nesta transação, como as da fundação.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000006', 'entry-rollback@example.invalid'),
  ('10000000-0000-4000-8000-000000000007', 'entry-family@example.invalid');

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Falha no meio não deixa a entrada pela metade
-- ───────────────────────────────────────────────────────────────────────────

set local role service_role;

-- "Saindo" sem destino viola member_entry_moments_coherence. O vínculo e o
-- perfil já foram escritos dentro da função quando o CHECK recusa.
select throws_ok(
  $$
    select public.provision_member_entry(
      p_user_id := '10000000-0000-4000-8000-000000000006',
      p_locality_id := '00000000-0000-4000-8000-000000000001',
      p_display_name := 'Entrada Pela Metade',
      p_consent_version := 2,
      p_moment := 'leaving',
      p_departure_date := current_date + 20
    )
  $$,
  '23514', null,
  'saindo sem destino é recusado pelo CHECK do momento'
);

select is(
  (
    select count(*) from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'a falha do momento desfaz o vínculo: ninguém fica membro pela metade'
);

select is(
  (
    select count(*) from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'a falha do momento desfaz o perfil'
);

select is(
  (
    select count(*) from public.member_entry_moments
    where user_id = '10000000-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'a falha do momento não deixa linha de momento'
);

-- Destino fora do catálogo: a FK recusa depois do vínculo e do perfil, e a
-- transação inteira volta atrás.
select throws_ok(
  $$
    select public.provision_member_entry(
      p_user_id := '10000000-0000-4000-8000-000000000006',
      p_locality_id := '00000000-0000-4000-8000-000000000001',
      p_display_name := 'Entrada Pela Metade',
      p_consent_version := 2,
      p_moment := 'leaving',
      p_departure_date := current_date + 20,
      p_destination_locality_id := '00000000-0000-4000-8000-0000000000ff'
    )
  $$,
  '23503', null,
  'destino fora do catálogo é recusado pela chave estrangeira'
);

select is(
  (
    select count(*) from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'a falha do destino também desfaz o vínculo'
);

-- Cidade fora do catálogo: quem recusa é provision_member_locality, reusada
-- aqui — a regra de catálogo não foi duplicada nesta função.
select throws_ok(
  $$
    select public.provision_member_entry(
      p_user_id := '10000000-0000-4000-8000-000000000006',
      p_locality_id := '00000000-0000-4000-8000-0000000000ff',
      p_display_name := 'Entrada Pela Metade',
      p_consent_version := 2,
      p_moment := 'resident'
    )
  $$,
  '23514', null,
  'cidade fora do catálogo é recusada pela função de provisionamento reusada'
);

select is(
  (
    select count(*) from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000006'
  ),
  0::bigint,
  'a falha da cidade também desfaz o perfil'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. O caminho feliz grava os três
-- ───────────────────────────────────────────────────────────────────────────

select lives_ok(
  $$
    select public.provision_member_entry(
      p_user_id := '10000000-0000-4000-8000-000000000005',
      p_locality_id := '00000000-0000-4000-8000-000000000001',
      p_display_name := 'Pessoa Que Chega',
      p_consent_version := 2,
      p_moment := 'arriving',
      p_arrival_date := current_date + 7
    )
  $$,
  'chegando: vínculo, perfil e momento gravados numa chamada'
);

select is(
  (
    select count(*) from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000005'
      and kind = 'current'
      and locality_id = '00000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'o vínculo corrente é o da cidade escolhida'
);

select is(
  (
    select display_name from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000005'
  ),
  'Pessoa Que Chega',
  'o perfil guarda o nome confirmado na entrada'
);

select is(
  (
    select consent_version from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000005'
  ),
  2,
  'o perfil guarda a versão do consentimento aceita'
);

select results_eq(
  $$
    select moment::text, arrival_date = current_date + 7
    from public.member_entry_moments
    where user_id = '10000000-0000-4000-8000-000000000005'
  $$,
  $$ values ('arriving'::text, true) $$,
  'o momento declarado e a data de chegada ficam na linha do dono'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Convite familiar: provisiona sem momento, e não inventa momento
-- ───────────────────────────────────────────────────────────────────────────

select lives_ok(
  $$
    select public.provision_member_entry(
      p_user_id := '10000000-0000-4000-8000-000000000007',
      p_locality_id := '00000000-0000-4000-8000-000000000001',
      p_display_name := 'Pessoa Do Convite',
      p_consent_version := 2
    )
  $$,
  'sem momento (convite familiar) a entrada provisiona do mesmo jeito'
);

select is(
  (
    select count(*) from public.locality_memberships
    where user_id = '10000000-0000-4000-8000-000000000007'
      and kind = 'current'
  ),
  1::bigint,
  'o convite familiar continua criando o vínculo corrente'
);

select is(
  (
    select display_name from public.profiles
    where user_id = '10000000-0000-4000-8000-000000000007'
  ),
  'Pessoa Do Convite',
  'o convite familiar continua criando o perfil'
);

select is(
  (
    select count(*) from public.member_entry_moments
    where user_id = '10000000-0000-4000-8000-000000000007'
  ),
  0::bigint,
  'quem entra por convite não ganha momento inventado'
);

reset role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Ninguém além do service_role executa
-- ───────────────────────────────────────────────────────────────────────────

select is(
  has_function_privilege(
    'authenticated',
    'public.provision_member_entry(uuid, uuid, text, integer, public.entry_moment, date, date, uuid)',
    'EXECUTE'
  ),
  false,
  'authenticated não executa a função de provisionamento'
);

select is(
  has_function_privilege(
    'anon',
    'public.provision_member_entry(uuid, uuid, text, integer, public.entry_moment, date, date, uuid)',
    'EXECUTE'
  ),
  false,
  'anon não executa a função de provisionamento'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.provision_member_entry(
      p_user_id := '10000000-0000-4000-8000-000000000005',
      p_locality_id := '00000000-0000-4000-8000-000000000002',
      p_display_name := 'Pessoa Que Chega',
      p_consent_version := 2,
      p_moment := 'resident'
    )
  $$,
  '42501', null,
  'o cliente autenticado não provisiona a si mesmo por esta função'
);

reset role;

set local role anon;

select throws_ok(
  $$
    select public.provision_member_entry(
      p_user_id := '10000000-0000-4000-8000-000000000005',
      p_locality_id := '00000000-0000-4000-8000-000000000001',
      p_display_name := 'Pessoa Que Chega',
      p_consent_version := 2
    )
  $$,
  '42501', null,
  'anon não executa a função de provisionamento'
);

reset role;

select * from finish();
rollback;
