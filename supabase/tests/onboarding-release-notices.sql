begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc

reset role;

-- ── onboarding_release_notices: preferência do próprio dono ─────────────────
-- PORT-004 (frente B): "Avise-me quando liberar" grava uma linha da própria
-- pessoa. O positivo é ela gravando e lendo a sua; o negativo é qualquer outra
-- pessoa lendo, gravando ou alterando a linha alheia, e o anônimo tentando
-- entrar na tabela.

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.onboarding_release_notices (user_id)
    values ('10000000-0000-4000-8000-000000000001')
  $$,
  'authenticated inserts their own release notice'
);

select is(
  (select count(*)::bigint
   from public.onboarding_release_notices
   where user_id = '10000000-0000-4000-8000-000000000001'),
  1::bigint,
  'the owner reads back their own release notice'
);

-- Outra pessoa autenticada: não lê a linha do primeiro.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);

select is_empty(
  $$
    select 1
    from public.onboarding_release_notices
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'another authenticated user cannot read someone else release notice'
);

select throws_ok(
  $$
    insert into public.onboarding_release_notices (user_id)
    values ('10000000-0000-4000-8000-000000000001')
  $$,
  '42501',
  null,
  'another authenticated user cannot insert a release notice for someone else'
);

select is(
  (with updated as (
    update public.onboarding_release_notices
    set requested_at = now()
    where user_id = '10000000-0000-4000-8000-000000000001'
    returning 1
  )
  select count(*)::bigint from updated),
  0::bigint,
  'another authenticated user cannot update someone else release notice'
);

-- O dono continua com a linha, e o pedido repetido não duplica.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::bigint
   from public.onboarding_release_notices
   where user_id = '10000000-0000-4000-8000-000000000001'),
  1::bigint,
  'the owner still reads exactly one row after other-user denials'
);

select lives_ok(
  $$
    update public.onboarding_release_notices
    set requested_at = requested_at
    where user_id = '10000000-0000-4000-8000-000000000001'
  $$,
  'the owner updates their own release notice'
);

-- Anônimo não tem grant nenhum na tabela.
reset role;
set local role anon;

select throws_ok(
  $$
    insert into public.onboarding_release_notices (user_id)
    values ('10000000-0000-4000-8000-000000000001')
  $$,
  '42501',
  null,
  'anon cannot insert a release notice'
);

-- O cliente de serviço lê para operação; a tela não depende dele.
reset role;
set local role service_role;

select is(
  (select count(*)::bigint
   from public.onboarding_release_notices
   where user_id = '10000000-0000-4000-8000-000000000001'),
  1::bigint,
  'service_role reads the release notice row'
);

select * from finish();
rollback;
