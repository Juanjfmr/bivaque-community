begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
\ir fixtures/foundation.inc
reset role;
insert into public.dm_blocks (blocker_user_id, blocked_user_id) values
('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.notifications (recipient_user_id, actor_user_id, type, action, target_type, target_id) values
('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','comment','created','post','90000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','comment','created','post','90000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000001',null,'comment','created','post','90000000-0000-4000-8000-000000000001');
select is((select count(*) from public.notifications where actor_user_id = '10000000-0000-4000-8000-000000000002'),0::bigint,'destinatário bloqueou ator');
select is((select count(*) from public.notifications where actor_user_id = '10000000-0000-4000-8000-000000000001'),0::bigint,'ator bloqueou destinatário');
select is((select count(*) from public.notifications where actor_user_id is null),1::bigint,'aviso de sistema passa');
select ok(not has_function_privilege('anon','private.drop_blocked_notification()','EXECUTE'),'anon não executa');
select ok(not has_function_privilege('authenticated','private.drop_blocked_notification()','EXECUTE'),'authenticated não executa');
insert into public.recommendation_requests (id,author_id,locality_id,title,body,category) values
('70000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Procuro serviço','Alguém indica um serviço confiável para minha família?','servicos_locais');
insert into public.recommendation_replies (id,request_id,author_id,body) values
('80000000-0000-4000-8000-000000000020','70000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000002','Uma indicação de serviço confiável.');
select is((select count(*) from public.outbox where type = 'recommendation_reply' and payload->>'reply_id' = '80000000-0000-4000-8000-000000000020'),0::bigint,'e-mail bloqueado');
delete from public.dm_blocks;
insert into public.recommendation_replies (id,request_id,author_id,body) values
('80000000-0000-4000-8000-000000000021','70000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000002','Outra indicação de serviço confiável.');
select is((select count(*) from public.outbox where type = 'recommendation_reply' and payload->>'reply_id' = '80000000-0000-4000-8000-000000000021'),1::bigint,'e-mail sem bloqueio');
select is((select count(*) from public.notifications where actor_user_id = '10000000-0000-4000-8000-000000000002'),1::bigint,'aviso sem bloqueio');
select * from finish();
rollback;
