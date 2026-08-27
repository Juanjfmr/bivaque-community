-- Default de reporter_user_id (20260825171547).
--
-- O insert do cliente omite reporter_user_id; sem default, todo insert pela
-- interface violava a propria policy de insert (reporter_user_id = auth.uid()
-- nunca bate com NULL) e nenhum membro conseguia denunciar pela UI.

begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

\ir fixtures/foundation.inc

insert into public.posts (
  id, locality_id, user_id, post_type, content
) values (
  'b1000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'text',
  'alvo da suíte de default de reporter'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.reports (target_type, target_id, reason)
    values ('post', 'b1000000-0000-4000-8000-000000000001', 'sem reporter explicito')
  $$,
  'membro insere denuncia sem reporter_user_id'
);

select results_eq(
  $$ select reporter_user_id from public.reports where reason = 'sem reporter explicito' $$,
  array['10000000-0000-4000-8000-000000000002'::uuid],
  'default preenche o reporter com auth.uid()'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    insert into public.reports (target_type, target_id, reason)
    values ('post', 'b1000000-0000-4000-8000-000000000001', 'nao membro tenta')
  $$,
  42501,
  null,
  'nao-membro segue barrado mesmo com o default'
);

select * from finish();
rollback;
