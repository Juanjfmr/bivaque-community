-- Persona suspensa isolada (W1-DENIED).
-- Aplicada como bloco independente do seed.sql porque o seed.sql
-- falha ao re-aplicar num banco que ja tem dados (constraint uniques
-- duplicadas em family_account_links). Este bloco usa ON CONFLICT
-- DO NOTHING em ambos os inserts, entao e idempotente.
--
-- Pre-requisito: a migration 20260901124348_account_suspension.sql ja
-- aplicada (cria coluna is_suspended em profiles + helper
-- public.is_account_suspended + RLS updates).

begin;

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
) values (
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-4000-8000-000000000099',
  'authenticated',
  'authenticated',
  'membro-suspenso@bivaque.example.invalid',
  crypt('bivaque-e2e-local', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at,
  is_suspended
) values (
  '20000000-0000-4000-8000-000000000099',
  'Membro Suspenso',
  'locality_members',
  1,
  now() - interval '40 days',
  true
)
on conflict (user_id) do nothing;

commit;

-- ── Persona suspensa COM membership aprovada (W1-DENIED variante) ────────
-- A seed anterior (membro-suspenso@) nao tem comunidade aprovada, o
-- que a direciona para /onboarding antes de /community renderizar
-- o composer. Para provar que INSERT em posts/com_reactions/etc.
-- retorna 42501 ENQUANTO o membro esta logado e ve o feed, precisamos
-- de uma persona com membership aprovada + is_suspended=true.
-- O proxy.ts (apps/web/proxy.ts) faz o mesmo roteamento para ambos:
-- o feed aparece (community aprovada), o composer aparece, e o RLS
-- veto no POST.
--
-- UUID na faixa 20000000-... (mesma do dono da vila e do membro-suspenso)
-- para evitar colisao com os fixtures pgTAP (faixa 60000000-...).
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
) values (
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-4000-8000-00000000009a',
  'authenticated',
  'authenticated',
  'membro-suspenso-aprovado@bivaque.example.invalid',
  crypt('bivaque-e2e-local', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at,
  is_suspended
) values (
  '20000000-0000-4000-8000-00000000009a',
  'Membro Suspenso Aprovado',
  'locality_members',
  1,
  now() - interval '40 days',
  true
)
on conflict (user_id) do nothing;

insert into public.community_memberships (
  community_id,
  user_id,
  role,
  status,
  joined_at
) values (
  '71000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-00000000009a',
  'member',
  'approved',
  now() - interval '20 days'
)
on conflict (community_id, user_id) do nothing;

commit;
