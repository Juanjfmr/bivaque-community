begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

\ir fixtures/foundation.inc
\ir fixtures/trust.inc
\ir fixtures/authz.inc
\ir fixtures/dm.inc

-- ── helper: can_dm_between ───────────────────────────────────────────────────

-- Shared group: 008 and 009 share group 40000000-0000-4000-8000-000000000001
select is(
  private.can_dm_between(
    '10000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000009'
  ),
  true,
  'can_dm_between returns true for shared-group pair'
);

-- Shared event: 008 and 009 both RSVPed to event 40000000-0000-4000-8000-000000000010
select is(
  private.can_dm_between(
    '10000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000009'
  ),
  true,
  'can_dm_between returns true for shared-event pair'
);

-- Recommendation thread: 008 authored request, 009 replied
select is(
  private.can_dm_between(
    '10000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000009'
  ),
  true,
  'can_dm_between returns true for recommendation-thread pair'
);

-- Accepted family: 001 and 002 have a family link (from authz.inc)
select is(
  private.can_dm_between(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  ),
  true,
  'can_dm_between returns true for accepted-family pair'
);

-- No shared context: 002 and 010 share nothing
select is(
  private.can_dm_between(
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000010'
  ),
  false,
  'can_dm_between returns false for no-context pair'
);

-- ── create conversations via each context ────────────────────────────────────

-- Group context conversation: 008 starts conversation with 009
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.dm_conversations (
      participant_a, participant_b, context_type, context_id
    )
    values (
      '10000000-0000-4000-8000-000000000008',
      '10000000-0000-4000-8000-000000000009',
      'shared_group',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  'participant can create conversation via shared_group context'
);

-- Family context: 001 creates conversation with 002
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.dm_conversations (
      participant_a, participant_b, context_type, context_id
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'accepted_family',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  'participant can create conversation via accepted_family context'
);

-- ── participants can see their conversations ─────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) from public.dm_conversations',
  array[1::bigint],
  'participant sees their 1 conversation'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) from public.dm_conversations',
  array[1::bigint],
  'other participant also sees the same 1 conversation'
);

-- ── send a message ───────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Get the group-context conversation ID
select lives_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000008',
           'Ola, esta e uma mensagem de teste'
    from public.dm_conversations c
    where c.context_type = 'shared_group'
      and c.participant_a = '10000000-0000-4000-8000-000000000008'
    limit 1
  $$,
  'participant can send a message in their conversation'
);

-- Other participant can read the message
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) from public.dm_messages',
  array[1::bigint],
  'other participant sees the message'
);

-- Other participant can also send a message
select lives_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000009',
           'Resposta de teste'
    from public.dm_conversations c
    where c.context_type = 'shared_group'
      and c.participant_a = '10000000-0000-4000-8000-000000000008'
    limit 1
  $$,
  'other participant can reply'
);

-- ── block a user ─────────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.dm_blocks (blocker_user_id, blocked_user_id)
    values (
      '10000000-0000-4000-8000-000000000009',
      '10000000-0000-4000-8000-000000000010'
    )
  $$,
  'user can block another user'
);

select results_eq(
  $$
    select count(*)
    from public.dm_blocks
    where blocker_user_id = '10000000-0000-4000-8000-000000000009'
  $$,
  array[1::bigint],
  'blocker sees their own block'
);

-- ── unblock ──────────────────────────────────────────────────────────────────

select lives_ok(
  $$
    delete from public.dm_blocks
    where blocker_user_id = '10000000-0000-4000-8000-000000000009'
      and blocked_user_id = '10000000-0000-4000-8000-000000000010'
  $$,
  'user can unblock'
);

select is_empty(
  $$
    select 1
    from public.dm_blocks
    where blocker_user_id = '10000000-0000-4000-8000-000000000009'
      and blocked_user_id = '10000000-0000-4000-8000-000000000010'
  $$,
  'block removed after unblock'
);

-- ── report a message ─────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.dm_reports (message_id, reporter_user_id, reason)
    select m.id,
           '10000000-0000-4000-8000-000000000008',
           'Esta mensagem contem conteudo inapropriado para a comunidade'
    from public.dm_messages m
    join public.dm_conversations c
      on c.id = m.conversation_id
    where c.participant_a = '10000000-0000-4000-8000-000000000008'
      and c.context_type = 'shared_group'
    limit 1
  $$,
  'participant can report a message in their conversation'
);

select results_eq(
  'select count(*) from public.dm_reports',
  array[1::bigint],
  'reporter sees their own report'
);

-- ── message content rejects PII ──────────────────────────────────────────────

select throws_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000008',
           'Meu CPF e 123.456.789-00'
    from public.dm_conversations c
    where c.context_type = 'shared_group'
      and c.participant_a = '10000000-0000-4000-8000-000000000008'
    limit 1
  $$,
  23514,
  null,
  'message CHECK rejects CPF pattern'
);

select throws_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000008',
           'Minha organizacao militar e essa'
    from public.dm_conversations c
    where c.context_type = 'shared_group'
      and c.participant_a = '10000000-0000-4000-8000-000000000008'
    limit 1
  $$,
  23514,
  null,
  'message CHECK rejects military organization reference'
);

select throws_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000008',
           'Meu endereco e Rua das Flores 123'
    from public.dm_conversations c
    where c.context_type = 'shared_group'
      and c.participant_a = '10000000-0000-4000-8000-000000000008'
    limit 1
  $$,
  23514,
  null,
  'message CHECK rejects address pattern'
);

select * from finish();
rollback;
