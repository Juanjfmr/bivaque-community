begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- RECON-023 — acompanhamento do pedido (migration 20260911105119).
--
-- Mesmo arranjo do service-requests.sql: prestador alcancavel pela comunidade A,
-- criado sob `postgres` porque provider_accounts nao tem insert para
-- `authenticated`. Cada via de permissao tem prova positiva E negativa.

set local role postgres;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000026', 'provider-track@example.invalid');

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  '10000000-0000-4000-8000-000000000026',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values (
  '30000000-0000-4000-8000-000000000026',
  '10000000-0000-4000-8000-000000000026',
  'Prestador Rastreio',
  'assistencia_tecnica'
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000026',
  'community',
  '70000000-0000-4000-8000-000000000001',
  'free'
);

-- ── positivo: o solicitante cria e envia a primeira mensagem ─────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000026',
      'Preciso instalar duas luminarias',
      'A combinar',
      'k-1'
    )
  $$,
  'o solicitante cria o pedido'
);

select results_eq(
  'select count(*) from public.service_requests',
  array[1::bigint],
  'o solicitante le o proprio pedido'
);

select lives_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'k-1'),
      'Oi, consigo na quinta?',
      'c-1'
    )
  $$,
  'o solicitante envia mensagem pelo RPC'
);

select results_eq(
  $$ select count(*) from public.dm_messages where client_key = 'c-1' $$,
  array[1::bigint],
  'a mensagem do solicitante foi gravada'
);

-- ── idempotencia do envio: a mesma chave nao duplica ─────────────────────────

select results_eq(
  $$
    select (
      public.send_conversation_message(
        (select conversation_id from public.service_requests where idempotency_key = 'k-1'),
        'Oi, consigo na quinta?',
        'c-1'
      ) ->> 'id'
    )::uuid = (select id from public.dm_messages where client_key = 'c-1')
  $$,
  array[true],
  'reenviar a mesma chave devolve a mensagem existente'
);

select results_eq(
  $$ select count(*) from public.dm_messages where client_key = 'c-1' $$,
  array[1::bigint],
  'reenviar nao duplica a mensagem'
);

-- ── limite de borda ──────────────────────────────────────────────────────────

select throws_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'k-1'),
      repeat('x', 2001),
      'c-longa'
    )
  $$,
  '22023',
  null,
  'mensagem acima de 2000 e recusada'
);

-- ── a situacao muda na PRIMEIRA resposta do prestador ────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000026', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'k-1'),
      'Consigo sim, na quinta as 14h.',
      'c-2'
    )
  $$,
  'o prestador destinatario responde'
);

select results_eq(
  'select status::text from public.service_requests where idempotency_key = ''k-1''',
  array['in_conversation'::text],
  'a primeira resposta do prestador move o pedido para em conversa'
);

select lives_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'k-1'),
      'Levo as ferramentas.',
      'c-3'
    )
  $$,
  'o prestador envia a segunda mensagem'
);

select results_eq(
  'select status::text from public.service_requests where idempotency_key = ''k-1''',
  array['in_conversation'::text],
  'a situacao permanece em conversa'
);

-- ── leitura: estado proprio, nunca o do outro ────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.mark_conversation_read(
      (select conversation_id from public.service_requests where idempotency_key = 'k-1')
    )
  $$,
  'o solicitante marca a conversa como lida'
);

select results_eq(
  'select count(*) from public.dm_read_states where user_id = ''10000000-0000-4000-8000-000000000001''',
  array[1::bigint],
  'o solicitante le o proprio estado de leitura'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000026', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) from public.dm_read_states where user_id = ''10000000-0000-4000-8000-000000000001''',
  array[0::bigint],
  'o prestador nao le o estado de leitura do solicitante'
);

-- ── editar: so o solicitante, sem tocar o destinatario ───────────────────────

select throws_ok(
  $$
    select public.update_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1'),
      'Quero mudar o pedido por fora',
      null
    )
  $$,
  '42501',
  null,
  'o prestador nao edita o pedido'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select public.update_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1'),
      'Preciso instalar tres luminarias',
      'Nesta semana'
    ) ->> 'description'
  $$,
  array['Preciso instalar tres luminarias'::text],
  'o solicitante edita a descricao pelo RPC'
);

select results_eq(
  'select provider_id from public.service_requests where idempotency_key = ''k-1''',
  array['30000000-0000-4000-8000-000000000026'::uuid],
  'editar nao altera o destinatario'
);

select results_eq(
  'select when_text from public.service_requests where idempotency_key = ''k-1''',
  array['Nesta semana'::text],
  'editar persiste o quando'
);

-- ── encerrar: idempotente e com ator ─────────────────────────────────────────

select results_eq(
  $$
    select public.close_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1')
    ) ->> 'status'
  $$,
  array['closed'::text],
  'o solicitante encerra o pedido'
);

select results_eq(
  $$
    select public.close_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1')
    ) ->> 'closed_by_user_id'
  $$,
  array['10000000-0000-4000-8000-000000000001'::text],
  'encerrar registra o ator'
);

-- So agora `closed_at` existe: o segundo encerramento tem de devolver o MESMO
-- instante gravado pelo primeiro.
select set_config(
  'app.r023_closed_at',
  (select closed_at::text from public.service_requests where idempotency_key = 'k-1'),
  true
);

select results_eq(
  $$
    select public.close_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1')
    ) ->> 'closed_at' = current_setting('app.r023_closed_at')
  $$,
  array[true],
  'encerrar de novo nao reescreve o instante do primeiro encerramento'
);

-- ── negativo: terceiro nao le, nao escreve e nao encerra ─────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'k-1'),
      'Terceiro bisbilhotando',
      'c-x'
    )
  $$,
  '42501',
  null,
  'terceiro nao envia mensagem no pedido alheio'
);

select throws_ok(
  $$
    select public.close_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1')
    )
  $$,
  '42501',
  null,
  'terceiro nao encerra o pedido alheio'
);

select throws_ok(
  $$
    select public.update_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1'),
      'Terceiro editando',
      null
    )
  $$,
  '42501',
  null,
  'terceiro nao edita o pedido alheio'
);

select is_empty(
  'select 1 from public.dm_messages',
  'terceiro nao le mensagem de conversa alheia'
);

-- ── negativo: pedido encerrado nao aceita edicao ─────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.update_service_request(
      (select id from public.service_requests where idempotency_key = 'k-1'),
      'Editar depois de encerrado',
      null
    )
  $$,
  '42501',
  null,
  'pedido encerrado nao aceita edicao'
);

select * from finish();
rollback;
