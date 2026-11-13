-- Bivaque · Inventário de autorização (2026-11-13)
-- Leitura de catálogo SOMENTE: não consulta linhas de usuários.
-- Uso: executar no banco LOCAL descartável para comparar com docs/security/
--       refatoracao-autorizacao-auditoria-20261113.md
-- Não é teste de penetração nem substitui pgTAP com personas negativas.
-- Resultados esperados no Supabase conectado em 2026-11-13:
-- 68 tabelas public/private, 136 políticas, 0 public sem RLS.

begin transaction read only;

-- 1) Cobertura da camada RLS: métricas de base
with t as (
  select n.nspname as schema_name, c.relname as table_name,
         c.relrowsecurity as rls, c.relforcerowsecurity as force_rls
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and n.nspname in ('public', 'private')
), p as (
  select schemaname, tablename, permissive
  from pg_catalog.pg_policies
  where schemaname in ('public', 'private')
)
select (select count(*) from t) as tables_in_scope,
       (select count(*) from t where schema_name = 'public' and not rls) as public_without_rls,
       (select count(*) from t where schema_name = 'public' and not force_rls) as public_without_force_rls,
       (select count(*) from p) as policy_count,
       (select count(*) from p where permissive = 'PERMISSIVE') as permissive_policies,
       (select count(distinct schemaname || '.' || tablename) from p) as tables_with_policies;

-- 2) Todas as políticas de escrita do núcleo social.
-- Conferir se há veto efetivo de suspensão e exclusão de conta, e se
-- WHERE/USING e WITH CHECK protegem as transições sensíveis.
select schemaname, tablename, policyname, cmd, roles, permissive, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('posts', 'comments', 'post_reactions', 'groups', 'group_memberships')
  and cmd in ('INSERT', 'UPDATE', 'DELETE')
order by tablename, cmd, policyname;

-- 3) Acesso efetivo ao nível de colunas, não somente visibilidade do frontend.
select 'groups.owner_user_id' as target,
       pg_catalog.has_column_privilege(
         'authenticated', 'public.groups', 'owner_user_id', 'UPDATE'
       ) as authenticated_can_update
union all
select 'groups.locality_id',
       pg_catalog.has_column_privilege(
         'authenticated', 'public.groups', 'locality_id', 'UPDATE'
       )
union all
select 'groups.created_by',
       pg_catalog.has_column_privilege(
         'authenticated', 'public.groups', 'created_by', 'UPDATE'
       )
union all
select 'group_memberships.role',
       pg_catalog.has_column_privilege(
         'authenticated', 'public.group_memberships', 'role', 'UPDATE'
       )
union all
select 'group_memberships.user_id',
       pg_catalog.has_column_privilege(
         'authenticated', 'public.group_memberships', 'user_id', 'UPDATE'
       );

-- 4) Triggers e constraints dos objetos de escopo sensível.
select n.nspname as schema_name, c.relname as table_name,
       t.tgname as trigger_name, pg_catalog.pg_get_triggerdef(t.oid) as definition
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('posts', 'comments', 'groups', 'group_memberships')
  and not t.tgisinternal
order by c.relname, t.tgname;

-- 5) Múltiplas permissive policies por operação: candidato a
-- inconsistência por OR, NÃO vulnerabilidade automática.
select schemaname, tablename, cmd, count(*) as policy_count,
       string_agg(policyname, ', ' order by policyname) as policy_names
from pg_catalog.pg_policies
where schemaname in ('public','storage')
  and permissive = 'PERMISSIVE'
group by schemaname, tablename, cmd
having count(*) > 1
order by policy_count desc, schemaname, tablename, cmd;

-- 6) RPCs SECURITY DEFINER em schema público invocáveis por anon.
-- Alguns usos podem ser deliberados; revisar autenticação no CORPO.
select p.oid::regprocedure::text as function_name,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_executable,
       p.prosecdef as security_definer
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
order by function_name;

commit;
