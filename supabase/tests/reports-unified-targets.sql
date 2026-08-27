-- Onda H Task 1 — um modelo de denuncia, todos os alvos.
--
-- `report_target_type` nasceu com post, comment, group e message, mas 'message'
-- nunca foi usado: a UI gravava em `dm_reports`, tabela separada, sem status,
-- que nenhum painel lia (F162). E a resposta de indicacao, que a onda F
-- transformou no ciclo central do produto, nao era denunciavel.
--
-- Estas assercoes cobrem os alvos que a Task 1 acrescenta e o gatilho de
-- auto-denuncia que passou a trata-los (20260821000032). Antes dela o `case`
-- caia no `else v_owner_id := null` e auto-denuncia de mensagem e de indicacao
-- passava — F163.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/recommendations.inc

-- Prestador verificado, sem locality_memberships, vinculado a uma comunidade.
insert into auth.users (id, email)
values ('b2000000-0000-4000-8000-000000000001', 'provider-reporter@example.invalid');

insert into private.verification_outcomes (
  user_id, status, eligibility_class, checked_at
)
values (
  'b2000000-0000-4000-8000-000000000001',
  'verified',
  'active_federal_military',
  '2026-08-21 09:00:00+00'
);

insert into public.communities (
  id, locality_id, name, created_by, owner_user_id
)
values (
  'b2000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Vila do Prestador Reporter',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'
);

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  'b2000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.posts (id, locality_id, user_id, post_type, content)
values (
  'b2000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'publicacao que serve de alvo negativo para o prestador'
);

-- Uma conversa e uma mensagem de member-one, para servir de alvo 'message'.
-- Inserido com privilegio: o objetivo aqui e o alvo, nao a policy da DM, que
-- tem suite propria em dm-context-allowed.sql / dm-context-denials.sql.
insert into public.dm_conversations (id, participant_a, participant_b, context_type, context_id)
values (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'shared_group',
  '90000000-0000-4000-8000-000000000001'
);

insert into public.dm_messages (id, conversation_id, sender_id, content, created_at)
values (
  '80000000-0000-4000-8000-0000000000aa',
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'mensagem que serve de alvo de denuncia',
  '2026-08-21 10:00:00+00'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- member-two (002) denuncia conteudo de member-one (001)
-- ═══════════════════════════════════════════════════════════════════════════

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'recommendation_request',
      '40000000-0000-4000-8000-000000000001',
      'o pedido de indicacao esta sendo usado para vender'
    )
  $$,
  'pedido de indicacao e alvo valido de denuncia'
);

select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'message',
      '80000000-0000-4000-8000-0000000000aa',
      'mensagem privada com conteudo abusivo'
    )
  $$,
  'mensagem de DM e alvo valido de denuncia — a fila e a mesma do resto'
);

-- Segunda denuncia aberta do MESMO autor no MESMO alvo: bloqueada pelo indice
-- parcial reports_one_open_per_reporter_target_idx, que e generico e ja cobria
-- os alvos novos sem alteracao.
select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'message',
      '80000000-0000-4000-8000-0000000000aa',
      'denunciando a mesma mensagem de novo'
    )
  $$,
  23505,
  null,
  'duplicata aberta no mesmo alvo e recusada'
);

-- Auto-denuncia da propria resposta de indicacao (a reply e de member-two).
select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000002',
      'recommendation_reply',
      '50000000-0000-4000-8000-000000000001',
      'denunciando a minha propria resposta'
    )
  $$,
  'cannot report your own content',
  'auto-denuncia de resposta de indicacao e bloqueada'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- member-one (001) — o outro lado de cada par
-- ═══════════════════════════════════════════════════════════════════════════

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000001',
      'recommendation_reply',
      '50000000-0000-4000-8000-000000000001',
      'a resposta indica um servico que nao existe'
    )
  $$,
  'resposta de indicacao e alvo valido de denuncia'
);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000001',
      'recommendation_request',
      '40000000-0000-4000-8000-000000000001',
      'denunciando o meu proprio pedido'
    )
  $$,
  'cannot report your own content',
  'auto-denuncia de pedido de indicacao e bloqueada'
);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000001',
      'message',
      '80000000-0000-4000-8000-0000000000aa',
      'denunciando a minha propria mensagem'
    )
  $$,
  'cannot report your own content',
  'auto-denuncia de mensagem de DM e bloqueada — era o buraco do F163'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- non-member (005): sem membership, nao denuncia nada
-- ═══════════════════════════════════════════════════════════════════════════

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      '10000000-0000-4000-8000-000000000005',
      'recommendation_request',
      '40000000-0000-4000-8000-000000000001',
      'nao sou membro e mesmo assim denuncio'
    )
  $$,
  42501,
  null,
  'nao-membro nao denuncia nem os alvos novos'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- provider: denuncia mensagem, e somente mensagem
-- ═══════════════════════════════════════════════════════════════════════════

select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      'b2000000-0000-4000-8000-000000000001',
      'message',
      '80000000-0000-4000-8000-0000000000aa',
      'prestador denunciando mensagem recebida'
    )
  $$,
  'prestador sem membership consegue denunciar mensagem'
);

select throws_ok(
  $$
    insert into public.reports (reporter_user_id, target_type, target_id, reason)
    values (
      'b2000000-0000-4000-8000-000000000001',
      'post',
      'b2000000-0000-4000-8000-000000000003',
      'prestador tentando denunciar publicacao'
    )
  $$,
  42501,
  null,
  'prestador sem membership nao consegue denunciar post'
);

select * from finish();
rollback;
