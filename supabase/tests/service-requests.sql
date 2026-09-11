begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Provedor da vila A (mesmo padrão de dm-context-allowed.sql): prestador
-- alcançável por community A, criado sob `postgres` porque provider_accounts
-- não tem insert para `authenticated`.
set local role postgres;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000025', 'provider-request@example.invalid');

insert into public.provider_accounts (
  auth_user_id, invited_by, community_id, locality_id
)
values (
  '10000000-0000-4000-8000-000000000025',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values (
  '30000000-0000-4000-8000-000000000025',
  '10000000-0000-4000-8000-000000000025',
  'Prestador Pedido',
  'assistencia_tecnica'
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000025',
  'community',
  '70000000-0000-4000-8000-000000000001',
  'free'
);

-- ── negativo: quem está FORA do alcance não cria nem lê ─────────────────────
-- 002 é apenas `pending` na vila A (aprovado na vila B): can_see_provider é
-- falso, então o RPC recusa e a RLS de select não devolve nada.

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'Quero um pedido sem enxergar a ficha',
      'A combinar',
      'k-fora'
    )
  $$,
  '42501',
  null,
  'membro fora do alcance não cria pedido'
);

select is_empty(
  $$ select 1 from public.service_requests $$,
  'membro fora do alcance não lê pedido nenhum'
);

-- ── positivo: o membro no alcance cria o pedido ─────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'Preciso instalar duas luminárias',
      'A combinar',
      'k-1'
    )
  $$,
  'membro no alcance cria o pedido pelo RPC'
);

select results_eq(
  'select count(*) from public.service_requests',
  array[1::bigint],
  'o solicitante lê o próprio pedido'
);

select results_eq(
  $$
    select count(*)
      from public.dm_conversations
     where context_type = 'provider'
       and context_id = '30000000-0000-4000-8000-000000000025'
  $$,
  array[1::bigint],
  'o pedido abriu a conversa de contexto fixo'
);

-- ── idempotência: reenviar não duplica ──────────────────────────────────────

select results_eq(
  $$
    select public.create_service_request(
             '30000000-0000-4000-8000-000000000025',
             'Texto reenviado pelo formulário',
             'A combinar',
             'k-1'
           )
         = (select id from public.service_requests where idempotency_key = 'k-1')
  $$,
  array[true],
  'reenviar com a mesma chave devolve o pedido existente'
);

select results_eq(
  'select count(*) from public.service_requests',
  array[1::bigint],
  'reenviar não duplica o pedido'
);

-- ── o destinatário lê; terceiro não lê e não insere ─────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000025', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) from public.service_requests',
  array[1::bigint],
  'o prestador destinatário lê o pedido'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select 1 from public.service_requests $$,
  'terceiro não lê o pedido'
);

select throws_ok(
  $$
    insert into public.service_requests (
      requester_user_id, provider_id, provider_user_id, description
    ) values (
      '10000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000025',
      '10000000-0000-4000-8000-000000000025',
      'Invasão direta sem interface'
    )
  $$,
  '42501',
  null,
  'terceiro não insere pedido por chamada direta'
);

-- ── limites de borda ─────────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      repeat('x', 501),
      null,
      'k-2'
    )
  $$,
  '22023',
  null,
  'descrição acima de 500 é recusada'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000025', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000025',
      'Pedido para a própria ficha',
      null,
      'k-3'
    )
  $$,
  '42501',
  null,
  'prestador não pede serviço para a própria ficha'
);

select * from finish();
rollback;
