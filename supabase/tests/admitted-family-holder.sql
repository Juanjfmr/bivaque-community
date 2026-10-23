-- PORT-005 (segunda correção do P2) — o dependente familiar admitido.
--
-- A guarda dos interesses exigia `verified` da própria pessoa e recusava quem
-- entrou pelo convite familiar, a única porta sem CPF (D16). A regra do
-- familiar ficou no banco, em `public.has_verified_family_holder`: vínculo em
-- `private.family_account_links` cujo titular é verificado.
--
-- O que este arquivo prova:
--   * dependente de titular verificado responde true;
--   * o titular verificado NÃO responde true por si — ele é o titular, não o
--     dependente;
--   * dependente de titular NÃO verificado responde false;
--   * quem não tem vínculo familiar responde false;
--   * vínculo removido deixa de contar (é vínculo ativo, não histórico);
--   * só o service_role executa; authenticated e anon recebem 42501.

begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

\ir fixtures/foundation.inc

-- ───────────────────────────────────────────────────────────────────────────
-- Vínculos familiares da fixtures
-- ───────────────────────────────────────────────────────────────────────────
-- A fundação deixa member-one (001) verificado e member-two (002), other-locality
-- (003) e o restante sem verificação. Os vínculos abaixo são inseridos como
-- aceitos, porque a FK composta de family_account_links exige
-- (id, inviter_user_id, accepted_by_user_id) em family_invitations; o caminho
-- real de aceite já é provado em family-invite-locality.sql.

-- 040: titular 001 (verificado) -> dependente 002.
insert into private.family_invitations (
  id, inviter_user_id, token_digest, invitee_email_digest, status,
  accepted_by_user_id, accepted_at, expires_at
)
values (
  '50000000-0000-4000-8000-000000000040',
  '10000000-0000-4000-8000-000000000001',
  decode(repeat('d1', 32), 'hex'),
  digest('member-two@example.invalid', 'sha256'),
  'accepted',
  '10000000-0000-4000-8000-000000000002',
  now(),
  now() + interval '7 days'
);

insert into private.family_account_links (invitation_id, holder_user_id, family_user_id)
values (
  '50000000-0000-4000-8000-000000000040',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

-- 041: titular 003 (sem verificação) -> dependente 004.
insert into private.family_invitations (
  id, inviter_user_id, token_digest, invitee_email_digest, status,
  accepted_by_user_id, accepted_at, expires_at
)
values (
  '50000000-0000-4000-8000-000000000041',
  '10000000-0000-4000-8000-000000000003',
  decode(repeat('d2', 32), 'hex'),
  digest('hidden-member@example.invalid', 'sha256'),
  'accepted',
  '10000000-0000-4000-8000-000000000004',
  now(),
  now() + interval '7 days'
);

insert into private.family_account_links (invitation_id, holder_user_id, family_user_id)
values (
  '50000000-0000-4000-8000-000000000041',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Quem o convite familiar admitiu
-- ───────────────────────────────────────────────────────────────────────────

select is(
  public.has_verified_family_holder('10000000-0000-4000-8000-000000000002'),
  true,
  'o dependente de titular verificado é reconhecido (positivo)'
);

select is(
  public.has_verified_family_holder('10000000-0000-4000-8000-000000000001'),
  false,
  'o titular verificado não é dependente de si mesmo (negativo)'
);

select is(
  public.has_verified_family_holder('10000000-0000-4000-8000-000000000004'),
  false,
  'dependente de titular NÃO verificado continua recusado (negativo)'
);

select is(
  public.has_verified_family_holder('10000000-0000-4000-8000-000000000005'),
  false,
  'quem não tem vínculo familiar continua recusado (negativo)'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. É vínculo ativo, não histórico
-- ───────────────────────────────────────────────────────────────────────────

delete from private.family_account_links
where family_user_id = '10000000-0000-4000-8000-000000000002';

select is(
  public.has_verified_family_holder('10000000-0000-4000-8000-000000000002'),
  false,
  'vínculo familiar removido deixa de admitir (negativo)'
);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Ninguém além do service_role executa
-- ───────────────────────────────────────────────────────────────────────────

select is(
  has_function_privilege(
    'authenticated',
    'public.has_verified_family_holder(uuid)',
    'EXECUTE'
  ),
  false,
  'authenticated não executa a leitura de vínculo familiar'
);

select is(
  has_function_privilege('anon', 'public.has_verified_family_holder(uuid)', 'EXECUTE'),
  false,
  'anon não executa a leitura de vínculo familiar'
);

select is(
  has_function_privilege(
    'service_role',
    'public.has_verified_family_holder(uuid)',
    'EXECUTE'
  ),
  true,
  'service_role executa a leitura de vínculo familiar'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.has_verified_family_holder('10000000-0000-4000-8000-000000000002')
  $$,
  '42501', null,
  'o cliente autenticado não consulta o vínculo familiar pelo Data API'
);

reset role;

select * from finish();
rollback;
