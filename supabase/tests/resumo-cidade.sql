begin;
create extension if not exists pgtap with schema extensions;
select plan(27);
\ir fixtures/foundation.inc

select is((select city_digest_frequency::text from public.notification_preferences where user_id = '10000000-0000-4000-8000-000000000001'), null, 'sem preferência não é opt-in');
insert into public.notification_preferences(user_id, city_digest_frequency) values
 ('10000000-0000-4000-8000-000000000001', 'daily'),
 ('10000000-0000-4000-8000-000000000002', 'off');
insert into public.recommendation_requests(id, author_id, locality_id, title, body, created_at) values
 ('d0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Pergunta da cidade','Pergunta de teste sintético',now()-interval '1 hour'),
 ('d0000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','Pergunta de fora','Pergunta de teste sintético',now()-interval '1 hour'),
 ('d0000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Pergunta ocultada','Pergunta de teste sintético',now()-interval '1 hour'),
 ('d0000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Minha pergunta antiga','Pergunta de teste sintético',now()-interval '10 days');
insert into public.hidden_questions(user_id, request_id) values ('10000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000003');
insert into public.recommendation_replies(id,request_id,author_id,body,created_at) values
 ('d1000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','Resposta de teste sintética',now()-interval '30 minutes');
insert into public.events(id,organizer_id,locality_id,title,starts_at,status) values
 ('d2000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Encontro da semana',now()+interval '2 days','upcoming');

set local role service_role;
select is(public.enqueue_city_digests(),1,'enfileira um resumo');
select is(public.enqueue_city_digests(),0,'segundo disparo não duplica no período');
reset role;
select is((select count(*)::integer from public.outbox where type='city_digest'),1,'off não recebe');
select is((select jsonb_array_length(payload->'content'->'questions') from public.outbox where type='city_digest'),1,'outra cidade e ocultada não entram');
select is((select payload->'content'->'questions'->0->>'title' from public.outbox where type='city_digest'),'Pergunta da cidade','só pergunta visível');
select is((select jsonb_array_length(payload->'content'->'replies') from public.outbox where type='city_digest'),1,'resposta nova a pergunta antiga entra');
select is((select jsonb_array_length(payload->'content'->'events') from public.outbox where type='city_digest'),1,'encontro dos próximos sete dias entra');
select ok(not exists(select 1 from public.outbox where type='city_digest' and (payload->'content')::text like '%@%'),'conteúdo não expõe e-mail de autoria');
insert into public.profile_suspensions(user_id) values ('10000000-0000-4000-8000-000000000002');
select is((select public.city_digest_for_delivery(id) from public.outbox where type='city_digest'),null,'autoria suspensa não entra na entrega');
delete from public.profile_suspensions where user_id='10000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select throws_ok('select public.enqueue_city_digests()','42501',null,'membro não chama job');
select throws_ok('select public.city_digest_for_delivery(''d0000000-0000-4000-8000-000000000001'')','42501',null,'membro não chama leitura de entrega');
select throws_ok('select public.unsubscribe_city_digest(repeat(''a'',64))','42501',null,'membro não chama descadastro privilegiado');
select is((select count(*)::integer from public.notification_preferences),1,'RLS só lê própria preferência');
select lives_ok($$update public.notification_preferences set city_digest_frequency='weekly' where user_id='10000000-0000-4000-8000-000000000002'$$,'membro grava própria frequência');
reset role;

update public.recommendation_requests set is_deleted=true where id='d0000000-0000-4000-8000-000000000001';
select is((select jsonb_array_length(public.city_digest_for_delivery(id)->'questions') from public.outbox where type='city_digest'),0,'revalida remoção depois da fila');
insert into public.account_deletion_requests(user_id,due_at) values ('10000000-0000-4000-8000-000000000002',now()+interval '15 days');
select is((select public.city_digest_for_delivery(id) from public.outbox where type='city_digest'),null,'autoria indisponível some e resumo vazio não entrega');
select ok(not public.unsubscribe_city_digest(repeat('a',64)),'token inválido não desliga');
update private.city_digest_state set unsubscribe_expires_at=now()-interval '1 second';
select ok(not public.unsubscribe_city_digest((select payload->>'unsubscribe_token' from public.outbox where type='city_digest')),'token expirado não desliga');
update private.city_digest_state set unsubscribe_expires_at=now()+interval '30 days';
select ok(public.unsubscribe_city_digest((select payload->>'unsubscribe_token' from public.outbox where type='city_digest')),'token válido desliga sem sessão');
select is((select city_digest_frequency::text from public.notification_preferences where user_id='10000000-0000-4000-8000-000000000001'),'off','descadastro persistido');
select ok(not public.unsubscribe_city_digest((select payload->>'unsubscribe_token' from public.outbox where type='city_digest')),'token de uso único');
update public.notification_preferences set city_digest_frequency='daily' where user_id='10000000-0000-4000-8000-000000000001';
update private.city_digest_state set last_period_at=now()-interval '8 days';
select is(public.enqueue_city_digests(),0,'sem novidade nada é enviado');
delete from public.account_deletion_requests where user_id='10000000-0000-4000-8000-000000000002';
update public.notification_preferences set city_digest_frequency='weekly' where user_id='10000000-0000-4000-8000-000000000001';
update private.city_digest_state set last_period_at=now()-interval '8 days',last_enqueued_at=null;
select is(public.enqueue_city_digests(),1,'semanal também monta e enfileira');
select is(public.enqueue_city_digests(),0,'semanal não repete no mesmo período');
set local role anon;
select throws_ok('select public.enqueue_city_digests()','42501',null,'anônimo não dispara o job');
select throws_ok('select public.unsubscribe_city_digest(repeat(''a'',64))','42501',null,'anônimo não chama RPC direto');
reset role;
select * from finish();
rollback;
