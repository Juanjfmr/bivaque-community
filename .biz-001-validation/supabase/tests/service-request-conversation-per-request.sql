-- ADR-20260922-conversa-por-pedido: cada pedido tem a sua conversa.
--
-- Antes, dm_conversations_unique_pair fazia todos os pedidos entre a mesma
-- pessoa e o mesmo prestador dividirem uma conversa: mensagens misturadas e a
-- resposta mudando a situacao de um pedido qualquer. Este teste trava:
--   1. dois pedidos do mesmo par nascem com conversas diferentes, cada uma com o
--      proprio pedido como contexto;
--   2. a resposta do prestador muda so o pedido daquela conversa;
--   3. open_conversation nunca abre conversa de pedido (negativo), e a conversa
--      do par continua existindo para o contato geral;
--   4. no legado (pedidos que ja dividiam a conversa do par), a resposta muda o
--      pedido aberto mais recente, nao um qualquer;
--   5. bloqueio entre as duas pessoas impede novo pedido, nos dois sentidos
--      (auditoria de 22/09/2026, 20260922162000).

begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

set local role postgres;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000026', 'provider-per-request@example.invalid');

insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
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
  'Prestador Por Pedido',
  'assistencia_tecnica'
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000026',
  'community',
  '70000000-0000-4000-8000-000000000001',
  'free'
);

-- ── 1. dois pedidos do mesmo par, duas conversas ────────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000026', 'Pedido um: trocar tomada', null, 'k-pp-1'
    );
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000026', 'Pedido dois: instalar luminaria', null, 'k-pp-2'
    );
  $$,
  'a mesma pessoa abre dois pedidos para o mesmo prestador'
);

set local role postgres;

select is(
  (select count(distinct conversation_id)::int from public.service_requests
    where provider_id = '30000000-0000-4000-8000-000000000026'),
  2,
  'cada pedido nasce com a sua conversa'
);

select is(
  (select count(*)::int
     from public.service_requests r
     join public.dm_conversations c on c.id = r.conversation_id
    where r.provider_id = '30000000-0000-4000-8000-000000000026'
      and c.context_type = 'service_request'
      and c.context_id = r.id),
  2,
  'o contexto da conversa e o proprio pedido'
);

-- ── 2. a resposta do prestador muda so o pedido daquela conversa ────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000026', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.send_conversation_message(
      (select conversation_id from public.service_requests where idempotency_key = 'k-pp-1'),
      'Posso passar amanha',
      'm-pp-1'
    )
  $$,
  'o prestador responde o pedido um'
);

set local role postgres;

select is(
  (select status::text from public.service_requests where idempotency_key = 'k-pp-1'),
  'in_conversation',
  'o pedido respondido vai para Em conversa'
);

select is(
  (select status::text from public.service_requests where idempotency_key = 'k-pp-2'),
  'open',
  'o outro pedido do mesmo par continua Em aberto'
);

select is(
  (select count(*)::int from public.dm_messages
    where conversation_id = (select conversation_id from public.service_requests
                              where idempotency_key = 'k-pp-2')),
  0,
  'a resposta nao aparece na conversa do outro pedido'
);

-- ── 3. open_conversation nao abre conversa de pedido; o par segue existindo ─

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.open_conversation(
      '10000000-0000-4000-8000-000000000026',
      'service_request'::public.dm_context_type,
      (select id from public.service_requests where idempotency_key = 'k-pp-2')
    )
  $$,
  '42501',
  null,
  'open_conversation recusa abrir conversa de pedido'
);

select lives_ok(
  $$
    select public.open_conversation(
      '10000000-0000-4000-8000-000000000026',
      'provider'::public.dm_context_type,
      '30000000-0000-4000-8000-000000000026'
    )
  $$,
  'o contato geral com o prestador continua abrindo a conversa do par'
);

set local role postgres;

select is(
  (select count(*)::int from public.dm_conversations
    where participant_a = least('10000000-0000-4000-8000-000000000001'::uuid,
                                '10000000-0000-4000-8000-000000000026'::uuid)
      and participant_b = greatest('10000000-0000-4000-8000-000000000001'::uuid,
                                   '10000000-0000-4000-8000-000000000026'::uuid)
      and context_type <> 'service_request'),
  1,
  'a conversa do par continua unica fora dos pedidos'
);

-- ── 4. legado: pedidos que ja dividiam a conversa do par ────────────────────
-- Dois pedidos antigos apontando para a conversa do par, ambos abertos: a
-- resposta muda o MAIS RECENTE, e nao um qualquer.

insert into public.service_requests
  (id, requester_user_id, provider_id, provider_user_id, category, description, status,
   conversation_id, created_at)
select
  v.id, '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000026',
  '10000000-0000-4000-8000-000000000026', 'assistencia_tecnica', v.description, 'open',
  c.id, v.created_at
from (values
  ('40000000-0000-4000-8000-0000000000f1'::uuid, 'legado antigo', now() - interval '3 days'),
  ('40000000-0000-4000-8000-0000000000f2'::uuid, 'legado recente', now() - interval '1 day')
) as v(id, description, created_at)
cross join lateral (
  select id from public.dm_conversations
   where context_type = 'provider'
     and context_id = '30000000-0000-4000-8000-000000000026'
) c;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000026', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.send_conversation_message(
  (select id from public.dm_conversations
    where context_type = 'provider' and context_id = '30000000-0000-4000-8000-000000000026'),
  'Resposta na conversa antiga',
  'm-pp-legado'
);

set local role postgres;

select results_eq(
  $$
    select status::text from public.service_requests
     where id in ('40000000-0000-4000-8000-0000000000f1', '40000000-0000-4000-8000-0000000000f2')
     order by created_at
  $$,
  array['open', 'in_conversation'],
  'no legado, a resposta muda o pedido aberto mais recente'
);

-- ── 5. bloqueio impede novo pedido, nos dois sentidos ───────────────────────

insert into public.dm_blocks (blocker_user_id, blocked_user_id)
values ('10000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000026', 'Pedido depois do bloqueio', null, 'k-pp-bloq'
    )
  $$,
  '42501',
  'blocked',
  'quem foi bloqueado pelo prestador nao abre novo pedido'
);

set local role postgres;
delete from public.dm_blocks
 where blocker_user_id = '10000000-0000-4000-8000-000000000026';
insert into public.dm_blocks (blocker_user_id, blocked_user_id)
values ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000026');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000026', 'Pedido a quem eu bloqueei', null, 'k-pp-bloq-2'
    )
  $$,
  '42501',
  'blocked',
  'quem bloqueou o prestador tambem nao abre pedido para ele'
);

select * from finish();
rollback;
