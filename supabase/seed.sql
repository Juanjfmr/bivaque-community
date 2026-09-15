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
-- Faixas de UUID, para não colidir com supabase/tests/fixtures/foundation.inc,
-- que usa a faixa 10000000-…:
--   20000000-…  as duas contas exigidas pelo PILOT_RUNBOOK §1

begin;

-- ── Titular verificado ────────────────────────────────────────────────────
-- O e-mail precisa ser exatamente este: é o default lido por
-- tests/e2e/persistent-login.spec.ts e pelo helper de sessão da suíte e2e.

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
  ),
  -- ── Conta rejeitada ─────────────────────────────────────────────────────
  -- Sem locality_membership por design: a linha em locality_memberships só
  -- existe quando o resultado é `verified`. Como public.profiles tem FK
  -- composta (user_id, locality_id) -> locality_memberships, esta conta
  -- também não tem profile — não é omissão, é o schema.
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'rejected@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '10 days',
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
  ),
  ('20000000-0000-4000-8000-000000000002', 'rejected', null, now() - interval '10 days')
on conflict (user_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    now() - interval '90 days'
  )
on conflict (user_id, locality_id) do nothing;

-- display_name legível: a auditoria visual julga o header do perfil, e
-- "Novo membro" não permite julgar nada.
insert into public.profiles (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Ana Verificada',
    'locality_members',
    1,
    now() - interval '90 days'
  )
on conflict (user_id) do nothing;

-- Unresolved recommendation request authored by the same account, for
-- tests/e2e/recommendation-reply-notify.spec.ts ("Marcar como resolvido" is
-- only reachable for the request's own author). recommendation_requests had
-- zero rows before this — found running the E2E realignment.
insert into public.recommendation_requests (
  id, author_id, locality_id, title, body, category
)
values (
  '80000000-0000-4000-8000-000000000f00',
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Alguém conhece um bom encanador?',
  'Preciso resolver um vazamento no banheiro esta semana.',
  'outros'
)
on conflict (id) do nothing;

-- ── Segunda localidade (Rio de Janeiro) para a suíte e2e ─────────────────
-- A auditoria visual P0 precisa de uma 2ª UF no seed para os specs
-- tests/e2e/two-localities.spec.ts e tests/e2e/empty-locality.spec.ts:
--   membro-rio@bivaque.example.invalid        — SECOND_LOCALITY_EMAIL
--   verified-no-membership@bivaque.example.invalid — VERIFIED_NO_MEMBERSHIP_EMAIL
--   membro-vazia@bivaque.example.invalid      — EMPTY_LOCALITY_EMAIL
--
-- O Rio existe no catálogo (20260817022707, ibge_code '3304557'), mas o seu
-- id é gerado por gen_random_uuid() a cada reset — nunca o referencie por
-- UUID fixo. As memberships abaixo resolvem o id por subquery no ibge_code,
-- a identidade canônica do catálogo.
--
-- Duas contas são membros do Rio e duas asserções dependem disso:
--   * two-localities Grupo 1: o feed/eventos/guia do membro do Rio não
--     mostra marcadores de Manaus (asserções negativas, toHaveCount(0));
--   * empty-locality: o Rio tem 2 membros (< STALE_LOCALITY_THRESHOLD, 30),
--     então feed/eventos/guia renderizam o estado vazio honesto
--     ("Você é dos primeiros aqui.").
-- verified-no-membership é verificado mas não escolheu localidade: sem
-- membership e sem profile — a linha em locality_memberships só existe para
-- quem completou o onboarding, e public.profiles nasce do membership.

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
    '20000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'membro-rio@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '45 days',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'verified-no-membership@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '30 days',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'membro-vazia@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '15 days',
    now()
  )
on conflict (id) do nothing;

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  ('20000000-0000-4000-8000-000000000003', 'verified', 'active_federal_military', now() - interval '45 days'),
  ('20000000-0000-4000-8000-000000000004', 'verified', 'veteran', now() - interval '30 days'),
  ('20000000-0000-4000-8000-000000000005', 'verified', 'military_pensioner', now() - interval '15 days')
on conflict (user_id) do nothing;

-- Só as duas contas que escolheram o Rio ganham membership. O id do Rio é
-- resolvido pelo ibge_code ('3304557') — nunca por UUID fixo, porque o id do
-- catálogo é gen_random_uuid() e muda a cada reset.
insert into public.locality_memberships (user_id, locality_id, joined_at)
select v.user_id, l.id, v.joined_at
from (values
  ('20000000-0000-4000-8000-000000000003'::uuid, now() - interval '45 days'),
  ('20000000-0000-4000-8000-000000000005'::uuid, now() - interval '15 days')
) as v(user_id, joined_at)
cross join public.localities l
where l.ibge_code = '3304557'
on conflict (user_id, locality_id) do nothing;

-- display_name legível: a auditoria visual julga o header do perfil.
insert into public.profiles (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at
)
values
  (
    '20000000-0000-4000-8000-000000000003',
    'Membro do Rio',
    'locality_members',
    1,
    now() - interval '45 days'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'Primeiro do Rio',
    'locality_members',
    1,
    now() - interval '15 days'
  )
on conflict (user_id) do nothing;

