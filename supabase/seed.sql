-- Manaus is durable reference data and is inserted by the first migration
-- (20260802000100_locality_profile_foundation.sql). Never recreate it here —
-- reference it by id.
--
-- Fixtures duráveis de DESENVOLVIMENTO LOCAL.
--
-- Não confundir com as fixtures de supabase/tests/*, que são transacionais
-- e sofrem rollback por teste — aquelas continuam sendo a regra para pgTAP.
-- Este arquivo existe porque três consumidores precisam de um banco estável:
-- o operador (PILOT_RUNBOOK §1), a suíte e2e e a captura visual do §10.2.
--
-- Roda apenas em `supabase db reset --local`. Credenciais são públicas e
-- descartáveis por design.
--
-- Faixa de UUID: 20000000-… (a conta exigida pela suíte e2e). Não colide com
-- supabase/tests/fixtures/foundation.inc, que usa a faixa 10000000-….

begin;

-- ── Conta da suíte e2e ────────────────────────────────────────────────────
-- O e-mail precisa ser exatamente este: é o default lido por
-- tests/e2e/persistent-login.spec.ts.

-- Os campos de token vão como '' e não como NULL de propósito. O schema os
-- aceita nulos, mas o GoTrue os lê como `string` em Go: um NULL derruba o
-- password grant inteiro com
--   Scan error on column index 3, name "confirmation_token"
-- e HTTP 500 — não 400. Sem isto o login do seed não funciona.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'visual@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '90 days',
    now()
  )
on conflict (id) do nothing;

-- O estado de verificação vive no schema privado, nunca exposto pela Data API.
insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'verified',
    'active_federal_military',
    now() - interval '90 days'
  )
on conflict (user_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    now() - interval '90 days'
  )
on conflict (user_id, locality_id) do nothing;

insert into public.profiles (
  user_id,
  locality_id,
  display_name,
  visibility,
  consent_version,
  consented_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Ana Verificada',
    'locality_members',
    1,
    now() - interval '90 days'
  )
on conflict (user_id) do nothing;

commit;
