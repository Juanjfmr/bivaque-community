-- A marca de grupo padrão (20261107093000) também é escrita pelo papel de serviço,
-- no mesmo padrão de `is_deleted` (20260802001600_reports.sql): só a coluna,
-- nunca a tabela inteira. Membro continua sem alcançar a marca.
grant update (is_default) on table public.groups to service_role;

-- O papel de serviço confere a participação criada pela entrada automática
-- (mesmo padrão de `grant select on table public.groups to service_role`, 20260821000016).
grant select on table public.group_memberships to service_role;
