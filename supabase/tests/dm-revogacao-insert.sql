begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
\ir fixtures/foundation.inc
\ir fixtures/dm.inc

insert into public.dm_conversations (id, participant_a, participant_b, context_type, context_id)
values ('41000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000009', 'shared_group', '40000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$insert into public.dm_messages (conversation_id, sender_id, content) values ('41000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000008', 'direto')$$, '42501', null, 'participante não insere diretamente');
select lives_ok($$select public.send_conversation_message('41000000-0000-4000-8000-000000000091', 'mensagem', 'chave-fixa')$$, 'participante envia pela RPC');
select is(public.send_conversation_message('41000000-0000-4000-8000-000000000091', 'outra tentativa', 'chave-fixa')->>'id', (select id::text from public.dm_messages where client_key = 'chave-fixa'), 'reenvio devolve a mesma linha');
select is((select count(*) from public.dm_messages where client_key = 'chave-fixa'), 1::bigint, 'reenvio não duplica');
reset role;
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'dm_messages' and indexname = 'dm_messages_sender_client_key_unique' and indexdef ilike '%unique%' and indexdef ilike '%(conversation_id, sender_id, client_key)%' and indexdef ilike '%where (client_key is not null)%'), 'índice parcial único protege a corrida');
select throws_ok($$insert into public.dm_messages (conversation_id, sender_id, content, client_key) values ('41000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000008', 'duplicada', 'chave-fixa')$$, '23505', null, 'índice impede duplicata concorrente');
select ok(has_table_privilege('authenticated', 'public.dm_messages', 'select') and not has_table_privilege('authenticated', 'public.dm_messages', 'insert'), 'authenticated mantém somente leitura');
select ok(not has_table_privilege('anon', 'public.dm_messages', 'select') and not has_table_privilege('anon', 'public.dm_messages', 'insert'), 'anon não lê nem insere');
select ok(not has_table_privilege('authenticated', 'public.dm_messages', 'update') and not has_table_privilege('authenticated', 'public.dm_messages', 'delete'), 'authenticated não altera nem apaga mensagens');
select ok(not exists (select 1 from information_schema.column_privileges where table_schema = 'public' and table_name = 'dm_messages' and grantee in ('authenticated', 'anon') and privilege_type in ('INSERT', 'UPDATE')), 'nenhum grant de coluna reabre a escrita');
select * from finish();
rollback;
