begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
\ir fixtures/foundation.inc
insert into public.operators(auth_user_id) values('10000000-0000-4000-8000-000000000002');
insert into public.posts(id,user_id,locality_id,post_type,content)
  values('24000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001','text','Conteúdo sintético');
insert into public.reports(id,reporter_user_id,target_type,target_id,reason)
  values('24000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000004',
    'post','24000000-0000-4000-8000-000000000010','Outro: teste sintético');
select throws_ok($$select public.resolve_report('24000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000004','hide','Regra')$$,'42501','forbidden','não operador não decide');
select lives_ok($$select public.resolve_report('24000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000002','hide','Regra')$$,'operador oculta');
select is((select is_deleted from public.posts where id='24000000-0000-4000-8000-000000000010'),true,'conteúdo ocultado');
select is((select count(*)::int from public.operator_actions where action='report_hide'),1,'decisão auditada');
select is((select count(*)::int from public.notifications where type='report_resolved'
  and action='resolved' and recipient_user_id='10000000-0000-4000-8000-000000000004'),1,'denunciante recebe retorno genérico');
select is((select count(*)::int from public.notifications where type='moderation_decision'
  and recipient_user_id='10000000-0000-4000-8000-000000000001' and actor_user_id is null
  and target_id='10000000-0000-4000-8000-000000000001' and target_type='user'),1,'autor avisado sem identidade nem id da denúncia');
select throws_ok($$select public.resolve_report('24000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000002','dismiss','Regra')$$,'P0002','already resolved','decisão não é repetida');
select hasnt_function('public','resolve_report',array['uuid','text','text'],'sobrecarga sem caller removida');
select function_privs_are('public','resolve_report',array['uuid','uuid','text','text'],'authenticated',array[]::text[],'membro não chama RPC privilegiado');
select * from finish();
rollback;
