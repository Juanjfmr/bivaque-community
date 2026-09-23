begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- RECON-044 — a reconciliacao nao pode perder a coluna de que a policy de
-- leitura do destinatario depende nem a chave de idempotencia. Estes asserts
-- reprovam se qualquer uma sumir, ou se a policy deixar de existir.
select has_column(
  'public', 'service_requests', 'provider_user_id',
  'provider_user_id continua existindo: a policy de leitura depende dela'
);
select has_column(
  'public', 'service_requests', 'idempotency_key',
  'idempotency_key continua existindo: a unicidade evita pedido duplicado'
);
select results_eq(
  $$ select count(*)::bigint
       from pg_policies
      where schemaname = 'public'
        and tablename = 'service_requests'
        and policyname = 'service_requests_select_participant' $$,
  array[1::bigint],
  'a policy de leitura do solicitante e do prestador destinatario continua valendo'
);

-- ===========================================================================
-- Cenário da integração (RECON-022) — negação de acesso fora do alcance.
--
-- Roda PRIMEIRO porque três das suas asserções contam a tabela inteira de
-- `service_requests` (1 linha) e uma exige a tabela vazia para o membro de
-- fora. O cenário do painel (RECON-024), mais abaixo, insere as suas próprias
-- linhas; se ele rodasse antes, essas contagens passariam a medir fixtures
-- alheias e a negação de leitura deixaria de provar o que prova.
-- ===========================================================================

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

-- ADR-20260922-conversa-por-pedido: a conversa e do PROPRIO pedido (contexto
-- service_request, context_id = id do pedido), nao mais a do par com o prestador.
select results_eq(
  $$
    select count(*)
      from public.dm_conversations c
      join public.service_requests r on r.conversation_id = c.id
     where c.context_type = 'service_request'
       and c.context_id = r.id
  $$,
  array[1::bigint],
  'o pedido abriu a conversa do proprio pedido'
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
      requester_user_id, provider_id, provider_user_id, category, description
    ) values (
      '10000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000025',
      '10000000-0000-4000-8000-000000000025',
      'assistencia_tecnica',
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

-- ===========================================================================
-- Cenário do painel do negócio (RECON-024) — dois prestadores, um por
-- comunidade, e a conversa de contexto 'provider' para a fila por situação
-- da prancha 23.
--
-- As fixtures voltam a rodar sob o superusuário: a sessão acima terminou no
-- papel `authenticated` com o sujeito 025, e os INSERTs diretos em
-- auth.users / provider_* / dm_conversations / service_requests são do
-- cenário, não do runtime.
-- ===========================================================================
reset role;

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000020', 'sr-provider-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000021', 'sr-provider-b@example.invalid');

insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values
  (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000001',
    '70000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001'
  );

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values
  (
    '30000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000020',
    'Climatiza Ajuricaba',
    'assistencia_tecnica'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000021',
    'Marmitas da Vizinha',
    'alimentacao'
  );

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values
  (
    '30000000-0000-4000-8000-000000000020',
    'community',
    '70000000-0000-4000-8000-000000000001',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    'community',
    '70000000-0000-4000-8000-000000000002',
    'free'
  );

-- Conversa membro -> prestador (contexto 'provider'), criada como superusuário
-- só para montar o cenário; no runtime quem cria é open_conversation via RPC.
insert into public.dm_conversations (id, participant_a, participant_b, context_type, context_id)
values
  (
    '40000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000020',
    'provider',
    '30000000-0000-4000-8000-000000000020'
  ),
  (
    '40000000-0000-4000-8000-0000000000b1',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000021',
    'provider',
    '30000000-0000-4000-8000-000000000021'
  );

insert into public.service_requests (
  id, requester_user_id, provider_id, provider_user_id, conversation_id, category, description, status
)
values
  (
    '50000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000020',
    '40000000-0000-4000-8000-0000000000a1',
    'assistencia_tecnica',
    'Ar-condicionado não resfria',
    'open'
  ),
  (
    '50000000-0000-4000-8000-0000000000b1',
    '10000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000021',
    '40000000-0000-4000-8000-0000000000b1',
    'alimentacao',
    'Almoço para dez pessoas',
    'open'
  );

-- ── leitura: só as duas partes ──────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select isnt_empty(
  $$ select 1 from public.service_requests where id = '50000000-0000-4000-8000-0000000000a1' $$,
  'requester reads the own request'
);
select is_empty(
  $$ select 1 from public.service_requests where id = '50000000-0000-4000-8000-0000000000b1' $$,
  'requester does not read another requester request'
);
select throws_ok(
  $$ insert into public.service_requests (
       requester_user_id, provider_id, provider_user_id, conversation_id, category, description
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000020',
       '10000000-0000-4000-8000-000000000020',
       '40000000-0000-4000-8000-0000000000a1',
       'assistencia_tecnica',
       'Escrita direta proibida'
     ) $$,
  '42501',
  null,
  'authenticated cannot insert a request directly; writes go through the RPC'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select isnt_empty(
  $$ select 1 from public.service_requests where id = '50000000-0000-4000-8000-0000000000a1' $$,
  'addressed provider reads the request'
);
select is_empty(
  $$ select 1 from public.service_requests where id = '50000000-0000-4000-8000-0000000000b1' $$,
  'provider does not read the request addressed to another provider'
);
select throws_ok(
  $$ select public.send_conversation_message(
       '40000000-0000-4000-8000-0000000000b1', 'tentativa de invasão', null
     ) $$,
  '42501',
  null,
  'prestador não envia mensagem na conversa de um pedido alheio'
);
select throws_ok(
  $$ select public.close_service_request('50000000-0000-4000-8000-0000000000b1') $$,
  '42501',
  null,
  'provider cannot close another provider request'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$ select public.send_conversation_message(
       '40000000-0000-4000-8000-0000000000a1', 'terceiro na conversa do pedido', null
     ) $$,
  '42501',
  null,
  'terceiro não envia mensagem na conversa do pedido'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select lives_ok(
  $$ select public.send_conversation_message(
       '40000000-0000-4000-8000-0000000000a1', 'Posso passar amanhã às 9h', null
     ) $$,
  'prestador destinatário responde na conversa do pedido'
);

reset role;
select results_eq(
  $$ select status::text, first_responded_at is not null
       from public.service_requests
      where id = '50000000-0000-4000-8000-0000000000a1' $$,
  $$ values ('in_conversation', true) $$,
  'first answer moved open -> in_conversation in the same transaction'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$ select public.cancel_service_request('50000000-0000-4000-8000-0000000000b1') $$,
  '42501',
  null,
  'requester cannot cancel another requester request'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select lives_ok(
  $$ select public.close_service_request('50000000-0000-4000-8000-0000000000a1') $$,
  'provider closes the own request'
);

reset role;
select results_eq(
  $$ select status::text, closed_by_user_id::text
       from public.service_requests
      where id = '50000000-0000-4000-8000-0000000000a1' $$,
  $$ values ('closed', '10000000-0000-4000-8000-000000000020') $$,
  'close records the actor and the terminal status'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$ select public.cancel_service_request('50000000-0000-4000-8000-0000000000b1') $$,
  'requester cancels the own request'
);

reset role;
select results_eq(
  $$ select status::text from public.service_requests
      where id = '50000000-0000-4000-8000-0000000000b1' $$,
  $$ values ('cancelled') $$,
  'cancel records the terminal status'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$ select public.cancel_service_request('50000000-0000-4000-8000-0000000000a1') $$,
  '42501',
  null,
  'a request cannot be cancelled by someone who is not its requester'
);

reset role;
select * from finish();
rollback;
