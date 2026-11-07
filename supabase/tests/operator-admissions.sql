begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
\ir fixtures/foundation.inc

insert into public.operators(auth_user_id)
  values ('10000000-0000-4000-8000-000000000002');
insert into private.verification_documents(id,user_id,storage_object_path,mime_type,expires_at)
  values ('24000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000005','synthetic/document.pdf','application/pdf',now()+interval '7 days');
select throws_ok($$select public.read_operator_verification_document(
  '24000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001')$$,
  '42501','forbidden','não operador não abre documento');
select is((select count(*)::int from public.read_operator_verification_document(
  '24000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')),
  1,'operador abre pendente');
select throws_ok($$select public.decide_verification_document(
  '24000000-0000-4000-8000-000000000001','approved','','10000000-0000-4000-8000-000000000001')$$,
  null,null,'não operador não decide');
select lives_ok($$select public.decide_verification_document(
  '24000000-0000-4000-8000-000000000001','approved','','10000000-0000-4000-8000-000000000002')$$,
  'aprovação sem cidade funciona');
select is((select count(*)::int from public.operator_actions where action='document_approved'),1,'decisão auditada');
select is((select count(*)::int from public.notifications where type='verification_decision'
  and recipient_user_id='10000000-0000-4000-8000-000000000005' and actor_user_id is null),1,'aviso privado ao membro');
select is((select count(*)::int from private.verification_document_removals where storage_object_path='synthetic/document.pdf'),1,'descarte enfileirado atomicamente');
select is((select count(*)::int from public.read_operator_verification_document(
  '24000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')),0,'decidido não abre');
select lives_ok($$select public.complete_verification_document_removal('synthetic/document.pdf')$$,'confirma descarte');
select is((select purge_state from private.verification_documents where id='24000000-0000-4000-8000-000000000001'),'purged','purged só após remoção');
select throws_ok($$select public.prepare_operator_document_removals('10000000-0000-4000-8000-000000000001')$$,
  '42501','forbidden','não operador não executa descarte');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.operator_actions'::regclass),'auditoria força RLS');
select table_privs_are('public','operator_actions','authenticated',array['SELECT'],'autenticado não escreve auditoria');
select table_privs_are('public','operator_actions','service_role',array['SELECT','INSERT'],'servidor só lê e acrescenta auditoria');
set local role service_role;
select throws_ok($$delete from public.operator_actions
  where target_id='24000000-0000-4000-8000-000000000001'$$,
  '42501',null,'servidor não apaga nem auditoria sintética');
reset role;
select function_privs_are('public','prepare_verification_document_removals',array[]::text[],'authenticated',array[]::text[],'membro não executa job');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.operator_actions),0,'membro não lê auditoria');
select throws_ok($$insert into public.operator_actions(actor_id,action,target_type,target_id)
  values (auth.uid(),'forged','user',auth.uid())$$,null,null,'membro não forja registro');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.operator_actions),2,'operador lê abertura e decisão');
reset role;
select * from finish();
rollback;
