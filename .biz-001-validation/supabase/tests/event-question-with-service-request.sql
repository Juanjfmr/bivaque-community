-- ADR-20260922-conversa-por-pedido: pergunta de evento convive com pedido.
--
-- Desde 20260922160100_conversation_per_request cada pedido de servico tem a
-- sua conversa (context_type = 'service_request'), e o par pode ter varias
-- linhas em dm_conversations. open_event_question buscava a conversa do par sem
-- olhar o contexto, entao quem ja havia pedido a um prestador que organiza um
-- evento tinha a pergunta recusada com 42501. Este teste trava:
--   a) POSITIVO: par com pedido de servico aberto abre a pergunta do evento;
--   b) IDEMPOTENTE: reabrir devolve a MESMA conversa, nunca uma segunda;
--   c) NEGATIVO: par que ja tem pergunta sobre OUTRO evento continua recusado
--      com 42501 'pair already has a conversation with another context'.
--
-- Fixtures sao sinteticas (example.invalid) e transacionais; nada de seed real.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

\ir fixtures/foundation.inc
\ir fixtures/communities.inc

-- Prestador (028) que organiza dois eventos na mesma cidade do membro 001.
reset role;
insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000028', 'provider-evento@example.invalid');

insert into public.provider_accounts (auth_user_id, invited_by, community_id, locality_id)
values (
  '10000000-0000-4000-8000-000000000028',
  '10000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.provider_profiles (id, owner_user_id, display_name, category)
values (
  '30000000-0000-4000-8000-000000000028',
  '10000000-0000-4000-8000-000000000028',
  'Prestador Que Organiza Evento',
  'assistencia_tecnica'
);

insert into public.provider_reach (provider_id, scope_type, scope_id, source)
values (
  '30000000-0000-4000-8000-000000000028',
  'community',
  '70000000-0000-4000-8000-000000000001',
  'free'
);

insert into public.events (id, organizer_id, locality_id, title, starts_at)
values
  (
    '30000000-0000-4000-8000-000000000088',
    '10000000-0000-4000-8000-000000000028',
    '00000000-0000-4000-8000-000000000001',
    'Evento do Prestador A',
    '2026-10-01 10:00:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000089',
    '10000000-0000-4000-8000-000000000028',
    '00000000-0000-4000-8000-000000000001',
    'Evento do Prestador B',
    '2026-10-02 10:00:00+00'
  );

-- ── (a) positivo: pedido de servico nao bloqueia a pergunta do evento ────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_service_request(
      '30000000-0000-4000-8000-000000000028', 'Preciso de assistencia', null, 'k-eq-pedido'
    )
  $$,
  'o pedido de servico cria a conversa de pedido entre o par'
);

select lives_ok(
  $$ select public.open_event_question('30000000-0000-4000-8000-000000000088') $$,
  'par com pedido aberto abre a pergunta do evento'
);

reset role;
select results_eq(
  $$
    select context_type::text from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000028'
       and context_type = 'event_question'
  $$,
  array['event_question'],
  'a conversa de pergunta nasce com o contexto event_question'
);

select results_eq(
  $$
    select context_id from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000028'
       and context_type = 'event_question'
  $$,
  array['30000000-0000-4000-8000-000000000088'::uuid],
  'o contexto e o evento do prestador'
);

select results_eq(
  $$
    select count(*) from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000028'
       and context_type = 'service_request'
  $$,
  array[1::bigint],
  'a conversa de pedido continua existindo, intocada'
);

-- ── (b) idempotente: reabrir devolve a mesma conversa ────────────────────────

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.open_event_question('30000000-0000-4000-8000-000000000088'),
  (
    select id from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000028'
       and context_type = 'event_question'
  ),
  'reabrir a mesma pergunta devolve a MESMA conversa'
);

reset role;
select is(
  (
    select count(*)::int from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000028'
       and context_type = 'event_question'
  ),
  1,
  'nao criou uma segunda conversa de pergunta'
);

select is(
  (
    select count(*)::int from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000028'
  ),
  2,
  'o par tem exatamente duas conversas: pedido e pergunta'
);

-- ── (c) negativo preservado: pergunta sobre OUTRO evento continua recusada ───

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select public.open_event_question('30000000-0000-4000-8000-000000000089') $$,
  42501,
  'pair already has a conversation with another context',
  'pergunta sobre outro evento continua recusada com 42501'
);

reset role;
select is(
  (
    select count(*)::int from public.dm_conversations
     where participant_a = '10000000-0000-4000-8000-000000000001'
       and participant_b = '10000000-0000-4000-8000-000000000028'
  ),
  2,
  'a recusa nao criou conversa nova'
);

select * from finish();
rollback;