begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role postgres;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000027', 'provider-terminal@example.invalid');

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  '10000000-0000-4000-8000-000000000027',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values (
  '30000000-0000-4000-8000-000000000027',
  '10000000-0000-4000-8000-000000000027',
  'Prestador Terminal',
  'assistencia_tecnica'
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000027',
  'community',
  '70000000-0000-4000-8000-000000000001',
  'free'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.create_service_request(
  '30000000-0000-4000-8000-000000000027',
  'Pedido terminal fechado',
  null,
  'terminal-closed'
);
select public.close_service_request(
  (select id from public.service_requests where idempotency_key = 'terminal-closed')
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000027', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'terminal-closed'),
      'Mensagem depois de closed',
      'terminal-closed-message'
    )
  $$,
  '22023',
  null,
  'pedido closed nao aceita nova mensagem'
);
select is_empty(
  $$ select 1 from public.dm_messages where client_key = 'terminal-closed-message' $$,
  'nenhuma mensagem foi gravada depois de closed'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.create_service_request(
  '30000000-0000-4000-8000-000000000027',
  'Pedido terminal cancelado',
  null,
  'terminal-cancelled'
);
select public.cancel_service_request(
  (select id from public.service_requests where idempotency_key = 'terminal-cancelled')
);

select results_eq(
  $$ select status::text from public.service_requests where idempotency_key = 'terminal-cancelled' $$,
  array['cancelled'::text],
  'o solicitante cancela o pedido'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000027', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'terminal-cancelled'),
      'Mensagem depois de cancelled',
      'terminal-cancelled-message'
    )
  $$,
  '22023',
  null,
  'pedido cancelled nao aceita nova mensagem'
);
select is_empty(
  $$ select 1 from public.dm_messages where client_key = 'terminal-cancelled-message' $$,
  'nenhuma mensagem foi gravada depois de cancelled'
);

select results_eq(
  $$
    select public.close_service_request(
      (select id from public.service_requests where idempotency_key = 'terminal-cancelled')
    ) ->> 'status'
  $$,
  array['cancelled'::text],
  'encerrar depois de cancelar preserva o estado terminal'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.cancel_service_request('49999999-9999-4999-8999-999999999999') $$,
  '42501',
  null,
  'pedido inexistente não confirma existência para a conta'
);

-- INSERT DIRETO em dm_messages (fora da RPC): a policy de insert não olha o
-- pedido; o gatilho dm_messages_guard_request_state é quem recusa.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000027', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    values (
      (select conversation_id from public.service_requests where idempotency_key = 'terminal-cancelled'),
      '10000000-0000-4000-8000-000000000027',
      'Insert direto do prestador depois de cancelled'
    )
  $$,
  '22023',
  null,
  'prestador nao grava por insert direto depois de cancelled'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    values (
      (select conversation_id from public.service_requests where idempotency_key = 'terminal-closed'),
      '10000000-0000-4000-8000-000000000001',
      'Insert direto de quem pediu depois de closed'
    )
  $$,
  '22023',
  null,
  'quem pediu nao grava por insert direto depois de closed'
);
select is_empty(
  $$ select 1 from public.dm_messages where content like 'Insert direto%' $$,
  'nenhuma mensagem entrou por insert direto em pedido terminal'
);

-- Positivo: com o pedido ATIVO o insert direto continua valendo.
select public.create_service_request(
  '30000000-0000-4000-8000-000000000027',
  'Pedido ativo',
  null,
  'terminal-active'
);
select lives_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    values (
      (select conversation_id from public.service_requests where idempotency_key = 'terminal-active'),
      '10000000-0000-4000-8000-000000000001',
      'Insert direto com pedido ativo'
    )
  $$,
  'insert direto segue aceito enquanto o pedido esta ativo'
);

-- Conversa antiga compartilhada por dois pedidos do par: um terminal MAIS
-- NOVO e um ativo mais antigo. A conversa continua aberta pelo ativo.
set local role postgres;
update public.service_requests
   set conversation_id = (
         select conversation_id from public.service_requests where idempotency_key = 'terminal-active'
       ),
       created_at = now() + interval '1 minute'
 where idempotency_key = 'terminal-closed';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000027', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'terminal-active'),
      'Resposta no pedido ativo da conversa compartilhada',
      'terminal-shared-active'
    )
  $$,
  'conversa compartilhada com um pedido ativo aceita mensagem pela RPC'
);
select results_eq(
  $$ select status::text from public.service_requests where idempotency_key = 'terminal-active' $$,
  array['in_conversation'::text],
  'a primeira resposta do prestador avanca o pedido ATIVO, nao o terminal'
);
select results_eq(
  $$ select status::text from public.service_requests where idempotency_key = 'terminal-closed' $$,
  array['closed'::text],
  'o pedido terminal da conversa compartilhada continua closed'
);

-- Não autorizado recebe a mesma frase do inexistente.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000027', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ select public.cancel_service_request(
       (select id from public.service_requests where idempotency_key = 'terminal-active')
     ) $$,
  '42501',
  'request not found',
  'cancelar pedido de outra pessoa usa a mesma frase de inexistente'
);

select * from finish();
rollback;
