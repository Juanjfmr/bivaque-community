-- AUTHZ-002 (R3): grupo não admite mudança direta de proprietário,
-- criador, localidade ou papéis. Validar no Supabase LOCAL após todas as
-- migrations; não confundir main com banco remoto desatualizado.
-- O grupo-base de 24/10 já fecha UPDATE de membership/moderador; teste
-- conserva essa garantia e destaca o grant excessivo de owner/locality/creator.
-- Correção: 20261118030820_authz_write_freeze_and_group_columns.sql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

\ir fixtures/foundation.inc
\ir fixtures/groups.inc

-- Membro 002 vira moderador por setup privilegiado (somente fixture).
update public.group_memberships set role = 'moderator'
where group_id = '40000000-0000-4000-8000-000000000001'
  and user_id = '10000000-0000-4000-8000-000000000002';

-- Subtransação de teste: sempre reverte a escrita de prova, inclusive triggers.
-- 1 = escreveu; 0 = RLS bloqueou a linha; -1 = grant/policy negou 42501.
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

-- Contratos estruturais que a migration group_base já deveria garantir.
select is(
  has_column_privilege('authenticated','public.group_memberships','role','UPDATE'),
  false,
  'role de membership nao e mutavel via Data API'
);
select is(
  has_column_privilege('authenticated','public.group_memberships','user_id','UPDATE'),
  false,
  'user_id de membership nao e mutavel via Data API'
);

-- AUTHZ-002: titularidade, autoria, localidade e exclusão fora do grant.
select is(
  has_column_privilege('authenticated','public.groups','owner_user_id','UPDATE'),
  false, 'owner_user_id de groups nao e mutavel via Data API'
);
select is(
  has_column_privilege('authenticated','public.groups','created_by','UPDATE'),
  false, 'created_by de groups nao e mutavel via Data API'
);
select is(
  has_column_privilege('authenticated','public.groups','locality_id','UPDATE'),
  false, 'locality_id de groups nao e mutavel via Data API'
);
select is(
  has_column_privilege('authenticated','public.groups','community_id','UPDATE'),
  false, 'community_id legado de groups nao e mutavel via Data API'
);
select ok(
  has_column_privilege('authenticated','public.groups','name','UPDATE')
  and has_column_privilege('authenticated','public.groups','description','UPDATE')
  and has_column_privilege('authenticated','public.groups','visibility','UPDATE')
  and has_column_privilege('authenticated','public.groups','rules','UPDATE')
  and has_column_privilege('authenticated','public.groups','pinned_post_id','UPDATE'),
  'colunas editaveis pelas telas continuam no grant'
);
select is(
  has_column_privilege('authenticated','public.groups','is_deleted','UPDATE'),
  false, 'is_deleted de groups so muda pela RPC delete_group'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select ok(pg_temp.authz_probe_mutation($q$
  update public.groups set name = 'Alteracao por moderador'
  where id = '40000000-0000-4000-8000-000000000001'
$q$) <= 0, 'moderador nao administra grupo por UPDATE direto');

select ok(pg_temp.authz_probe_mutation($q$
  update public.group_memberships set role = 'owner'
  where group_id = '40000000-0000-4000-8000-000000000001'
    and user_id = '10000000-0000-4000-8000-000000000002'
$q$) <= 0, 'moderador nao promove a si proprio por UPDATE direto');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Caminho positivo: dono pode alterar campos ordinários.
select is(pg_temp.authz_probe_mutation($q$
  update public.groups set name = 'Novo nome autorizado'
  where id = '40000000-0000-4000-8000-000000000001'
$q$), 1, 'dono pode editar nome do grupo');

-- Caminhos negativos: titularidade e identidade são transições por RPC
-- autorizada, nunca por UPDATE arbitrário da Data API.
select is(pg_temp.authz_probe_mutation($q$
  update public.groups
  set owner_user_id = '10000000-0000-4000-8000-000000000002'
  where id = '40000000-0000-4000-8000-000000000001'
$q$), -1, 'dono nao pode trocar owner_user_id diretamente (42501 de coluna)');

select is(pg_temp.authz_probe_mutation($q$
  update public.groups
  set created_by = '10000000-0000-4000-8000-000000000002'
  where id = '40000000-0000-4000-8000-000000000001'
$q$), -1, 'dono nao pode alterar autoria do grupo (42501 de coluna)');

select is(pg_temp.authz_probe_mutation($q$
  update public.groups
  set locality_id = '00000000-0000-4000-8000-000000000002'
  where id = '40000000-0000-4000-8000-000000000001'
$q$), -1, 'dono nao pode mover grupo de localidade por UPDATE direto (42501 de coluna)');

select ok(pg_temp.authz_probe_mutation($q$
  update public.group_memberships set role = 'moderator'
  where group_id = '40000000-0000-4000-8000-000000000001'
    and user_id = '10000000-0000-4000-8000-000000000001'
$q$) <= 0, 'dono usa RPC para mudar papéis, nao UPDATE direto');

select * from finish();
rollback;