-- ── Conta com transferência declarada, para o seletor de localidade (T4) ──
-- tests/e2e/transfer-switch.spec.ts precisa de um titular já em trânsito
-- entre Manaus (origem, kind='leaving', ainda ativo) e o Rio (destino,
-- kind='current') sem depender do RPC declare_locality_transfer em runtime —
-- inserir direto aqui, como as outras contas deste arquivo, mantém o spec
-- livre de um passo de setup que mutaria a conta compartilhada `visual@`.
-- leaving_at fica 20 dias no futuro: declarado, mas não degradado — o
-- pgTAP em supabase/tests/transfer-degradation.sql já cobre o caminho
-- degradado isoladamente.
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
    '20000000-0000-4000-8000-000000000006',
    'authenticated',
    'authenticated',
    'membro-transferencia@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '60 days',
    now()
  )
on conflict (id) do nothing;

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  ('20000000-0000-4000-8000-000000000006', 'verified', 'active_federal_military', now() - interval '60 days')
on conflict (user_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at, kind, leaving_at, access)
values
  (
    '20000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    now() - interval '60 days',
    'leaving',
    (current_date + interval '20 days')::date,
    'active'
  )
on conflict (user_id, locality_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at, kind, access)
select '20000000-0000-4000-8000-000000000006'::uuid, l.id, now() - interval '5 days', 'current', 'active'
from public.localities l
where l.ibge_code = '3304557'
on conflict (user_id, locality_id) do nothing;

insert into public.profiles (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at
)
values
  (
    '20000000-0000-4000-8000-000000000006',
    'Em Transferência',
    'locality_members',
    1,
    now() - interval '60 days'
  )
on conflict (user_id) do nothing;

-- ── Conta operadora, para tests/e2e/guide-manual-curation.spec.ts ─────────
-- public.operators é um allowlist vazio por padrão — nenhuma das ~300
-- contas de membro é operadora. O painel /guide-queue (e o resto do grupo
-- de rotas (admin)) exige is_current_user_operator(); sem uma linha aqui o
-- teste do caminho "é operador" não tinha como existir — encontrado
-- realinhando os specs de E2E.
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
    '20000000-0000-4000-8000-000000000007',
    'authenticated',
    'authenticated',
    'operador@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '60 days',
    now()
  )
on conflict (id) do nothing;

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  ('20000000-0000-4000-8000-000000000007', 'verified', 'active_federal_military', now() - interval '60 days')
on conflict (user_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at)
values
  (
    '20000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000001',
    now() - interval '60 days'
  )
on conflict (user_id, locality_id) do nothing;

insert into public.profiles (
  user_id,
  display_name,
  visibility,
  consent_version,
  consented_at
)
values
  (
    '20000000-0000-4000-8000-000000000007',
    'Operador Manaus',
    'locality_members',
    1,
    now() - interval '60 days'
  )
on conflict (user_id) do nothing;

insert into public.operators (auth_user_id, notes)
values ('20000000-0000-4000-8000-000000000007', 'seeded operator for local dev / E2E')
on conflict (auth_user_id) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- Volume de conteúdo
--
-- O piloto abre com ~300 militares mais dependentes, então o seed modela essa
-- ordem de grandeza e não uma fração dela: julgar densidade, ritmo de feed e
-- carga de moderação contra 5 linhas não significa nada.
--
-- Tudo gerado por generate_series a partir de índices — nenhum INSERT à mão.
-- Os textos evitam o vocabulário barrado por post_no_forbidden_terms e
-- comment_no_forbidden_terms (venda, compra, patente, OM, CPF, vídeo,
-- inteligência artificial, …), e os locais evitam events_venue_check
-- (rua, avenida, quadra, quartel, …).
--
-- Faixas de UUID:
--   30000000-…  membros          40000000-…  dependentes
--   50000000-…  convites família 60000000-…  grupos
--   70000000-…  eventos          71000000-…  comunidades
--   80000000-…  posts
-- ══════════════════════════════════════════════════════════════════════════

