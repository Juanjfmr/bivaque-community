begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

\ir fixtures/foundation.inc
\ir fixtures/trust.inc
\ir fixtures/authz.inc
\ir fixtures/dm.inc

-- ── no shared context: cannot create conversation ────────────────────────────
-- 009 and 010 share no group, event, recommendation, or family link.

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.dm_conversations (
      participant_a, participant_b, context_type, context_id
    )
    values (
      '10000000-0000-4000-8000-000000000009',
      '10000000-0000-4000-8000-000000000010',
      'shared_group',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'no-context pair cannot create conversation — can_dm_between returns false'
);

-- Positive identity: 008 CAN create conversation with 009 (they share context)
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
  'same user CAN create conversation with user they share context with'
);

-- Save the conversation ID for later non-participant tests.
reset role;
select c.id as dm_conv_id
from public.dm_conversations c
where c.participant_a = '10000000-0000-4000-8000-000000000008'
  and c.participant_b = '10000000-0000-4000-8000-000000000009'
\gset

-- ── blocked pair: cannot create conversation ─────────────────────────────────
-- 008 blocked 010 (from dm.inc). 010 cannot start conversation with 008.

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000010',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.dm_conversations (
      participant_a, participant_b, context_type, context_id
    )
    values (
      '10000000-0000-4000-8000-000000000008',
      '10000000-0000-4000-8000-000000000010',
      'shared_group',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'blocked user cannot create conversation with blocker'
);

-- Also: 008 (blocker) cannot create conversation with 010 (blocked) — block is mutual
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.dm_conversations (
      participant_a, participant_b, context_type, context_id
    )
    values (
      '10000000-0000-4000-8000-000000000008',
      '10000000-0000-4000-8000-000000000010',
      'shared_group',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'blocker also cannot create conversation with blocked user — block is mutual'
);

-- Positive identity: 008 and 009 share context (not blocked) — verified via helper.
select is(
  private.can_dm_between(
    '10000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000009'
  ),
  true,
  'blocker CAN create conversation with non-blocked user they share context with'
);

-- ── third user cannot read others' conversations ─────────────────────────────
-- Use the existing conversation created in test 2 (008 ↔ 009, shared_group).

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Send a message in the existing conversation
insert into public.dm_messages (conversation_id, sender_id, content)
select c.id,
       '10000000-0000-4000-8000-000000000008',
       'Mensagem privada'
from public.dm_conversations c
where c.participant_a = '10000000-0000-4000-8000-000000000008'
  and c.participant_b = '10000000-0000-4000-8000-000000000009'
limit 1;

-- Save message ID for non-participant tests.
reset role;
select m.id as dm_msg_id
from public.dm_messages m
join public.dm_conversations c on c.id = m.conversation_id
where c.participant_a = '10000000-0000-4000-8000-000000000008'
  and c.participant_b = '10000000-0000-4000-8000-000000000009'
  and m.sender_id = '10000000-0000-4000-8000-000000000008'
limit 1
\gset

-- Now switch to third-party user 010 (same locality, not a participant)
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000010',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.dm_conversations',
  'third user (same locality, not a participant) sees no conversations'
);

select is_empty(
  'select 1 from public.dm_messages',
  'third user sees no messages from conversations they are not in'
);

-- Positive identity: 008 CAN see their own conversations
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  'select count(*) > 0 from public.dm_conversations',
  array[true],
  'participant sees their conversations — positive identity check'
);

-- ── non-participant cannot insert a message ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000010',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  format(
    'insert into public.dm_messages (conversation_id, sender_id, content)
     values (%L, %L, %L)',
    :'dm_conv_id',
    '10000000-0000-4000-8000-000000000010',
    'Mensagem intrusa'
  ),
  42501,
  null,
  'non-participant cannot insert message into conversation'
);

-- Positive identity: 009 CAN insert into the same conversation
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000009',
           'Resposta legitima'
    from public.dm_conversations c
    where c.participant_a = '10000000-0000-4000-8000-000000000008'
      and c.participant_b = '10000000-0000-4000-8000-000000000009'
    limit 1
  $$,
  'participant CAN insert message — positive identity check'
);

-- ── non-participant cannot report a message ──────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000010',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  format(
    'insert into public.dm_reports (message_id, reporter_user_id, reason)
     values (%L, %L, %L)',
    :'dm_msg_id',
    '10000000-0000-4000-8000-000000000010',
    'Relatando mensagem de outra conversa'
  ),
  42501,
  null,
  'non-participant cannot report a message from another conversation'
);

-- Positive identity: 008 CAN report a message in their own conversation
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
           'Reporte legitimo de conteudo proprio'
    from public.dm_messages m
    join public.dm_conversations c
      on c.id = m.conversation_id
    where c.participant_a = '10000000-0000-4000-8000-000000000008'
      and c.participant_b = '10000000-0000-4000-8000-000000000009'
    limit 1
  $$,
  'participant CAN report message in own conversation — positive identity check'
);

-- ── nonmember denial ─────────────────────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000005',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  'select 1 from public.dm_conversations',
  'nonmember sees no conversations'
);

select is_empty(
  'select 1 from public.dm_messages',
  'nonmember sees no messages'
);

select throws_ok(
  $$
    insert into public.dm_conversations (
      participant_a, participant_b, context_type, context_id
    )
    values (
      '10000000-0000-4000-8000-000000000005',
      '10000000-0000-4000-8000-000000000008',
      'shared_group',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  42501,
  null,
  'nonmember cannot create conversation — can_dm_between returns false'
);

-- ── duplicate conversation denial ────────────────────────────────────────────
-- The unique constraint on (participant_a, participant_b) prevents duplicate
-- conversations between the same pair.

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- 008 ↔ 009 already have a conversation via shared_group context
select throws_ok(
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
  23505,
  null,
  'cannot create duplicate conversation between same pair'
);

-- ── participant ordering enforcement ─────────────────────────────────────────

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.dm_conversations (
      participant_a, participant_b, context_type, context_id
    )
    values (
      '10000000-0000-4000-8000-000000000009',
      '10000000-0000-4000-8000-000000000008',
      'shared_group',
      '40000000-0000-4000-8000-000000000001'
    )
  $$,
  23514,
  null,
  'CHECK constraint enforces participant_a < participant_b ordering'
);

-- ── block prevents sending in an existing conversation ───────────────────────
-- Have 009 block 008, then verify 008 cannot send.

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.dm_blocks (blocker_user_id, blocked_user_id)
values (
  '10000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000008'
);

-- Now 008 (blocked) tries to send a message
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000008',
           'Mensagem apos bloqueio'
    from public.dm_conversations c
    where c.participant_a = '10000000-0000-4000-8000-000000000008'
      and c.participant_b = '10000000-0000-4000-8000-000000000009'
    limit 1
  $$,
  42501,
  null,
  'blocked user cannot send message in existing conversation'
);

-- Positive identity: 009 (blocker) can still send
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000009',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    select c.id,
           '10000000-0000-4000-8000-000000000009',
           'Mensagem do bloqueador'
    from public.dm_conversations c
    where c.participant_a = '10000000-0000-4000-8000-000000000008'
      and c.participant_b = '10000000-0000-4000-8000-000000000009'
    limit 1
  $$,
  'blocker can still send in existing conversation — positive identity check'
);

select * from finish();
rollback;
