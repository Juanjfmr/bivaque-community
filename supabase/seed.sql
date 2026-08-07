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

  -- Perfil e locality_membership NÃO são criados aqui porque os testes pgTAP
  -- usam results_eq com contagem exata de linhas sobre public.profiles, e
  -- qualquer linha extra em Manaus quebra as asserts. O auth.users é suficiente
  -- para o password grant. O perfil com display_name legível será criado pelo
  -- setup de e2e (Task 3 do plano de observabilidade).

  insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
  values (v_vis_id, 'verified', 'active_federal_military', now());

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
-- (Task 2 Step 2) não podem coexistir com os testes pgTAP atuais porque os
-- testes contam linhas e esperam valores exatos de fixture. Inserir dados
-- de volume na localidade de Manaus inflaria contagens e quebraria asserts
-- de ordenação alfabética em 15+ testes.
--
-- A separação correta seria um seed de "volume" que só roda depois dos
-- testes, mas o Supabase CLI não oferece hooks pós-teste. Até que os testes
-- pgTAP sejam adaptados para filtrar dados de seed, o volume fica fora.
-- ═══════════════════════════════════════════════════════════════════════════
