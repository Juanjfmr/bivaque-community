begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

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
  id, requester_user_id, provider_id, conversation_id, category, description, status
)
values
  (
    '50000000-0000-4000-8000-0000000000a1',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000020',
    '40000000-0000-4000-8000-0000000000a1',
    'assistencia_tecnica',
    'Ar-condicionado não resfria',
    'open'
  ),
  (
    '50000000-0000-4000-8000-0000000000b1',
    '10000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000021',
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
       requester_user_id, provider_id, conversation_id, category, description
     ) values (
       '10000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000020',
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
  $$ select public.respond_to_service_request(
       '50000000-0000-4000-8000-0000000000b1', 'tentativa de invasão'
     ) $$,
  '42501',
  null,
  'provider cannot respond to another provider request, by direct call'
);
select throws_ok(
  $$ select public.close_service_request('50000000-0000-4000-8000-0000000000b1') $$,
  '42501',
  null,
  'provider cannot close another provider request'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$ select public.respond_to_service_request(
       '50000000-0000-4000-8000-0000000000a1', 'o membro não responde pelo prestador'
     ) $$,
  '42501',
  null,
  'requester cannot respond in the provider role'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000020', true);
select lives_ok(
  $$ select public.respond_to_service_request(
       '50000000-0000-4000-8000-0000000000a1', 'Posso passar amanhã às 9h'
     ) $$,
  'addressed provider answers the request'
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