-- ── ~300 membros de Manaus ────────────────────────────────────────────────

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'membro-' || i || '@bivaque.example.invalid',
  crypt('bivaque-e2e-local', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  '', '', '', '', '', '', '', '',
  now() - make_interval(days => 90 - (i % 90)),
  now()
from generate_series(1, 300) as i
on conflict (id) do nothing;

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
select
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'verified',
  (array['active_federal_military', 'veteran', 'military_pensioner'])[1 + (i % 3)]::private.eligibility_class,
  now() - make_interval(days => 90 - (i % 90))
from generate_series(1, 300) as i
on conflict (user_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at)
select
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  now() - make_interval(days => 90 - (i % 90))
from generate_series(1, 300) as i
on conflict (user_id, locality_id) do nothing;

insert into public.profiles (
  user_id, display_name, visibility, consent_version, consented_at
)
select
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (array[
    'Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Fábio', 'Gabriela', 'Heitor',
    'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nelson', 'Olívia',
    'Paulo', 'Queila', 'Rafael', 'Sofia', 'Tiago'
  ])[1 + (i % 20)]
  || ' '
  || (array[
    'Almeida', 'Barbosa', 'Cavalcante', 'Duarte', 'Esteves', 'Ferreira',
    'Gomes', 'Henriques', 'Ibrahim', 'Ju de Souza', 'Klein', 'Lima',
    'Monteiro', 'Nogueira', 'Oliveira'
  ])[1 + ((i / 20) % 15)],
  'locality_members',
  1,
  now() - make_interval(days => 90 - (i % 90))
from generate_series(1, 300) as i
on conflict (user_id) do nothing;

-- ── ~60 dependentes, ligados por family_account_links ─────────────────────
-- Contas de família continuam sendo Auth users independentes. Elas não
-- recebem profile aqui de propósito: o plano conta 300 membros e 60
-- dependentes separadamente, e o vínculo é o que precisa ser exercitado.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  ('40000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'dependente-' || i || '@bivaque.example.invalid',
  crypt('bivaque-e2e-local', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  '', '', '', '', '', '', '', '',
  now() - make_interval(days => 60 - (i % 60)),
  now()
from generate_series(1, 60) as i
on conflict (id) do nothing;

-- O convite entra já como `accepted`: inserir aceito não dispara o trigger de
-- notificação, que só roda em UPDATE.
insert into private.family_invitations (
  id, inviter_user_id, token_digest, invitee_email_digest, status,
  expires_at, accepted_by_user_id, accepted_at, created_at
)
select
  ('50000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  sha256(convert_to('seed-family-token-' || i, 'UTF8')),
  sha256(convert_to('dependente-' || i || '@bivaque.example.invalid', 'UTF8')),
  'accepted',
  now() + interval '30 days',
  ('40000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  now() - make_interval(days => 60 - (i % 60)),
  now() - make_interval(days => 61 - (i % 60))
from generate_series(1, 60) as i
on conflict (id) do nothing;

insert into private.family_account_links (
  invitation_id, holder_user_id, family_user_id, linked_at
)
select
  ('50000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('40000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  now() - make_interval(days => 60 - (i % 60))
from generate_series(1, 60) as i;

-- ── Fila de admissão: quem ainda não entrou ────────────────────────────────
-- O painel do operador (Task 9) julga a fila com volume real: ~300 contas
-- entre pending, temporary_error e rejected, com created_at espalhado para o
-- destaque de 48h do SLA aparecer. Nenhuma tem profile: quem não passou da
-- verificação ainda não completou o onboarding. Faixa 90000000-….
--
-- rejected é raro (i % 40) e temporary_error é o ruído esperado num pico
-- de lançamento (i % 6): é exatamente o mix que o operador precisa ler.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  ('90000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'admissao-' || i || '@bivaque.example.invalid',
  crypt('bivaque-e2e-local', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  '', '', '', '', '', '', '', '',
  now() - make_interval(days => 15 - (i % 15)),
  now()
from generate_series(1, 300) as i
on conflict (id) do nothing;

insert into private.verification_outcomes (
  user_id, status, eligibility_class, checked_at, created_at
)
select
  ('90000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (case
    when i % 40 = 0 then 'rejected'
    when i % 6 = 0 then 'temporary_error'
    else 'pending'
  end)::private.verification_status,
  null,
  null,
  now() - make_interval(hours => 6 + (i % 340))
from generate_series(1, 300) as i
on conflict (user_id) do nothing;

-- ── 8 grupos, 2 privados, com membros sobrepostos ─────────────────────────

insert into public.groups (
  id, name, description, visibility, locality_id, created_by, owner_user_id,
  created_at
)
select
  ('60000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (array[
    'Caminhada no Mindu', 'Pais e Filhos', 'Corrida às Terças',
    'Trocas de Livros', 'Estudos para Concurso', 'Mães da Cidade',
    'Reformas e Consertos', 'Pesca e Trilha'
  ])[i],
  (array[
    'Grupo para combinar caminhadas cedo, antes do calor apertar.',
    'Conversas sobre escola, atividades e passeios com as crianças.',
    'Encontro fixo às terças, ritmo leve, todo mundo é bem-vindo.',
    'Cada um traz um livro lido e leva outro para casa.',
    'Material, cronograma e apoio para quem está estudando.',
    'Espaço reservado para as mães trocarem experiências do dia a dia.',
    'Indicações de quem faz um bom serviço e resolve rápido.',
    'Roteiros de fim de semana, trilhas leves e pontos de pesca.'
  ])[i],
  (case when i in (6, 8) then 'private' else 'public' end)::group_visibility,
  '00000000-0000-4000-8000-000000000001',
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  now() - make_interval(days => 80 - (i * 3))
from generate_series(1, 8) as i
on conflict (id) do nothing;

-- Sobreposição proposital: cada membro entra em (i % 3) + 1 grupos, então
-- muita gente aparece em mais de um.
insert into public.group_memberships (group_id, user_id, role, status, joined_at)
select distinct
  ('60000000-0000-4000-8000-' || lpad(to_hex(1 + ((i + g) % 8)), 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  (case when i <= 8 and g = 0 then 'owner' else 'member' end)::group_membership_role,
  'approved'::group_membership_status,
  now() - make_interval(days => 70 - (i % 70))
from generate_series(1, 300) as i, generate_series(0, 2) as g
where g <= (i % 3)
on conflict (group_id, user_id) do nothing;

-- ── Vila Ajuricaba (comunidade), para os specs de E2E de comunidade ───────
-- public.communities estava com zero linhas: nenhuma das ~300 contas de
-- membro pertence a uma comunidade, então tests/e2e/community-batch-
-- approval.spec.ts, community-invitations.spec.ts e vila-home.spec.ts não
-- tinham como passar — encontrado realinhando os specs de E2E. A conta
-- dona é dedicada (dono-vila@), não a visual@ padrão: vila-home.spec.ts
-- precisa da MESMA conta seedSession() ser simultaneamente "sem comunidade
-- aprovada" (seu segundo teste) e "membro aprovado da Vila Ajuricaba" (seu
-- primeiro teste) — mutuamente exclusivo para uma única conta. A conta
-- visual@ permanece sem comunidade, como antes.
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
    '20000000-0000-4000-8000-000000000008',
    'authenticated',
    'authenticated',
    'dono-vila@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '80 days',
    now()
  )
on conflict (id) do nothing;

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  ('20000000-0000-4000-8000-000000000008', 'verified', 'active_federal_military', now() - interval '80 days')
on conflict (user_id) do nothing;

insert into public.locality_memberships (user_id, locality_id, joined_at)
values
  (
    '20000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000001',
    now() - interval '80 days'
  )
on conflict (user_id, locality_id) do nothing;

insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
values
  (
    '20000000-0000-4000-8000-000000000008',
    'Dono da Vila',
    'locality_members',
    1,
    now() - interval '80 days'
  )
on conflict (user_id) do nothing;

insert into public.communities (id, locality_id, name, description, created_by, owner_user_id, created_at)
values (
  '71000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Vila Ajuricaba',
  'A vila do bairro Ajuricaba, para quem mora ou já morou por perto.',
  '20000000-0000-4000-8000-000000000008',
  '20000000-0000-4000-8000-000000000008',
  now() - interval '80 days'
)
on conflict (id) do nothing;

insert into public.community_memberships (community_id, user_id, role, status, joined_at)
values
  (
    '71000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000008',
    'owner',
    'approved',
    now() - interval '80 days'
  )
on conflict (community_id, user_id) do nothing;

-- Um membro aprovado comum, elegível para promoção a moderador
-- (community-batch-approval.spec.ts "promote page lists eligible members").
insert into public.community_memberships (community_id, user_id, role, status, joined_at)
values (
  '71000000-0000-4000-8000-000000000001',
  ('30000000-0000-4000-8000-' || lpad(to_hex(25), 12, '0'))::uuid,
  'member',
  'approved',
  now() - interval '20 days'
)
on conflict (community_id, user_id) do nothing;

-- Cinco pedidos pendentes: community-batch-approval.spec.ts aprova 3 de 5 e
-- espera exatamente 2 restantes.
insert into public.community_memberships (community_id, user_id, role, status, joined_at)
select
  '71000000-0000-4000-8000-000000000001'::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'member'::community_membership_role,
  'pending'::community_membership_status,
  now() - make_interval(days => 30 - i)
from generate_series(20, 24) as i
on conflict (community_id, user_id) do nothing;

-- ═══ Aprovações extras na Ajuricaba e a vila do Rio (reconciliação E2E) ═══
-- Duas premissas de spec que o seed não provia, achadas reconciliando o lote
-- funcional de 2026-08-25:
--
-- * synthetic-people-interaction.spec.ts precisa de três contas com feed de
--   vila real (autor, comentarista e segunda reação). Sem aprovação na vila,
--   essas contas caem na CityReference (D48), que não lista posts — o post
--   nunca renderiza e o cenário morre no primeiro passo.
-- * empty-locality.spec.ts espera que um membro COM comunidade aprovada numa
--   localidade abaixo do limiar §3.4 veja "Você é dos primeiros aqui." no
--   FEED da vila. O Rio tinha membros mas nenhuma vila: o /community de
--   membro-vazia@ renderizava CityReference e o estado vazio do feed nunca
--   aparecia.
insert into public.community_memberships (community_id, user_id, role, status, joined_at)
values
  (
    '71000000-0000-4000-8000-000000000001',
    ('30000000-0000-4000-8000-' || lpad(to_hex(1), 12, '0'))::uuid,
    'member',
    'approved',
    now() - interval '15 days'
  ),
  (
    '71000000-0000-4000-8000-000000000001',
    ('30000000-0000-4000-8000-' || lpad(to_hex(2), 12, '0'))::uuid,
    'member',
    'approved',
    now() - interval '15 days'
  ),
  (
    '71000000-0000-4000-8000-000000000001',
    ('30000000-0000-4000-8000-' || lpad(to_hex(3), 12, '0'))::uuid,
    'member',
    'approved',
    now() - interval '15 days'
  )
on conflict (community_id, user_id) do nothing;

-- Owner dedicada do Rio, mesmo padrão de dono-vila@ (próximo id livre da faixa).
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
    '20000000-0000-4000-8000-000000000009',
    'authenticated',
    'authenticated',
    'dono-vila-rio@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '40 days',
    now()
  )
on conflict (id) do nothing;

insert into private.verification_outcomes (user_id, status, eligibility_class, checked_at)
values
  ('20000000-0000-4000-8000-000000000009', 'verified', 'active_federal_military', now() - interval '40 days')
on conflict (user_id) do nothing;

-- O id do Rio nasce de gen_random_uuid() a cada reset; resolve sempre pelo
-- ibge_code do catálogo, mesma regra das memberships do Rio lá em cima.
insert into public.locality_memberships (user_id, locality_id, joined_at)
select '20000000-0000-4000-8000-000000000009', id, now() - interval '40 days'
from public.localities
where ibge_code = '3304557'
on conflict (user_id, locality_id) do nothing;

insert into public.profiles (user_id, display_name, visibility, consent_version, consented_at)
values
  (
    '20000000-0000-4000-8000-000000000009',
    'Dona da Vila Rio',
    'locality_members',
    1,
    now() - interval '40 days'
  )
on conflict (user_id) do nothing;

insert into public.communities (id, locality_id, name, description, created_by, owner_user_id, created_at)
select
  '71000000-0000-4000-8000-000000000002',
  id,
  'Vila Petrópolis',
  'A vila do bairro Petrópolis, para quem mora ou já morou por perto.',
  '20000000-0000-4000-8000-000000000009',
  '20000000-0000-4000-8000-000000000009',
  now() - interval '40 days'
from public.localities
where ibge_code = '3304557'
on conflict (id) do nothing;

insert into public.community_memberships (community_id, user_id, role, status, joined_at)
values
  (
    '71000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000009',
    'owner',
    'approved',
    now() - interval '40 days'
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000005',  -- membro-vazia@
    'member',
    'approved',
    now() - interval '15 days'
  )
on conflict (community_id, user_id) do nothing;

-- ═══ Prestador semeado para os E2E da vitrine (onda G Task 9) ═══
-- Conta dedicada no mesmo padrão de credenciais públicas de descarte.
-- D37 na prática: SEM locality_memberships e SEM linha em profiles — o
-- prestador é alcançado por provider_accounts/provider_reach, jamais pelo
-- diretório de membros. Ficha com um item de catálogo para a busca da
-- localidade ter o que encontrar; nome escolhido para casar com a busca
-- parcial "climatiza" usada pelos specs.
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
    '20000000-0000-4000-8000-00000000000a',
    'authenticated',
    'authenticated',
    'prestador-seed@bivaque.example.invalid',
    crypt('bivaque-e2e-local', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', '',
    now() - interval '30 days',
    now()
  )
on conflict (id) do nothing;

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  '20000000-0000-4000-8000-00000000000a',
  '20000000-0000-4000-8000-000000000008',  -- dono-vila@ atestou
  '71000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.provider_profiles (
  id, owner_user_id, display_name, category, bio
)
values (
  '30000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-00000000000a',
  'Climatiza Manaus',
  'assistencia_tecnica',
  'Manutenção e instalação de ar-condicionado'
)
on conflict (id) do nothing;

insert into public.provider_catalog_items (
  provider_id, title, description, price_cents, position
)
values (
  '30000000-0000-4000-8000-000000000010',
  'Limpeza completa',
  'Higienização da evaporadora',
  15000,
  0
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000010',
  'community',
  '71000000-0000-4000-8000-000000000001',
  'free'
);

-- RECON-023: pedido semeado da prancha 17, com a conversa de contexto fixo e
-- duas respostas. membro-1@ e membro aprovado da vila da Climatiza, entao ele
-- pode ver a ficha e criar o pedido pelo RPC. IDs fixos para a captura visual
-- e para o ciclo entre duas contas.
insert into public.dm_conversations (
  id, participant_a, participant_b, context_type, context_id, created_at
)
values (
  '41000000-0000-4000-8000-000000000023',
  '20000000-0000-4000-8000-00000000000a',
  '30000000-0000-4000-8000-000000000001',
  'provider',
  '30000000-0000-4000-8000-000000000010',
  now() - interval '5 days'
)
on conflict (id) do nothing;

insert into public.service_requests (
  id,
  requester_user_id,
  provider_id,
  provider_user_id,
  description,
  when_text,
  status,
  conversation_id,
  category,
  created_at,
  updated_at
)
values (
  '40000000-0000-4000-8000-000000000023',
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-00000000000a',
  'Preciso limpar o ar-condicionado do quarto e conferir a carga de gas.',
  'Nesta semana',
  'in_conversation',
  '41000000-0000-4000-8000-000000000023',
  'assistencia_tecnica',
  now() - interval '5 days',
  now() - interval '5 days'
)
on conflict (id) do nothing;

insert into public.dm_messages (id, conversation_id, sender_id, content, created_at)
values
  (
    '42000000-0000-4000-8000-000000000023',
    '41000000-0000-4000-8000-000000000023',
    '30000000-0000-4000-8000-000000000001',
    'Oi! Consigo atender nesta quinta, de manha. Pode ser?',
    now() - interval '4 days'
  ),
  (
    '42000000-0000-4000-8000-000000000024',
    '41000000-0000-4000-8000-000000000023',
    '20000000-0000-4000-8000-00000000000a',
    'Pode sim. Chego as 9h.',
    now() - interval '3 days'
  )
on conflict (id) do nothing;

-- Post de alcance municipal (community_id IS NULL), para
-- vila-home.spec.ts: aparece no feed de qualquer vila, inclusive a Vila
-- Ajuricaba.
insert into public.posts (id, locality_id, user_id, post_type, content, created_at)
values (
  '80000000-0000-4000-8000-000000000f01',
  '00000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000008',
  'text',
  'Aviso da cidade para todas as vilas',
  now() - interval '2 days'
)
on conflict (id) do nothing;

-- ── ~400 posts de texto ao longo dos últimos 30 dias ──────────────────────
-- Autoria desigual de propósito: 4 em cada 5 posts saem de 20 pessoas muito
-- ativas, o resto se espalha pela cauda longa silenciosa. É assim que uma
-- comunidade real se comporta, e é o que a auditoria de densidade precisa ver.

insert into public.posts (
  id, locality_id, user_id, group_id, post_type, content, created_at
)
select
  ('80000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  (
    '30000000-0000-4000-8000-'
    || lpad(to_hex(case when i % 5 <> 0 then 1 + (i % 20) else 21 + (i % 279) end), 12, '0')
  )::uuid,
  case
    when i % 7 = 0
      then ('60000000-0000-4000-8000-' || lpad(to_hex(1 + (i % 8)), 12, '0'))::uuid
    else null
  end,
  'text',
  (array[
    'A feira do fim de semana abriu mais cedo e estava tranquila na primeira hora.',
    'Quem já passou no trecho novo da ciclovia? Achei bem sinalizado e seguro.',
    'Chuva forte de manhã, mas o trânsito fluiu melhor do que eu esperava.',
    'Dica rápida: a padaria da esquina abre às cinco e o pão sai quentinho.',
    'Alguém indica um lugar bom para levar as crianças no domingo de manhã?',
    'Terminei o curso de manutenção que comecei em janeiro e recomendo bastante.',
    'O parque ficou cheio no fim da tarde, clima ótimo para caminhar.',
    'Encontrei um grupo de corrida que sai cedo às terças e às quintas.',
    'Estou organizando um mutirão para limpar a área do campinho no sábado.',
    'Passei na biblioteca e tem oficina gratuita de leitura para os pequenos.',
    'Boa notícia: o posto de saúde voltou a atender aos sábados pela manhã.',
    'Resolvi a papelada da mudança numa manhã só, foi mais rápido do que imaginei.'
  ])[1 + (i % 12)]
  || repeat(
    (array[
      ' Vale muito a pena conferir com calma.',
      ' Se alguém quiser ir junto, é só avisar por aqui.',
      ' Depois eu volto para contar como foi.',
      ' Achei que seria mais complicado, mas deu tudo certo no fim.'
    ])[1 + (i % 4)],
    1 + (i % 4)
  ),
  now() - make_interval(days => 30) + make_interval(mins => (i * 108))
from generate_series(1, 400) as i
on conflict (id) do nothing;

-- Uma fração com reações e comentários, para o feed não parecer inerte.
insert into public.post_reactions (post_id, user_id, created_at)
select distinct
  ('80000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(1 + ((i * 7 + r * 31) % 300)), 12, '0'))::uuid,
  now() - make_interval(days => 29) + make_interval(mins => (i * 110))
from generate_series(1, 400) as i, generate_series(1, 5) as r
where i % 3 = 0 and r <= 1 + (i % 5)
on conflict (post_id, user_id) do nothing;

insert into public.comments (post_id, user_id, content, created_at)
select
  ('80000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(1 + ((i * 13 + c * 47) % 300)), 12, '0'))::uuid,
  (array[
    'Também achei, passei por lá ontem.',
    'Obrigada pela dica, vou tentar no fim de semana.',
    'Alguém sabe se funciona também no feriado?',
    'Estive lá na semana passada e recomendo.'
  ])[1 + ((i + c) % 4)],
  now() - make_interval(days => 28) + make_interval(mins => (i * 112 + c * 20))
from generate_series(1, 400) as i, generate_series(1, 3) as c
where i % 5 = 0 and c <= 1 + (i % 3);

-- ── 4 eventos passados e 6 futuros ────────────────────────────────────────
-- Os locais evitam qualquer termo de logradouro ou instalação militar, que
-- events_venue_check barra.

insert into public.events (
  id, organizer_id, locality_id, title, description, starts_at, ends_at,
  venue, status, created_at
)
select
  ('70000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || lpad(to_hex(1 + (i % 12)), 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000001',
  (array[
    'Caminhada matinal no parque', 'Feira de troca de livros',
    'Roda de conversa sobre estudos', 'Mutirão de limpeza do campinho',
    'Piquenique das famílias', 'Torneio amistoso de futebol',
    'Oficina de leitura para crianças', 'Encontro do grupo de corrida',
    'Tarde de jogos de tabuleiro', 'Café da manhã coletivo'
  ])[i],
  'Encontro aberto a quem é da comunidade. Chegue alguns minutos antes.',
  case when i <= 4
    then now() - make_interval(days => 5 * i)
    else now() + make_interval(days => 3 * (i - 4))
  end,
  case when i <= 4
    then now() - make_interval(days => 5 * i) + interval '2 hours'
    else now() + make_interval(days => 3 * (i - 4)) + interval '2 hours'
  end,
  (array[
    'Parque do Mindu', 'Centro de Convivência', 'Praça da Saudade',
    'Campinho do Coroado', 'Parque dos Bilhares', 'Ginásio Municipal',
    'Biblioteca Pública', 'Parque do Mindu', 'Centro de Convivência',
    'Praça da Saudade'
  ])[i],
  (case when i <= 4 then 'completed' else 'upcoming' end)::event_status,
  now() - interval '40 days'
from generate_series(1, 10) as i
on conflict (id) do nothing;

-- ── ~15 denúncias abertas ─────────────────────────────────────────────────
-- Um operador único olhando 15 denúncias abertas é um teste de usabilidade
-- diferente de olhar 2. O autor nunca é o denunciante: reports_block_self
-- levanta exceção nesse caso.

insert into public.reports (
  reporter_user_id, target_type, target_id, reason, status, created_at
)
select
  (
    select pr.user_id
    from public.profiles pr
    join public.locality_memberships lm
      on lm.user_id = pr.user_id
    where pr.user_id <> p.user_id
      and lm.locality_id = '00000000-0000-4000-8000-000000000001'
    order by pr.user_id
    limit 1
  ),
  'post'::report_target_type,
  p.id,
  (array[
    'Mensagem parece fora do tema da comunidade.',
    'Conteúdo repetido várias vezes no mesmo dia.',
    'Tom agressivo com outro morador nos comentários.',
    'Parece divulgação de serviço sem relação com o grupo.',
    'Informação incorreta sobre horário de atendimento.'
  ])[1 + (row_number() over (order by p.created_at))::int % 5],
  'open'::report_status,
  now() - make_interval(days => 12) + make_interval(hours => 7)
from public.posts p
where p.id between '80000000-0000-4000-8000-000000000001'::uuid
              and '80000000-0000-4000-8000-00000000000f'::uuid;

-- ── Guia de chegada: referência curada de Manaus ─────────────────────────
-- Dados fictícios de desenvolvimento local; a curadoria real entra via
-- service_role/runbook, nunca por seed de produção.
insert into public.arrival_guide_entries (
  id, locality_id, category, name, description, website_url, phone
)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'school',
    'Escola Modelo do Centro',
    'Ensino fundamental e médio, com turno integral e acolhimento de transferidos no meio do ano.',
    'https://escola-modelo.example.invalid',
    '(92) 3000-0001'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'hospital',
    'Hospital de Referência da Cidade',
    'Pronto-atendimento adulto e pediátrico; o guia não substitui orientação médica.',
    'https://hospital-referencia.example.invalid',
    '(92) 3000-0002'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'transporter',
    'Transportadora Ajuricaba',
    'Mudanças locais e interestaduais, com avaliação de volume antes do fechamento.',
    'https://transportadora-ajuricaba.example.invalid',
    '(92) 3000-0003'
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    'courier',
    'Despachante Central',
    'Documentação veicular e apoio para quem acabou de chegar e precisa regularizar o carro.',
    null,
    '(92) 3000-0004'
  )
on conflict (id) do nothing;

-- ── Guia de chegada: fila de curadoria pendente (desenvolvimento) ──────────
-- A leitura pública enxerga apenas status = approved; estes dois itens
-- exercitam a fila do operador sem aparecer para membros.
insert into public.arrival_guide_entries (
  id, locality_id, category, name, description, website_url, phone, status, source, confidence
)
values
  (
    'a0000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    'school',
    'Escola de Acolhimento Militar',
    'Sugestão extraída de indicação da comunidade para transferência no meio do ano.',
    'https://escola-acolhimento.example.invalid',
    '(92) 3000-0005',
    'pending',
    'ai',
    78
  ),
  (
    'a0000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    'transporter',
    'Mudanças Rápido Norte',
    'Sugestão manual aguardando conferência de telefone antes de publicar.',
    null,
    '(92) 3000-0006',
    'pending',
    'manual',
    null
  )
on conflict (id) do nothing;

-- ── RECON-051: fixtures de estado para os itens [dado]/[captura] ───────────
-- A conta de captura (visual@, 20000000-…0001) era, por desenho, um membro
-- verificado SEM publicação, SEM grupo, SEM comunidade, SEM conversa e SEM
-- notificação. Pranchas inteiras ficavam no estado vazio do runtime: a faixa de
-- atividade do /inicio (01), Minhas denúncias e bloqueados (56), Indicações com
-- resposta marcada (80), Meus anúncios (21), Mercado (13) e Mensagens (75).
--
-- Tudo abaixo pende dela. Os terceiros usados (membro-26@, membro-27@) não são
-- citados por nenhum spec de tests/e2e — trocar por membro-1..6@ mexeria em
-- asserções de contagem que já existem.

-- 1) Publicação do titular + resposta de terceiro. A notificação não-lida que
--    faz a faixa de atividade aparecer nasce do trigger notify_comment, não de
--    um INSERT à mão: o shape tem de ser o do produto.
insert into public.posts (id, locality_id, user_id, post_type, content, created_at)
values (
  'b0000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'text',
  'Chegamos em Manaus no mês passado. Alguma dica de escola perto do Centro?',
  now() - interval '2 days'
)
on conflict (id) do nothing;

insert into public.comments (post_id, user_id, content, created_at)
values (
  'b0000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-00000000001a',
  'A Escola Municipal do Centro recebe bem as famílias novas. Vale a visita.',
  now() - interval '1 day'
);

-- 2) Conversa direta do titular com o prestador, dentro de um pedido real —
--    contexto 'provider' autêntico (não um chip de "grupo em comum" sem grupo).
insert into public.dm_conversations (id, participant_a, participant_b, context_type, context_id, created_at)
values (
  '41000000-0000-4000-8000-000000000051',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-00000000000a',
  'provider',
  '30000000-0000-4000-8000-000000000010',
  now() - interval '3 days'
)
on conflict (id) do nothing;

insert into public.service_requests (
  id, requester_user_id, provider_id, provider_user_id, description, when_text,
  status, conversation_id, category, created_at, updated_at
)
values (
  '40000000-0000-4000-8000-000000000051',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-00000000000a',
  'Preciso de limpeza em dois aparelhos antes da mudança.',
  'Semana que vem',
  'in_conversation',
  '41000000-0000-4000-8000-000000000051',
  'assistencia_tecnica',
  now() - interval '3 days',
  now() - interval '2 days'
)
on conflict (id) do nothing;

insert into public.dm_messages (id, conversation_id, sender_id, content, created_at)
values
  ('42000000-0000-4000-8000-000000000051', '41000000-0000-4000-8000-000000000051',
   '20000000-0000-4000-8000-000000000001', 'Bom dia! Vocês atendem no Centro?', now() - interval '3 days'),
  ('42000000-0000-4000-8000-000000000052', '41000000-0000-4000-8000-000000000051',
   '20000000-0000-4000-8000-00000000000a', 'Atendemos sim. Consigo na quinta pela manhã.', now() - interval '2 days'),
  ('42000000-0000-4000-8000-000000000053', '41000000-0000-4000-8000-000000000051',
   '20000000-0000-4000-8000-000000000001', 'Fechado. Pode confirmar 9h?', now() - interval '1 day'),
  ('42000000-0000-4000-8000-000000000054', '41000000-0000-4000-8000-000000000051',
   '20000000-0000-4000-8000-00000000000a', 'Confirmado, 9h. Levo o equipamento de higienização.', now() - interval '20 hours')
on conflict (id) do nothing;

-- 3) Indicações: respostas no pedido do titular e uma marcada como solução.
--    O trigger notify_recommendation_reply cria as notificações do autor.
insert into public.recommendation_replies (id, request_id, author_id, body, created_at)
values
  ('d0000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000f00',
   '30000000-0000-4000-8000-00000000001a',
   'O Seu Antônio atendeu aqui em casa e resolveu rápido. Posso passar o contato.',
   now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000f00',
   '30000000-0000-4000-8000-00000000001b',
   'Também indico a equipe do Bairro da Paz: cobraram justo e explicaram tudo.',
   now() - interval '1 day')
on conflict (id) do nothing;

update public.recommendation_requests
   set is_resolved = true,
       resolved_reply_id = 'd0000000-0000-4000-8000-000000000001'
 where id = '80000000-0000-4000-8000-000000000f00';

-- 4) Denúncia do membro conectado (contra conteúdo de terceiro: denunciar o
--    próprio conteúdo é recusado pelo produto) e uma pessoa bloqueada.
insert into public.reports (reporter_user_id, target_type, target_id, reason, status, created_at)
select
  '20000000-0000-4000-8000-000000000001',
  'post'::report_target_type,
  p.id,
  'Anúncio repetido no mesmo dia, fora do assunto da comunidade.',
  'open'::report_status,
  now() - interval '3 days'
from public.posts p
where p.user_id <> '20000000-0000-4000-8000-000000000001'
  and p.locality_id = '00000000-0000-4000-8000-000000000001'
  -- as 15 denúncias acima já saem desta mesma conta: o alvo aqui não pode
  -- repetir (reports_one_open_per_reporter_target_idx é único por par aberto)
  and not exists (
    select 1 from public.reports r
    where r.reporter_user_id = '20000000-0000-4000-8000-000000000001'
      and r.target_id = p.id
  )
order by p.created_at
limit 1;

insert into public.dm_blocks (blocker_user_id, blocked_user_id, created_at)
values (
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-00000000001a',
  now() - interval '2 days'
)
on conflict do nothing;

-- 5) Mercado e Moradia: anúncios do titular (ativo, pausado e reservado, para
--    as três abas de /meus-anuncios) e de terceiros (para a grade de /mercado).
--    Fotos exigem upload real no bucket e ficam fora do seed — ver RECON-051.
insert into public.listings (
  id, owner_user_id, kind, status, title, description, category, condition,
  price_cents, locality_id, neighborhood, published_at, created_at, updated_at
)
values
  ('b1000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'item', 'active', 'Mesa de jantar com 6 cadeiras',
   'Mesa de madeira maciça, usada por dois anos, sem riscos na tampa.',
   'casa_moveis', 'used', 45000, '00000000-0000-4000-8000-000000000001', 'Centro',
   now() - interval '6 days', now() - interval '8 days', now() - interval '6 days'),
  ('b1000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   'item', 'paused', 'Bicicleta aro 29 com câmbio',
   'Pouco rodada, revisada no mês passado.',
   'esporte', 'used', 120000, '00000000-0000-4000-8000-000000000001', 'Adrianópolis',
   now() - interval '12 days', now() - interval '14 days', now() - interval '4 days'),
  ('b1000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
   'item', 'reserved', 'Furadeira de impacto com maleta',
   'Nova, ainda na caixa. Reservada para retirada no fim de semana.',
   'casa_moveis', 'new', 32000, '00000000-0000-4000-8000-000000000001', 'Centro',
   now() - interval '3 days', now() - interval '5 days', now() - interval '1 day'),
  ('b1000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-00000000001a',
   'item', 'active', 'Berço portátil desmontável',
   'Usado por um ano, colchão incluso.',
   'infantil', 'used', 25000, '00000000-0000-4000-8000-000000000001', 'Flores',
   now() - interval '2 days', now() - interval '4 days', now() - interval '2 days'),
  ('b1000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-00000000001b',
   'item', 'active', 'Notebook 14 polegadas, 8 GB',
   'Bateria segura o dia todo. Com carregador original.',
   'eletronicos', 'used', 180000, '00000000-0000-4000-8000-000000000001', 'Chapada',
   now() - interval '1 day', now() - interval '3 days', now() - interval '1 day'),
  ('b1000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-00000000001a',
   'item', 'active', 'Ar-condicionado 9.000 BTUs',
   'Instalado há um ano, funcionando perfeitamente.',
   'eletronicos', 'used', 150000, '00000000-0000-4000-8000-000000000001', 'Ponta Negra',
   now(), now() - interval '2 days', now())
on conflict (id) do nothing;

insert into public.listings (
  id, owner_user_id, kind, status, title, description, locality_id,
  neighborhood, published_at, created_at, updated_at
)
values
  ('b2000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-00000000001b',
   'property', 'active', 'Apartamento 2 quartos no Centro',
   'Próximo ao comércio, com vaga na garagem.',
   '00000000-0000-4000-8000-000000000001', 'Centro',
   now() - interval '5 days', now() - interval '7 days', now() - interval '5 days'),
  ('b2000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-00000000001a',
   'property', 'active', 'Casa 3 quartos com quintal',
   'Rua tranquila, quintal com árvore frutífera.',
   '00000000-0000-4000-8000-000000000001', 'Flores',
   now() - interval '2 days', now() - interval '4 days', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.property_details (
  listing_id, deal, property_type, rent_cents, sale_price_cents, condo_fee_cents,
  bedrooms, suites, parking_spots, area_m2, amenities, available_from
)
values
  ('b2000000-0000-4000-8000-000000000001', 'rent', 'apartment', 180000, null, 35000,
   2, 1, 1, 62, array['Portaria 24h', 'Elevador'], current_date),
  ('b2000000-0000-4000-8000-000000000002', 'sale', 'house', null, 45000000, null,
   3, 1, 2, 120, array['Quintal', 'Área de serviço'], current_date)
on conflict (listing_id) do nothing;


commit;
