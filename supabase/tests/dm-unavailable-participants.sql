begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\ir fixtures/foundation.inc
\ir fixtures/dm.inc

-- Conversa entre 008 (remetente) e 009 (destinatário), com contexto de grupo.
insert into public.dm_conversations (
  id, participant_a, participant_b, context_type, context_id
)
values (
  'd0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000009',
  'shared_group',
  '40000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000008',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.dm_messages (conversation_id, sender_id, content)
    values (
      'd0000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000008',
      'Oi, tudo bem?'
    )
  $$,
  'conta disponível envia mensagem'
);

-- Remetente suspenso.
reset role;
insert into public.profile_suspensions (user_id)
values ('10000000-0000-4000-8000-000000000008');

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
    values (
      'd0000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000008',
      'Mensagem de conta suspensa.'
    )
  $$,
  '42501',
  'conversation participant unavailable',
  'remetente suspenso não envia'
);

-- Destinatário suspenso.
reset role;
delete from public.profile_suspensions
 where user_id = '10000000-0000-4000-8000-000000000008';
insert into public.profile_suspensions (user_id)
values ('10000000-0000-4000-8000-000000000009');

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
    values (
      'd0000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000008',
      'Mensagem para conta suspensa.'
    )
  $$,
  '42501',
  'conversation participant unavailable',
  'destinatário suspenso não recebe'
);

-- Remetente com exclusão pedida.
reset role;
delete from public.profile_suspensions
 where user_id = '10000000-0000-4000-8000-000000000009';
insert into public.account_deletion_requests (user_id, due_at)
values (
  '10000000-0000-4000-8000-000000000008',
  now() + interval '15 days'
);

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
    values (
      'd0000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000008',
      'Mensagem de conta em exclusão.'
    )
  $$,
  '42501',
  'conversation participant unavailable',
  'remetente com exclusão pedida não envia'
);

-- Destinatário com exclusão pedida.
reset role;
delete from public.account_deletion_requests
 where user_id = '10000000-0000-4000-8000-000000000008';
insert into public.account_deletion_requests (user_id, due_at)
values (
  '10000000-0000-4000-8000-000000000009',
  now() + interval '15 days'
);

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
    values (
      'd0000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000008',
      'Mensagem para conta em exclusão.'
    )
  $$,
  '42501',
  'conversation participant unavailable',
  'destinatário com exclusão pedida não recebe'
);

select * from finish();
rollback;
