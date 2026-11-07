begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
\ir fixtures/foundation.inc
insert into public.operators(auth_user_id) values('10000000-0000-4000-8000-000000000002');
select throws_ok($$select public.operator_suspend_account('10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004','Regra',7)$$,'42501','forbidden','não operador não suspende');
select lives_ok($$select public.operator_suspend_account('10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002','Regra',7)$$,'operador suspende');
select is((select expires_at from public.profile_suspensions where user_id='10000000-0000-4000-8000-000000000001'),
  now()+interval '7 days','prazo persistido');
select is((select count(*)::int from public.operator_actions where action='suspension_applied'),1,'aplicação auditada');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is(public.is_account_suspended(auth.uid()),true,'helper aciona veto existente');
select throws_ok($$insert into public.posts(user_id,locality_id,content)
  values(auth.uid(),'00000000-0000-4000-8000-000000000001','Não pode publicar')$$,
  '42501',null,'suspenso não publica no app');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
select is((select count(*)::int from public.profile_suspensions),0,'terceiro não lê suspensão');
select throws_ok($$select public.operator_end_suspension('10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004','Recurso')$$,null,null,'membro não encerra');
reset role;
select throws_ok($$select public.operator_end_suspension('10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004','Recurso')$$,'42501','forbidden','caller não operador também é recusado pelo RPC');
select lives_ok($$select public.operator_end_suspension('10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002','Recurso aceito')$$,'operador encerra');
select is((select count(*)::int from public.operator_actions where action='suspension_ended'),1,'encerramento auditado');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is(public.is_account_suspended(auth.uid()),false,'escrita liberada');
select lives_ok($$insert into public.posts(user_id,locality_id,content)
  values(auth.uid(),'00000000-0000-4000-8000-000000000001','Pode publicar novamente')$$,'publica após encerramento');
reset role;
insert into public.profile_suspensions(user_id,expires_at)
  values('10000000-0000-4000-8000-000000000001',now()-interval '1 second');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is(public.is_account_suspended(auth.uid()),false,'prazo vencido libera sem depender de job');
reset role;
select function_privs_are('public','operator_suspend_account',array['uuid','uuid','text','integer'],'authenticated',array[]::text[],'membro não suspende por RPC');
select * from finish();
rollback;
