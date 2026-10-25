-- Revogação da conta de prestador no esquema aprovado (RED-005).
--
-- A vila saiu (ADR-20261024 §4): revogar deixou de ser ato do dono da
-- comunidade que atestava e passou a ser ato do OPERADOR (`private.operators`),
-- chamado pelo canal privilegiado do servidor (`service_role`, que informa o
-- ator). O console do dono da vila (`list_community_providers`) foi removido
-- com ela. Revogar não apaga conta nem ficha — desliga o alcance e marca data
-- e ator. O prestador revogado não foi banido: continua entrando e vendo a
-- própria ficha; o que sai do ar é a vitrine.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'revoke-provider-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'revoke-provider-b@example.invalid'),
  ('10000000-0000-4000-8000-00000000000c', 'operator-revoke@example.invalid');

insert into public.operators (auth_user_id, notes)
values (
  '10000000-0000-4000-8000-00000000000c',
  'fixture: operador da revogação de prestador'
);

insert into public.provider_accounts (
  auth_user_id, invited_by, locality_id
)
values
  (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  );

insert into public.provider_profiles (id, owner_user_id, display_name, category, bio)
values
  (
    '30000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000020',
    'Climatiza Ajuricaba',
    'assistencia_tecnica',
    'Manutenção de ar-condicionado'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000021',
    'Marmitas da Vizinha',
    'alimentacao',
    'Almoço sob encomenda'
  );

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values
  (
    '30000000-0000-4000-8000-000000000020',
    'locality',
    '00000000-0000-4000-8000-000000000001',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    'locality',
    '00000000-0000-4000-8000-000000000001',
    'free'
  );

-- ── NEGATIVOS antes do ato ──────────────────────────────────────────────────

-- Quem revoga é o operador: outra conta de prestador não revoga (o canal
-- privilegiado informa o ator e a função reconfere o papel).
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

select throws_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-000000000021',
       'motivo qualquer'
     ) $$,
  '42501',
  null,
  'a provider account cannot revoke another provider account'
);

-- Um membro comum não revoga: nem chega à função, que é do canal do servidor.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-000000000001',
       'motivo qualquer'
     ) $$,
  '42501',
  null,
  'common member cannot revoke'
);

-- Sem motivo não existe revogação.
reset role;
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

select throws_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-00000000000c',
       null
     ) $$,
  '22023',
  null,
  'revocation without reason raises'
);

-- ── POSITIVO: o operador revoga ─────────────────────────────────────────────
select lives_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-00000000000c',
       'Denúncias repetidas de propaganda fora da categoria'
     ) $$,
  'the operator revokes the attested provider'
);

-- A vitrine sai do ar para a cidade: membro verificado de Manaus não vê mais.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is_empty(
  $$ select 1 from public.provider_profiles
      where id = '30000000-0000-4000-8000-000000000020' $$,
  'a member of the city no longer sees the revoked showcase'
);

-- A conta está marcada, não apagada.
reset role;
select results_eq(
  $$
    select coalesce(revoked_at is not null, false)
      from public.provider_accounts
     where auth_user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  array[true],
  'provider account carries the revocation mark'
);

-- O prestador revogado NÃO foi banido: entra e vê a própria ficha…
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select isnt_empty(
  $$ select 1 from public.provider_profiles
      where id = '30000000-0000-4000-8000-000000000020' $$,
  'revoked provider still sees the own profile'
);

-- …mas não reativa o alcance sozinho: a policy nega e o UPDATE vira no-op
-- silencioso — o contrato RLS de escrita é 0 linhas, não exceção. O estado
-- permanece inativo.
select lives_ok(
  $$
    update public.provider_reach
       set active = true
     where provider_id = '30000000-0000-4000-8000-000000000020'
  $$,
  'reactivation attempt runs as a no-op under RLS'
);
select results_eq(
  $$ select active from public.provider_reach
      where provider_id = '30000000-0000-4000-8000-000000000020' $$,
  array[false],
  'reach remains inactive after the reactivation attempt'
);

-- A revogação preserva a evidência: fica registrado QUEM revogou.
reset role;
select is(
  (
    select revoked_by
      from public.provider_accounts
     where auth_user_id = '10000000-0000-4000-8000-000000000020'
  ),
  '10000000-0000-4000-8000-00000000000c'::uuid,
  'revocation records the operator that revoked the account'
);

select * from finish();
rollback;