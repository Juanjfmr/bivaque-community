begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

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

select * from finish();
rollback;
