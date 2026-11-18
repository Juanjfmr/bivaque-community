-- AUTHZ-001 (R3): suspensão e pedido de exclusão de conta bloqueiam TODA
-- escrita em conteúdo próprio; suspensão vencida volta a liberar.
-- Correção: 20261118030820_authz_write_freeze_and_group_columns.sql.
-- Execução somente em Supabase LOCAL: fixtures de exemplo e rollback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- Três publicações distintas: edição, exclusão e comentários.
insert into public.posts (id, locality_id, user_id, group_id, post_type, content)
values
 ('97000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'text', 'Publicacao para editar'),
 ('97000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'text', 'Publicacao para excluir'),
 ('97000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'text', 'Publicacao com comentarios');

insert into public.comments (id, post_id, user_id, content)
values
 ('97100000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001', 'Comentario para editar'),
 ('97100000-0000-4000-8000-000000000002',
  '97000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001', 'Comentario para excluir');

-- A probe executa como o chamador (security invoker) e desfaz SEMPRE as
-- escritas e seus triggers numa subtransação PL/pgSQL. Sem depender de
-- UPDATE retornar erro vs. zero linhas sob RLS.
-- Resultado: 1 = alterou linha; 0 = RLS ocultou a linha; -1 = SQLSTATE 42501.
-- Qualquer outro erro é propagado: fixture quebrada nunca conta como bloqueio.
create function pg_temp.authz_probe_mutation(p_sql text)
returns integer language plpgsql security invoker set search_path = ''
as $probe$
declare v_rows integer;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    raise exception using errcode = 'ZX001', message = 'rollback authz probe';
  exception
    when sqlstate 'ZX001' then return v_rows;
    when insufficient_privilege then return -1;
  end;
end;
$probe$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Contraste positivo: ações válidas devem permanecer funcionando.
select is(pg_temp.authz_probe_mutation($q$
  update public.posts set content = 'Edicao autorizada'
  where id = '97000000-0000-4000-8000-000000000001'
$q$), 1, 'ativo edita propria publicacao');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.posts where id = '97000000-0000-4000-8000-000000000002'
$q$), 1, 'ativo exclui propria publicacao');
select is(pg_temp.authz_probe_mutation($q$
  update public.comments set content = 'Edicao autorizada'
  where id = '97100000-0000-4000-8000-000000000001'
$q$), 1, 'ativo edita proprio comentario');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.comments where id = '97100000-0000-4000-8000-000000000002'
$q$), 1, 'ativo exclui proprio comentario');

reset role;
-- Fixture de suspensão: nenhum outro estado de acesso muda.
insert into public.profile_suspensions (user_id)
values ('10000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Contrato: suspensão = leitura preservada, escrita congelada.
select is((
  select count(*)::integer from public.posts
  where id = '97000000-0000-4000-8000-000000000001'
), 1, 'suspenso continua lendo propria publicacao');

select is((
  select count(*)::integer from public.comments
  where id = '97100000-0000-4000-8000-000000000001'
), 1, 'suspenso continua lendo proprio comentario');

select ok(pg_temp.authz_probe_mutation($q$
  update public.posts set content = 'Edicao indevida'
  where id = '97000000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao edita propria publicacao');

select ok(pg_temp.authz_probe_mutation($q$
  delete from public.posts where id = '97000000-0000-4000-8000-000000000002'
$q$) <= 0, 'suspenso nao exclui propria publicacao');

select ok(pg_temp.authz_probe_mutation($q$
  update public.comments set content = 'Edicao indevida'
  where id = '97100000-0000-4000-8000-000000000001'
$q$) <= 0, 'suspenso nao edita proprio comentario');

select ok(pg_temp.authz_probe_mutation($q$
  delete from public.comments where id = '97100000-0000-4000-8000-000000000002'
$q$) <= 0, 'suspenso nao exclui proprio comentario');

-- Suspensão vencida não congela: is_account_suspended ignora expires_at passado.
reset role;
update public.profile_suspensions
set expires_at = now() - interval '1 minute'
where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(pg_temp.authz_probe_mutation($q$
  update public.posts set content = 'Edicao apos suspensao vencida'
  where id = '97000000-0000-4000-8000-000000000001'
$q$), 1, 'suspensao vencida volta a permitir editar propria publicacao');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.posts where id = '97000000-0000-4000-8000-000000000002'
$q$), 1, 'suspensao vencida volta a permitir excluir propria publicacao');
select is(pg_temp.authz_probe_mutation($q$
  update public.comments set content = 'Edicao apos suspensao vencida'
  where id = '97100000-0000-4000-8000-000000000001'
$q$), 1, 'suspensao vencida volta a permitir editar proprio comentario');
select is(pg_temp.authz_probe_mutation($q$
  delete from public.comments where id = '97100000-0000-4000-8000-000000000002'
$q$), 1, 'suspensao vencida volta a permitir excluir proprio comentario');

-- Pedido de exclusão de conta também congela edição e exclusão.
reset role;
delete from public.profile_suspensions
where user_id = '10000000-0000-4000-8000-000000000001';
insert into public.account_deletion_requests (user_id, due_at)
values ('10000000-0000-4000-8000-000000000001', now() + interval '30 days');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- A leitura continua: a recusa vem da policy de escrita, não de perder o SELECT.
select is((
  select count(*)::integer from public.posts
  where id = '97000000-0000-4000-8000-000000000001'
), 1, 'com exclusao pedida continua lendo propria publicacao');

select ok(pg_temp.authz_probe_mutation($q$
  update public.posts set content = 'Edicao com exclusao pedida'
  where id = '97000000-0000-4000-8000-000000000001'
$q$) <= 0, 'pedido de exclusao impede editar propria publicacao');

select ok(pg_temp.authz_probe_mutation($q$
  delete from public.posts where id = '97000000-0000-4000-8000-000000000002'
$q$) <= 0, 'pedido de exclusao impede excluir propria publicacao');

select ok(pg_temp.authz_probe_mutation($q$
  update public.comments set content = 'Edicao com exclusao pedida'
  where id = '97100000-0000-4000-8000-000000000001'
$q$) <= 0, 'pedido de exclusao impede editar proprio comentario');

select ok(pg_temp.authz_probe_mutation($q$
  delete from public.comments where id = '97100000-0000-4000-8000-000000000002'
$q$) <= 0, 'pedido de exclusao impede excluir proprio comentario');

-- Cancelar o pedido devolve a escrita.
reset role;
delete from public.account_deletion_requests
where user_id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(pg_temp.authz_probe_mutation($q$
  update public.posts set content = 'Edicao apos cancelar exclusao'
  where id = '97000000-0000-4000-8000-000000000001'
$q$), 1, 'cancelar pedido de exclusao devolve a edicao');

select * from finish();
rollback;
