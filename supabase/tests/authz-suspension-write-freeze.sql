-- AUTHZ-001 (R3): suspensão bloqueia TODA escrita em conteúdo próprio.
-- Execução somente em Supabase LOCAL com migrations da main atual.
-- Não usar no projeto remoto: fixtures de exemplo e alterações transacionais.
-- Teste de regressão intencionalmente RED até a correção em nova migration.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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

select * from finish();
rollback;
