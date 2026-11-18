begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
\ir fixtures/foundation.inc
\ir fixtures/dm.inc

insert into public.dm_conversations (id, participant_a, participant_b, context_type, context_id) values
('41000000-0000-4000-8000-000000000081', '10000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000009', 'shared_group', '40000000-0000-4000-8000-000000000001'),
('41000000-0000-4000-8000-000000000082', '10000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000010', 'shared_group', '40000000-0000-4000-8000-000000000001');
insert into public.dm_messages (conversation_id, sender_id, content, created_at) values
('41000000-0000-4000-8000-000000000081', '10000000-0000-4000-8000-000000000008', 'Mensagem própria', now() - interval '2 minutes'),
('41000000-0000-4000-8000-000000000082', '10000000-0000-4000-8000-000000000009', 'Mensagem alheia', now() - interval '2 minutes');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000008","role":"authenticated"}', true);
select is(public.unread_conversation_count(), 0, 'mensagem própria e conversa alheia não contam');
reset role;
insert into public.dm_messages (conversation_id, sender_id, content, created_at) values
('41000000-0000-4000-8000-000000000081', '10000000-0000-4000-8000-000000000009', 'Mensagem recebida', now() - interval '1 minute');
set local role authenticated;
select is(public.unread_conversation_count(), 1, 'mensagem recebida conta uma conversa');
select lives_ok($$select public.mark_conversation_read('41000000-0000-4000-8000-000000000081')$$, 'participante marca leitura');
select is(public.unread_conversation_count(), 0, 'leitura zera contagem');
reset role;
insert into public.dm_messages (conversation_id, sender_id, content, created_at) values
('41000000-0000-4000-8000-000000000081', '10000000-0000-4000-8000-000000000009', 'Nova mensagem', now() + interval '1 second');
set local role authenticated;
select is(public.unread_conversation_count(), 1, 'mensagem nova volta a contar');
select throws_ok($$select public.mark_conversation_read('41000000-0000-4000-8000-000000000082')$$, '42501', 'not a participant', 'terceiro não marca conversa');
reset role;
select ok(not has_function_privilege('anon', 'public.unread_conversation_count()', 'execute') and not has_function_privilege('anon', 'public.mark_conversation_read(uuid,timestamp with time zone)', 'execute'), 'anon não executa as funções');
select * from finish();
rollback;
