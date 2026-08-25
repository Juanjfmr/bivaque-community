-- Revogação da conta de prestador (onda G Task 3, Step 6).
--
-- ADR conta-de-prestador, decisão 2: revogar é ato do DONO da comunidade
-- que atestou. Não apaga conta nem ficha — desliga o alcance e marca data.
-- O prestador revogado não foi banido: continua entrando e vendo a própria
-- ficha; o que sai do ar é a vitrine.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'revoke-provider-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'revoke-provider-b@example.invalid');

update public.communities
   set owner_user_id = '10000000-0000-4000-8000-000000000002'
 where id = '70000000-0000-4000-8000-000000000002';

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values
  (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
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
    'community',
    '70000000-0000-4000-8000-000000000001',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    'community',
    '70000000-0000-4000-8000-000000000002',
    'free'
  );

-- ── NEGATIVOS antes do ato ──────────────────────────────────────────────────

-- O dono da OUTRA comunidade não revoga a ficha que não atestou.
select throws_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-000000000002',
       'motivo qualquer'
     ) $$,
  '42501',
  null,
  'owner of another community cannot revoke'
);

-- Um membro comum da própria comunidade não revoga.
select throws_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-000000000004',
       'motivo qualquer'
     ) $$,
  '42501',
  null,
  'common member cannot revoke'
);

-- Sem motivo não existe revogação.
select throws_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-000000000001',
       null
     ) $$,
  '22023',
  null,
  'revocation without reason raises'
);

-- ── POSITIVO: o dono certo revoga ───────────────────────────────────────────
select lives_ok(
  $$ select public.revoke_provider_account(
       '10000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-000000000001',
       'Denúncias repetidas de propaganda fora da categoria'
     ) $$,
  'the community owner revokes the attested provider'
);

-- A vitrine sai do ar em TODAS as vilas: membro aprovado da vila A não vê mais.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is_empty(
  $$ select 1 from public.provider_profiles
      where id = '30000000-0000-4000-8000-000000000020' $$,
  'approved member no longer sees the revoked showcase'
);

-- A conta está marcada, não apagada.
set local role postgres;
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

-- E o console do dono enxerga o estado revogado.
select set_config('role', 'postgres', true);
select isnt_empty(
  $$
    select 1
      from public.list_community_providers(
        '70000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        null
      )
     where revoked_at is not null
       and provider_user_id = '10000000-0000-4000-8000-000000000020'
  $$,
  'owner console lists the revoked state'
);

select * from finish();
rollback;
