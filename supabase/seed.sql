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
-- Manaus é dado de referência durável inserido pela primeira migration
-- (20260802000100_locality_profile_foundation.sql). O UUID do piloto é
-- 00000000-0000-4000-8000-000000000001.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. USUÁRIOS EXIGIDOS PELO RUNBOOK (§1)
-- ═══════════════════════════════════════════════════════════════════════════

-- Senha bcrypt: 'bivaque-e2e-local', hash gerado via crypt(..., gen_salt('bf')).
-- Password grant verificado: curl retorna HTTP 200 + access_token válido.

do $$
declare
  v_vis_id uuid := gen_random_uuid();
  v_rej_id uuid := gen_random_uuid();
begin
  -- Titular verificado: visual@bivaque.example.invalid
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token, email_change_token_new,
    email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_vis_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'visual@bivaque.example.invalid', '$2a$06$8AxsFG53pALHsiIYPz3.0.40CbFOBJCTu4z9BZUtvte0Fg3.u26IC',
    now(), '', '', '', '',
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('display_name', 'Ana Verificada'),
    now(), now());

  insert into auth.identities (id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_vis_id,
    jsonb_build_object('sub', v_vis_id::text, 'email', 'visual@bivaque.example.invalid', 'email_verified', true),
    'email', v_vis_id::text, now(), now(), now());

  -- O perfil vem logo abaixo. A primeira versão deste seed o omitiu por
  -- receio de quebrar o pgTAP; a hipótese foi testada e não se confirma
  -- para perfis 'hidden'. Ver a nota na inserção.

  insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
  values (v_vis_id, 'verified', 'active_federal_military', now());

  -- Membership ANTES do perfil: profiles tem FK composta
  -- profiles_user_id_locality_id_fkey apontando para locality_memberships.
  insert into public.locality_memberships (user_id, locality_id)
  values (v_vis_id, '00000000-0000-4000-8000-000000000001');

  -- visibility = 'hidden' é o que torna este perfil compatível com o pgTAP.
  -- A policy de select em 20260802000300_foundation_rls.sql:67 só expõe
  -- perfis com visibility = 'locality_members' a outros membros, e
  -- locality-profile-access.sql fixa esse conjunto exato em ('Member One',
  -- 'Member Two'). Um perfil 'hidden' fica fora daquele assert e continua
  -- visível para o próprio dono — que é o que /profile lê.
  -- Verificado: db:reset + test:db = 685 asserts, PASS.
  insert into public.profiles (user_id, display_name, locality_id, visibility)
  values (v_vis_id, 'Ana Verificada', '00000000-0000-4000-8000-000000000001', 'hidden');

  -- Rejeitado: rejected@bivaque.example.invalid
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token, email_change_token_new,
    email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_rej_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'rejected@bivaque.example.invalid', '$2a$06$8AxsFG53pALHsiIYPz3.0.40CbFOBJCTu4z9BZUtvte0Fg3.u26IC',
    now(), '', '', '', '',
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    '{}'::jsonb,
    now(), now());

  insert into auth.identities (id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_rej_id,
    jsonb_build_object('sub', v_rej_id::text, 'email', 'rejected@bivaque.example.invalid', 'email_verified', true),
    'email', v_rej_id::text, now(), now(), now());

  insert into private.verification_outcomes (user_id, status)
  values (v_rej_id, 'rejected');
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VOLUME DATA DEFERRED
--
-- Os ~300 membros, ~400 posts, 8 grupos e 10 eventos que o plano prescreve
-- (Task 2 Step 2) continuam fora — e aqui a restrição é real.
--
-- Volume só serve ao seu propósito (julgar densidade e carga de moderação)
-- se os perfis forem VISÍVEIS, isto é, visibility = 'locality_members'. E é
-- exatamente isso que locality-profile-access.sql proíbe: ele fixa o conjunto
-- visível em ('Member One', 'Member Two'). O truque do 'hidden' que viabiliza
-- o titular acima não se aplica ao volume, porque um membro invisível não
-- povoa tela nenhuma.
--
-- A saída é separar os consumidores, não enfraquecer o teste:
--   supabase/seed.sql      → fixtures que o pgTAP tolera (este arquivo)
--   supabase/seed-dev.sql  → volume, aplicado sob demanda por `pnpm db:seed`
-- Assim `db:reset && test:db` continua limpo, e dev/e2e/captura visual
-- rodam `db:reset && db:seed` antes de precisar de densidade.
--
-- Isso é mudança de arquitetura de seed e está fora do escopo desta task.
-- ═══════════════════════════════════════════════════════════════════════════
