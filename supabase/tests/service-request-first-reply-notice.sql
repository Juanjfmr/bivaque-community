-- ADR-20260922-aviso-da-primeira-resposta: quem pediu e avisado quando o
-- prestador responde pela primeira vez.
--
-- O aviso nasce na transicao open -> in_conversation de send_conversation_
-- message. Este teste trava:
--   1. a primeira resposta do prestador gera UM aviso para quem pediu, sem ator,
--      com a action propria e o pedido como alvo;
--   2. a segunda resposta nao repete o aviso;
--   3. a mensagem de quem pediu nao avisa ninguem por este caminho;
--   4. terceiros nao recebem nada;
--   5. com o aviso de mensagens desligado, o aviso nao sai.

begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role postgres;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000027', 'provider-first-reply@example.invalid');

insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
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
  'Prestador Primeira Resposta',
  'assistencia_tecnica'
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000027',
  'community',
  '70000000-0000-4000-8000-000000000001',
  'free'
);

-- Quem pede abre o pedido.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_service_request(
  '30000000-0000-4000-8000-000000000027', 'Preciso de um orcamento', null, 'k-fr-1'
);

-- O prestador responde duas vezes.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000027', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.send_conversation_message(
  (select conversation_id from public.service_requests where idempotency_key = 'k-fr-1'),
  'Primeira resposta', 'm-fr-1'
);
select public.send_conversation_message(
  (select conversation_id from public.service_requests where idempotency_key = 'k-fr-1'),
  'Segunda resposta', 'm-fr-2'
);

-- Quem pediu responde de volta.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.send_conversation_message(
  (select conversation_id from public.service_requests where idempotency_key = 'k-fr-1'),
  'Obrigada', 'm-fr-3'
);

set local role postgres;

-- 1 e 2. Um aviso so, para quem pediu, mesmo com duas respostas.
select is(
  (select count(*)::int from public.notifications
    where action = 'provider_first_reply'
      and target_id = (select id from public.service_requests where idempotency_key = 'k-fr-1')),
  1,
  'a primeira resposta gera um aviso, e a segunda nao repete'
);

select is(
  (select recipient_user_id::text from public.notifications
    where action = 'provider_first_reply'
      and target_id = (select id from public.service_requests where idempotency_key = 'k-fr-1')),
  '10000000-0000-4000-8000-000000000001',
  'o aviso vai para quem pediu'
);

select is(
  (select actor_user_id from public.notifications
    where action = 'provider_first_reply'
      and target_id = (select id from public.service_requests where idempotency_key = 'k-fr-1')),
  null::uuid,
  'o aviso nao tem ator: o prestador nao tem perfil de membro'
);

select is(
  (select type::text || '/' || target_type from public.notifications
    where action = 'provider_first_reply'
      and target_id = (select id from public.service_requests where idempotency_key = 'k-fr-1')),
  'service_request/service_request',
  'o tipo e o alvo sao o pedido, para o deep-link do app'
);

-- 3. A mensagem de quem pediu nao avisa o prestador por este caminho.
select is(
  (select count(*)::int from public.notifications
    where recipient_user_id = '10000000-0000-4000-8000-000000000027'),
  0,
  'a mensagem de quem pediu nao gera aviso para o prestador'
);

-- 4. Terceiros nao recebem nada.
select is(
  (select count(*)::int from public.notifications
    where action = 'provider_first_reply'
      and recipient_user_id not in ('10000000-0000-4000-8000-000000000001')),
  0,
  'nenhum terceiro recebe o aviso'
);

-- 5. Com o aviso de mensagens desligado, o aviso nao sai.
insert into public.notification_preferences (user_id, messages)
values ('10000000-0000-4000-8000-000000000001', false)
on conflict (user_id) do update set messages = false;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.create_service_request(
  '30000000-0000-4000-8000-000000000027', 'Outro pedido, com aviso desligado', null, 'k-fr-2'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000027', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.send_conversation_message(
  (select conversation_id from public.service_requests where idempotency_key = 'k-fr-2'),
  'Resposta ao segundo pedido', 'm-fr-4'
);

set local role postgres;

select is(
  (select status::text from public.service_requests where idempotency_key = 'k-fr-2'),
  'in_conversation',
  'com o aviso desligado, a resposta ainda muda a situacao do pedido'
);

select is(
  (select count(*)::int from public.notifications
    where action = 'provider_first_reply'
      and target_id = (select id from public.service_requests where idempotency_key = 'k-fr-2')),
  0,
  'com o aviso de mensagens desligado, o aviso nao sai'
);

select * from finish();
rollback;
