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
--   70000000-…  eventos          80000000-…  posts
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

commit;
